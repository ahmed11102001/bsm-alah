import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { sendWhatsAppMessage }       from "@/lib/whatsapp-api";
import { decryptToken }              from "@/lib/crypto";
import { normalizePhone }            from "@/lib/phone";

// ── GET /api/admin/lead-bot — جلب الإعدادات الحالية ──────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const config = await prisma.leadBotConfig.findUnique({
    where: { ownerId: session.user.id },
  });

  return NextResponse.json({ config: config ?? null });
}

// ── POST /api/admin/lead-bot — حفظ الإعدادات أو إرسال فوري ───────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── حفظ الإعدادات (تفعيل/إيقاف + اختيار القالب) ─────────────────────────
  if (action === "save") {
    const { templateId, templateName, templateLang, isActive } = body;

    const config = await prisma.leadBotConfig.upsert({
      where:  { ownerId: session.user.id },
      create: {
        ownerId:      session.user.id,
        templateId:   templateId   ?? null,
        templateName: templateName ?? null,
        templateLang: templateLang ?? "ar",
        isActive:     isActive     ?? false,
      },
      update: {
        templateId:   templateId   ?? null,
        templateName: templateName ?? null,
        templateLang: templateLang ?? "ar",
        isActive:     isActive     ?? false,
      },
    });

    // لو تفعّل البوت: ابدأ إرسال فوري لكل الـ leads اللي لسه ما اتبعتلهاش
    if (isActive && templateName) {
      // اعمل ذلك بشكل async في الخلفية
      sendToAllPendingLeads(session.user.id, config.id, templateName, templateLang ?? "ar")
        .catch(err => console.error("[lead-bot] background send error:", err));
    }

    return NextResponse.json({ ok: true, config });
  }

  // ── إرسال يدوي فوري لكل الـ leads ────────────────────────────────────────
  if (action === "send_now") {
    const config = await prisma.leadBotConfig.findUnique({
      where: { ownerId: session.user.id },
    });
    if (!config?.templateName)
      return NextResponse.json({ error: "اختر قالب أولاً" }, { status: 400 });

    const { sent, failed } = await sendToAllPendingLeads(
      session.user.id,
      config.id,
      config.templateName,
      config.templateLang,
    );

    return NextResponse.json({ ok: true, sent, failed });
  }

  return NextResponse.json({ error: "action غير معروف" }, { status: 400 });
}

// ── Helper: إرسال لكل الـ leads اللي لسه ما اتبعتلهاش ───────────────────────
async function sendToAllPendingLeads(
  userId: string,
  configId: string,
  templateName: string,
  templateLang: string,
): Promise<{ sent: number; failed: number }> {
  // جلب WhatsApp account
  const wa = await prisma.whatsAppAccount.findUnique({ where: { userId } });
  if (!wa?.accessToken || !wa?.phoneNumberId)
    return { sent: 0, failed: 0 };

  const accessToken   = decryptToken(wa.accessToken);
  const phoneNumberId = wa.phoneNumberId;

  // جلب الـ config لمعرفة lastSentLeadId
  const config = await prisma.leadBotConfig.findUnique({ where: { id: configId } });

  // جلب الـ leads: إما كلها أو بعد آخر lead متبعت
  const leadsQuery: any = {
    orderBy: { createdAt: "asc" },
    take: 200, // حد أقصى في كل run
  };

  if (config?.lastSentLeadId) {
    // جيب الـ lead ده عشان نعرف createdAt بتاعه
    const lastLead = await prisma.lead.findUnique({
      where: { id: config.lastSentLeadId },
      select: { createdAt: true },
    });
    if (lastLead) {
      leadsQuery.where = { createdAt: { gt: lastLead.createdAt } };
    }
  }

  const leads = await prisma.lead.findMany(leadsQuery);
  if (leads.length === 0) return { sent: 0, failed: 0 };

  let sent   = 0;
  let failed = 0;
  let lastSuccessLeadId: string | null = null;

  for (const lead of leads) {
    const normalizedPhone = normalizePhone(lead.phone);
    if (!normalizedPhone) { failed++; continue; }

    const result = await sendWhatsAppMessage({
      toPhone:       normalizedPhone,
      phoneNumberId,
      accessToken,
      messageType:   "template",
      templateName,
      templateLang,
      templateVars:  { body: [lead.name, lead.business] }, // {{1}} الاسم، {{2}} النشاط
      content:       null,
    });

    if (result.ok) {
      sent++;
      lastSuccessLeadId = lead.id;
      // لو status لسه NEW، حدّثه لـ CONTACTED
      await prisma.lead.update({
        where: { id: lead.id },
        data:  { status: "CONTACTED" },
      }).catch(() => {});
    } else {
      failed++;
      // لو rate limit وقفنا
      if (result.isRateLimit) break;
    }

    // delay بسيط بين الرسائل
    await new Promise(r => setTimeout(r, 350));
  }

  // حدّث config
  await prisma.leadBotConfig.update({
    where: { id: configId },
    data:  {
      sentCount:       { increment: sent },
      ...(lastSuccessLeadId ? { lastSentLeadId: lastSuccessLeadId } : {}),
    },
  });

  return { sent, failed };
}
