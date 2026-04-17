import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SYNC_COOLDOWN_MS = 10_000;
const syncCooldown = new Map<string, number>();

// --- دالة تنظيف البيانات (Normalize) ---
function normalizeMetaTemplate(template: any) {
  if (!template || !template.id || !template.name) return null;

  // استخراج النص من الـ BODY component
  let content = "Template content available in Meta Dashboard";
  if (template.components && Array.isArray(template.components)) {
    const bodyComponent = template.components.find((c: any) => c.type === "BODY");
    if (bodyComponent?.text) content = bodyComponent.text;
  }

  return {
    metaId: String(template.id),
    name: String(template.name),
    status: String(template.status || "pending").toLowerCase(),
    category: String(template.category || "marketing").toLowerCase(),
    language: String(template.language || "en"),
    content: content,
  };
}

// --- دالة جلب البيانات من ميتا ---
async function fetchMetaTemplates(accessToken: string, wabaId: string) {
  // استخدمنا اللينك البسيط اللي اشتغل معاك في المتصفح لضمان وصول البيانات
  let url = `https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=100`;
  const templates: Array<any> = [];

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Meta API error ${response.status}: ${errorBody}`);
    }

    const body = await response.json();
    if (!body || !Array.isArray(body.data)) break;

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
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Cooldown logic
    const lastSync = syncCooldown.get(userId) ?? 0;
    if (Date.now() - lastSync < SYNC_COOLDOWN_MS) {
      return NextResponse.json({ success: false, error: "يرجى الانتظار قليلاً" }, { status: 429 });
    }
    syncCooldown.set(userId, Date.now());

    // --- قراءة المتغيرات بأي مسمى موجود في Env ---
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_KEY;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.WABA_ID;

    if (!accessToken || !wabaId) {
      return NextResponse.json(
        { success: false, error: "Missing Credentials (Token or WABA ID)" },
        { status: 500 }
      );
    }

    const metaTemplates = await fetchMetaTemplates(accessToken, wabaId);
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
        syncedCount++;
      } catch (error) {
        console.error(`❌ Upsert error for ${template.metaId}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: syncedCount,
      message: `تمت مزامنة ${syncedCount} قوالب بنجاح`
    });

  } catch (error: any) {
    console.error("Critical Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}