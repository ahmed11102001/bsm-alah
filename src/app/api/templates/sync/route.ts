import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// كول داون عشان نمنع السبام (10 ثواني)
const SYNC_COOLDOWN_MS = 10_000;
const syncCooldown = new Map<string, number>();

/**
 * تنظيف وتحويل بيانات القالب من ميتا لتناسب قاعدة البيانات
 */
function normalizeMetaTemplate(template: any) {
  if (!template || !template.id || !template.name) return null;

  // البحث عن محتوى الرسالة في الـ Components
  let content = "محتوى القالب متاح في Meta Dashboard";
  if (Array.isArray(template.components)) {
    const bodyComponent = template.components.find((c: any) => c.type === "BODY");
    if (bodyComponent?.text) content = bodyComponent.text;
  }

  return {
    metaId: String(template.id),
    name: String(template.name),
    status: String(template.status || "pending").toLowerCase(),
    category: String(template.category || "marketing").toLowerCase(),
    language: String(template.language || "ar"),
    content: content,
  };
}

/**
 * جلب القوالب من Meta API مع كسر الكاش
 */
async function fetchMetaTemplates(accessToken: string, wabaId: string) {
  // إضافة Timestamp لضمان عدم استرجاع بيانات قديمة (Cache Breaking)
  const cb = Date.now();
  const url = `https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=100&_cb=${cb}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store', // منع التخزين المؤقت تماماً
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Meta API error: ${errorData}`);
  }

  const result = await response.json();
  const rawData = result.data || [];
  
  const templates: any[] = [];
  for (const item of rawData) {
    const normalized = normalizeMetaTemplate(item);
    if (normalized) templates.push(normalized);
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

    // Cooldown Logic
    const lastSync = syncCooldown.get(userId) ?? 0;
    if (Date.now() - lastSync < SYNC_COOLDOWN_MS) {
      return NextResponse.json({ success: false, error: "يرجى الانتظار قليلاً قبل المحاولة مرة أخرى" }, { status: 429 });
    }
    syncCooldown.set(userId, Date.now());

    // --- جلب المتغيرات (دعم كل المسميات اللي جربناها) ---
    const accessToken = process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!accessToken || !wabaId) {
      return NextResponse.json({ 
        success: false, 
        error: "نقص في بيانات الربط (Token or WABA ID)" 
      }, { status: 500 });
    }

    // التنفيذ
    const metaTemplates = await fetchMetaTemplates(accessToken, wabaId);
    let syncedCount = 0;

    for (const template of metaTemplates) {
      try {
        await prisma.template.upsert({
          where: {
            metaId_userId: {
              metaId: template.metaId,
              userId: userId,
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
            userId: userId,
          },
        });
        syncedCount++;
      } catch (dbError) {
        console.error("خطأ أثناء التحديث في قاعدة البيانات:", dbError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: syncedCount,
      message: `تمت مزامنة ${syncedCount} قالب بنجاح`
    });

  } catch (error: any) {
    console.error("Critical Sync Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}