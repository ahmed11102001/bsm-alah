import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { decryptToken } from "@/lib/crypto";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";

// ── POST /api/developers/projects/[id]/otp-templates/sync ────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const project = await getProjectForOwnerOrDeveloper(id, session.id);
    if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

    const connection = await prisma.developerMetaConnection.findUnique({
      where: { projectId: id },
    });

    if (!connection?.isVerified || !connection.accessToken || !connection.wabaId) {
      return NextResponse.json(
        { error: "ربط Meta مطلوب — ادخل على نظرة عامة واربط Meta الأول" },
        { status: 400 }
      );
    }

    // فك تشفير الـ accessToken قبل الاستخدام مع Meta API
    const plainAccessToken = decryptToken(connection.accessToken);

    // Fetch templates from Meta
    const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${connection.wabaId}/message_templates?limit=100&fields=id,name,status,category,language,rejected_reason`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      return NextResponse.json(
        { error: metaData.error?.message || "فشل الاتصال بـ Meta" },
        { status: 502 }
      );
    }

    const metaTemplates: Array<{
      id: string;
      name: string;
      status: string;
      category?: string;
      language: string;
      rejected_reason?: string;
    }> = metaData.data || [];

    const statusMap: Record<string, string> = {
      APPROVED: "APPROVED",
      PENDING:  "PENDING",
      REJECTED: "REJECTED",
      DISABLED: "DISABLED",
      PAUSED:   "DISABLED",
    };

    // تصنيفات Meta المعروفة — أي قيمة خارجها تُعامل كـ UTILITY
    const KNOWN_CATEGORIES = new Set(["AUTHENTICATION", "UTILITY", "MARKETING"]);

    const localTemplates = await prisma.developerOtpTemplate.findMany({
      where: { projectId: id },
    });

    let updated = 0;
    let imported = 0;

    for (const local of localTemplates) {
      const metaTmpl = local.metaTemplateId
        ? metaTemplates.find((m) => m.id === local.metaTemplateId)
        : metaTemplates.find((m) => m.name === local.name && m.language === local.language);

      if (!metaTmpl) continue;

      const newStatus = statusMap[metaTmpl.status] || local.status;
      const newRejectedReason = metaTmpl.status === "REJECTED"
        ? metaTmpl.rejected_reason || "مرفوض من Meta"
        : null;

      if (
        local.status !== newStatus ||
        local.metaTemplateId !== metaTmpl.id ||
        local.rejectedReason !== newRejectedReason
      ) {
        await prisma.developerOtpTemplate.update({
          where: { id: local.id },
          data: {
            status: newStatus as any,
            metaTemplateId: metaTmpl.id,
            rejectedReason: newRejectedReason,
          },
        });
        updated++;
      }
    }

    // ── استيراد قوالب Meta التي لا سجل محلي لها ──────────────────────────
    // السبب: قالب APPROVED في Meta بلا سجل محلي كان سبب 400 دائم في الإرسال
    // (resolveTemplate لا يرى إلا الجدول المحلي). الاستيراد ينشئ السجل بنفس
    // الهوية (name + language) والحالة الحقيقية — بلا أي تجاوز للـ APPROVED.
    const matchedMetaIds = new Set(
      localTemplates
        .map((l) => l.metaTemplateId)
        .filter(Boolean) as string[]
    );
    const matchedNameLang = new Set(
      localTemplates.map((l) => `${l.name}::${l.language}`)
    );

    for (const m of metaTemplates) {
      if (!m.id || !m.name) continue;
      if (matchedMetaIds.has(m.id)) continue;
      if (matchedNameLang.has(`${m.name}::${m.language}`)) continue;

      const category = m.category && KNOWN_CATEGORIES.has(m.category.toUpperCase())
        ? m.category.toUpperCase()
        : "UTILITY";
      const isAuth = category === "AUTHENTICATION";

      await prisma.developerOtpTemplate.create({
        data: {
          projectId: id,
          name: m.name,
          language: m.language,
          category: category as any,
          // قوالب AUTHENTICATION تخزن إعدادات OTP في body (JSON) حسب convention
          // المشروع — المستورد منها يُعلَّم لمراجعته من صفحة القوالب.
          body: isAuth ? JSON.stringify({ imported: true }) : "",
          status: (statusMap[m.status] || "PENDING") as any,
          metaTemplateId: m.id,
          rejectedReason: m.status === "REJECTED" ? m.rejected_reason || "مرفوض من Meta" : null,
        },
      });
      matchedMetaIds.add(m.id);
      matchedNameLang.add(`${m.name}::${m.language}`);
      imported++;
    }

    return NextResponse.json({ ok: true, updated, imported, total: metaTemplates.length });
  } catch (err) {
    console.error("[sync-templates]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}