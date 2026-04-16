import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SYNC_COOLDOWN_MS = 10_000;
const syncCooldown = new Map<string, number>();

function normalizeMetaTemplate(template: any) {
  if (!template || !template.id || !template.name) {
    return null;
  }

  const status = typeof template.status === "string" ? template.status.toLowerCase() : "pending";
  const category = typeof template.category === "string" ? template.category : "marketing";
  const language = typeof template.language === "string" ? template.language : "en";

  let content: string | null = null;
  if (Array.isArray(template.components)) {
    const bodyComponent = template.components.find(
      (comp: any) => comp?.type === "BODY" && typeof comp?.text === "string"
    );
    if (bodyComponent) content = bodyComponent.text;
  } else if (template.components && typeof template.components.text === "string") {
    content = template.components.text;
  }

  return {
    metaId: String(template.id),
    name: String(template.name),
    status,
    category,
    language,
    content,
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
  )}/message_templates?fields=${encodeURIComponent(fields)}`;
  const templates: Array<any> = [];

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
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
        {
          success: false,
          error: "يرجى الانتظار قليلاً قبل تجربة المزامنة مرة أخرى",
        },
        { status: 429 }
      );
    }

    syncCooldown.set(userId, now);

   const accessToken = process.env.WHATSAPP_ACCESS_TOKEN; // المسمى الصحيح
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID; // المسمى الصحيح

    if (!accessToken || !wabaId) {
      console.error("Missing Meta API credentials: WABA_ID or WHATSAPP_API_KEY");
      return NextResponse.json(
        { success: false, error: "Missing Meta API credentials" },
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
        syncedCount += 1;
      } catch (error) {
        console.error("Failed to upsert template", template.metaId, error);
      }
    }

    return NextResponse.json({ success: true, count: syncedCount });
  } catch (error) {
    console.error("Error in /api/templates/sync:", error);
    return NextResponse.json(
      { success: false, error: "فشل مزامنة القوالب" },
      { status: 500 }
    );
  }
}
