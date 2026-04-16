import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SYNC_COOLDOWN_MS = 10_000;
const syncCooldown = new Map<string, number>();

// --- تعديل الدالة لضمان عدم تجاهل أي قالب ---
function normalizeMetaTemplate(template: any) {
  if (!template || !template.id || !template.name) {
    return null;
  }

  const status = typeof template.status === "string" ? template.status.toLowerCase() : "pending";
  const category = typeof template.category === "string" ? template.category : "marketing";
  const language = typeof template.language === "string" ? template.language : "en";

  // محاولة استخراج النص من الـ components
  let content = "Template content available in Meta Dashboard"; 
  
  if (Array.isArray(template.components)) {
    const bodyComponent = template.components.find(
      (comp: any) => comp?.type === "BODY"
    );
    if (bodyComponent?.text) {
      content = bodyComponent.text;
    }
  } else if (template.components && typeof template.components.text === "string") {
    content = template.components.text;
  }

  return {
    metaId: String(template.id),
    name: String(template.name),
    status,
    category,
    language,
    content, // سيحتوي دائماً على نص بدلاً من null
  };
}

async function fetchMetaTemplates(accessToken: string, wabaId: string) {
  const fields = [
    "id",
    "name",
    "status",
    "category",
    "language",
    "components{type,text}",
  ].join(",");

  let url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
    wabaId
  )}/message_templates?fields=${encodeURIComponent(fields)}&limit=100`;
  
  const templates: Array<any> = [];

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("Meta API Error Response:", responseText);
      throw new Error(`Meta API error ${response.status}: ${responseText}`);
    }

    const body = await response.json();
    if (!body || !Array.isArray(body.data)) {
      break;
    }

    for (const item of body.data) {
      const normalized = normalizeMetaTemplate(item);
      if (normalized) templates.push(normalized);
    }

    url = body?.paging?.next || null;
  }

  return templates;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "معرف المستخدم غير متوفر" }, { status: 401 });
    }

    const lastSync = syncCooldown.get(userId) ?? 0;
    const now = Date.now();
    if (now - lastSync < SYNC_COOLDOWN_MS) {
      return NextResponse.json(
        { success: false, error: "يرجى الانتظار قليلاً" },
        { status: 429 }
      );
    }

    syncCooldown.set(userId, now);

    // --- التأكد من قراءة المتغيرات بكافة المسميات المحتملة ---
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_KEY;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.WABA_ID;

    if (!accessToken || !wabaId) {
      console.error("Missing Credentials:", { hasToken: !!accessToken, hasWaba: !!wabaId });
      return NextResponse.json(
        { success: false, error: "Missing Meta API credentials in Environment Variables" },
        { status: 500 }
      );
    }

    const metaTemplates = await fetchMetaTemplates(accessToken, wabaId);
    console.log(`Fetched ${metaTemplates.length} templates from Meta for WABA: ${wabaId}`);

    let syncedCount = 0;

    for (const template of metaTemplates) {
      try {
        await prisma.template.upsert({
          where: {
            metaId_userId: {
              metaId: template.metaId,
              userId,
            },
          },
          update: {
            name: template.name,
            status: template.status,
            category: template.category,
            language: template.language,
            content: template.content,
          },
          create: {
            metaId: template.metaId,
            name: template.name,
            status: template.status,
            category: template.category,
            language: template.language,
            content: template.content,
            userId,
          },
        });
        syncedCount += 1;
      } catch (error) {
        console.error("Prisma Upsert Error for template:", template.metaId, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: syncedCount,
      message: `Successfully synced ${syncedCount} templates to database`
    });
  } catch (error: any) {
    console.error("Critical Error in /api/templates/sync:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "فشل مزامنة القوالب" },
      { status: 500 }
    );
  }
}