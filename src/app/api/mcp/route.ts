/**
 * WhatsPro — MCP Server (Model Context Protocol)
 * يسمح لـ Claude بالتحكم في واتس برو مباشرة من الشات
 *
 * Docs: https://modelcontextprotocol.io
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MessageStatus, MessageDirection, CampaignStatus } from "@/types/enums";

// ── Auth helper ───────────────────────────────────────────────────────────────
async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const key  = auth.replace(/^Bearer\s+/i, "").trim();
  if (!key) return null;

  const user = await prisma.user.findFirst({
    where: { apiKey: key, deletedAt: null },
    select: { id: true, name: true, parentId: true },
  });
  if (!user) return null;

  // دايماً نرجع الـ owner ID
  const ownerId = user.parentId ?? user.id;
  return { ...user, ownerId };
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_dashboard_stats",
    description: "إجمالي الإحصائيات: الرسائل المرسلة، الوصول، القراءة، الردود، وعدد الحملات",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_campaigns",
    description: "قائمة الحملات التسويقية مع إحصائياتها (مرسل، وصل، قُرئ، فشل)",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "completed", "running", "scheduled", "failed", "draft"],
          description: "فلترة حسب الحالة — اتركه فارغ لكل الحملات",
        },
        limit: {
          type: "number",
          description: "عدد الحملات (افتراضي 10، أقصى 50)",
        },
      },
    },
  },
  {
    name: "get_campaign_details",
    description: "تفاصيل حملة واحدة بالكامل مع معدلات الأداء",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "ID الحملة" },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "list_recent_messages",
    description: "آخر الرسائل الواردة من العملاء مع أرقام هواتفهم",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "عدد الرسائل (افتراضي 10، أقصى 50)",
        },
        unread_only: {
          type: "boolean",
          description: "true لإظهار الرسائل غير المقروءة فقط",
        },
      },
    },
  },
  {
    name: "list_contacts",
    description: "قائمة جهات الاتصال (الجمهور) مع عدد الأعضاء في كل مجموعة",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "عدد المجموعات (افتراضي 20)" },
      },
    },
  },
  {
    name: "get_report_summary",
    description: "تقرير شامل عن الأداء خلال فترة زمنية محددة",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "عدد الأيام للتقرير (7 أو 30 أو 90) — افتراضي 30",
        },
      },
    },
  },
  {
    name: "list_templates",
    description: "قائمة القوالب المعتمدة المتاحة للإرسال مع أسمائها وحالتها",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "create_campaign",
    description: "إنشاء وإطلاق حملة تسويقية جديدة — يمكن إرسالها فوراً أو جدولتها لوقت محدد",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "اسم الحملة",
        },
        template_name: {
          type: "string",
          description: "اسم القالب المعتمد من Meta — استخدم list_templates لمعرفة الأسماء المتاحة",
        },
        audience_id: {
          type: "string",
          description: "ID قائمة الاتصال — استخدم list_contacts لمعرفة الـ IDs المتاحة",
        },
        scheduled_at: {
          type: "string",
          description: "وقت الجدولة بصيغة ISO 8601 — مثال: 2026-05-25T18:00:00 — اتركه فارغاً للإرسال الفوري",
        },
      },
      required: ["name", "template_name", "audience_id"],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────
async function runTool(name: string, args: any, ownerId: string) {

  // ── get_dashboard_stats ──────────────────────────────────────────────────
  if (name === "get_dashboard_stats") {
    const [totalSent, totalDelivered, totalRead, totalInbound, totalCampaigns] =
      await Promise.all([
        prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.outbound } }),
        prisma.message.count({ where: { userId: ownerId, status: { in: [MessageStatus.delivered, MessageStatus.read] } } }),
        prisma.message.count({ where: { userId: ownerId, status: MessageStatus.read } }),
        prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.inbound } }),
        prisma.campaign.count({ where: { userId: ownerId } }),
      ]);

    const deliveryRate = totalSent > 0 ? +((totalDelivered / totalSent) * 100).toFixed(1) : 0;
    const readRate     = totalSent > 0 ? +((totalRead      / totalSent) * 100).toFixed(1) : 0;
    const replyRate    = totalSent > 0 ? +((totalInbound   / totalSent) * 100).toFixed(1) : 0;

    return {
      إجمالي_المرسل:    totalSent,
      تم_التوصيل:       totalDelivered,
      تم_القراءة:       totalRead,
      الردود_الواردة:   totalInbound,
      إجمالي_الحملات:   totalCampaigns,
      معدل_التوصيل:     `${deliveryRate}%`,
      معدل_القراءة:     `${readRate}%`,
      معدل_الرد:        `${replyRate}%`,
    };
  }

  // ── list_campaigns ───────────────────────────────────────────────────────
  if (name === "list_campaigns") {
    const limit  = Math.min(args.limit ?? 10, 50);
    const status = args.status && args.status !== "all" ? args.status : undefined;

    const campaigns = await prisma.campaign.findMany({
      where:   { userId: ownerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take:    limit,
      select:  {
        id: true, name: true, status: true,
        sentCount: true, failedCount: true,
        createdAt: true, completedAt: true,
        template: { select: { name: true } },
      },
    });

    const ids = campaigns.map(c => c.id);
    const [delivered, read] = await Promise.all([
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: ids }, status: MessageStatus.delivered },
        _count: { id: true },
      }),
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: ids }, status: MessageStatus.read },
        _count: { id: true },
      }),
    ]);

    const dMap = new Map(delivered.map(p => [p.campaignId!, p._count.id]));
    const rMap = new Map(read.map(p => [p.campaignId!, p._count.id]));

    return campaigns.map(c => ({
      id:          c.id,
      الاسم:       c.name,
      الحالة:      c.status,
      القالب:      c.template?.name ?? "—",
      مرسل:        c.sentCount,
      وصل:         (dMap.get(c.id) ?? 0) + (rMap.get(c.id) ?? 0),
      قُرئ:        rMap.get(c.id) ?? 0,
      فشل:         c.failedCount,
      تاريخ_الإنشاء: c.createdAt.toLocaleDateString("ar-EG"),
    }));
  }

  // ── get_campaign_details ─────────────────────────────────────────────────
  if (name === "get_campaign_details") {
    const c = await prisma.campaign.findFirst({
      where:  { id: args.campaign_id, userId: ownerId },
      select: {
        id: true, name: true, status: true,
        sentCount: true, failedCount: true,
        createdAt: true, scheduledAt: true, completedAt: true,
        template: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    });

    if (!c) return { error: "الحملة غير موجودة" };

    const [delivered, read] = await Promise.all([
      prisma.message.count({ where: { campaignId: c.id, status: MessageStatus.delivered } }),
      prisma.message.count({ where: { campaignId: c.id, status: MessageStatus.read } }),
    ]);

    const deliveryRate = c.sentCount > 0 ? +(((delivered + read) / c.sentCount) * 100).toFixed(1) : 0;
    const readRate     = c.sentCount > 0 ? +((read / c.sentCount) * 100).toFixed(1) : 0;

    return {
      id:             c.id,
      الاسم:          c.name,
      الحالة:         c.status,
      القالب:         c.template?.name ?? "—",
      إجمالي_الجمهور: c._count.messages,
      مرسل:           c.sentCount,
      وصل:            delivered + read,
      قُرئ:           read,
      فشل:            c.failedCount,
      معدل_التوصيل:   `${deliveryRate}%`,
      معدل_القراءة:   `${readRate}%`,
      تاريخ_الإنشاء:  c.createdAt.toLocaleDateString("ar-EG"),
      موعد_الجدولة:   c.scheduledAt?.toLocaleDateString("ar-EG") ?? "—",
      تاريخ_الاكتمال: c.completedAt?.toLocaleDateString("ar-EG") ?? "—",
    };
  }

  // ── list_recent_messages ─────────────────────────────────────────────────
  if (name === "list_recent_messages") {
    const limit      = Math.min(args.limit ?? 10, 50);
    const unreadOnly = args.unread_only ?? false;

    const messages = await prisma.message.findMany({
      where: {
        userId:    ownerId,
        direction: MessageDirection.inbound,
        ...(unreadOnly ? { status: { not: MessageStatus.read } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take:    limit,
      select:  {
        id: true, content: true, status: true, createdAt: true,
        contact: { select: { phone: true, name: true } },
      },
    });

    return messages.map(m => ({
      id:      m.id,
      الرقم:   m.contact?.phone ?? "—",
      الاسم:   m.contact?.name  ?? "—",
      الرسالة: m.content,
      الحالة:  m.status,
      الوقت:   m.createdAt.toLocaleString("ar-EG"),
    }));
  }

  // ── list_contacts ────────────────────────────────────────────────────────
  if (name === "list_contacts") {
    const limit = Math.min(args.limit ?? 20, 100);

    const audiences = await prisma.audience.findMany({
      where:   { userId: ownerId },
      orderBy: { createdAt: "desc" },
      take:    limit,
      select:  {
        id: true, name: true, type: true, createdAt: true,
        _count: { select: { contacts: true } },
      },
    });

    return audiences.map(a => ({
      id:          a.id,
      الاسم:       a.name,
      النوع:       a.type,
      عدد_العملاء: a._count.contacts,
      تاريخ_الإنشاء: a.createdAt.toLocaleDateString("ar-EG"),
    }));
  }

  // ── get_report_summary ───────────────────────────────────────────────────
  if (name === "get_report_summary") {
    const days  = args.days ?? 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const [sent, delivered, read, inbound, campaigns] = await Promise.all([
      prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.outbound, createdAt: { gte: since } } }),
      prisma.message.count({ where: { userId: ownerId, status: { in: [MessageStatus.delivered, MessageStatus.read] }, createdAt: { gte: since } } }),
      prisma.message.count({ where: { userId: ownerId, status: MessageStatus.read, createdAt: { gte: since } } }),
      prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.inbound, createdAt: { gte: since } } }),
      prisma.campaign.count({ where: { userId: ownerId, createdAt: { gte: since } } }),
    ]);

    return {
      الفترة:         `آخر ${days} يوم`,
      إجمالي_المرسل:  sent,
      تم_التوصيل:     delivered,
      تم_القراءة:     read,
      ردود_واردة:     inbound,
      حملات_منفذة:    campaigns,
      معدل_التوصيل:   sent > 0 ? `${+((delivered / sent) * 100).toFixed(1)}%` : "0%",
      معدل_القراءة:   sent > 0 ? `${+((read      / sent) * 100).toFixed(1)}%` : "0%",
      معدل_الرد:      sent > 0 ? `${+((inbound   / sent) * 100).toFixed(1)}%` : "0%",
    };
  }

  // ── list_templates ───────────────────────────────────────────────────────
  if (name === "list_templates") {
    const templates = await prisma.template.findMany({
      where:   { userId: ownerId, status: "APPROVED" },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, language: true, category: true },
    });

    if (templates.length === 0)
      return { رسالة: "لا توجد قوالب معتمدة — تأكد من مزامنة القوالب من صفحة الربط" };

    return templates.map(t => ({
      id:       t.id,
      الاسم:    t.name,
      اللغة:    t.language ?? "ar",
      الفئة:    t.category ?? "—",
    }));
  }

  // ── create_campaign ──────────────────────────────────────────────────────
  if (name === "create_campaign") {
    const { name: campaignName, template_name, audience_id, scheduled_at } = args;

    if (!campaignName?.trim())
      return { error: "اسم الحملة مطلوب" };
    if (!template_name)
      return { error: "اسم القالب مطلوب — استخدم list_templates لمعرفة القوالب المتاحة" };
    if (!audience_id)
      return { error: "ID قائمة الاتصال مطلوب — استخدم list_contacts لمعرفة القوائم المتاحة" };

    // جيب أرقام الجمهور
    const audience = await prisma.audience.findFirst({
      where:   { id: audience_id, userId: ownerId },
      include: { contacts: { select: { phone: true } } },
    });

    if (!audience)
      return { error: `قائمة الاتصال "${audience_id}" غير موجودة` };

    if (audience.contacts.length === 0)
      return { error: "القائمة المحددة فارغة — أضف جهات اتصال أولاً" };

    const numbers = audience.contacts.map(c => c.phone);

    // بعت request لـ campaigns API مع نفس الـ apiKey للمصادقة
    const host = process.env.NEXTAUTH_URL ?? "https://whatsprosystem.vercel.app";

    const apiKey = await prisma.user.findUnique({
      where:  { id: ownerId },
      select: { apiKey: true },
    });

    const res = await fetch(`${host}/api/campaigns`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "x-mcp-user-id": ownerId,  // internal header — validated inside
      },
      body: JSON.stringify({
        name:        campaignName.trim(),
        templateName: template_name,
        numbers,
        scheduledAt: scheduled_at ?? null,
        _mcpInternal: true,
        _mcpOwnerId:  ownerId,
      }),
    });

    const data = await res.json();

    if (!res.ok)
      return { error: data.error ?? "فشل إنشاء الحملة" };

    return {
      نجاح:           true,
      رسالة:          scheduled_at
        ? `✅ تم جدولة الحملة "${campaignName}" لـ ${new Date(scheduled_at).toLocaleString("ar-EG")}`
        : `✅ تم إطلاق الحملة "${campaignName}" — جاري الإرسال`,
      اسم_الحملة:     campaignName,
      عدد_المستلمين:  numbers.length,
      القالب:         template_name,
      الجمهور:        audience.name,
      موعد_الإرسال:   scheduled_at
        ? new Date(scheduled_at).toLocaleString("ar-EG")
        : "فوري",
    };
  }

  return { error: `أداة غير معروفة: ${name}` };
}

// ── MCP Protocol handlers ─────────────────────────────────────────────────────

// GET — للتحقق إن الـ server شغال (يستخدمه Claude Desktop)
export async function GET() {
  return NextResponse.json({
    name:        "WhatsPro",
    version:     "1.0.0",
    description: "منصة واتساب التسويقي — تحكم في حملاتك ورسائلك مباشرة من Claude",
    icon:        "https://whatsprosystem.vercel.app/icon.png",
  });
}

// POST — الطلبات الفعلية من Claude
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: { code: -32001, message: "Unauthorized — أضف الـ API Key الخاص بك" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { method, params, id } = body;

    // ── initialize ───────────────────────────────────────────────────────
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "WhatsPro", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      });
    }

    // ── tools/list ───────────────────────────────────────────────────────
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0", id,
        result: { tools: TOOLS },
      });
    }

    // ── tools/call ───────────────────────────────────────────────────────
    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments ?? {};

      const result = await runTool(toolName, toolArgs, user.ownerId);

      return NextResponse.json({
        jsonrpc: "2.0", id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0", id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });

  } catch (err: any) {
    console.error("[MCP] Error:", err);
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32603, message: err.message ?? "Internal error" } },
      { status: 500 }
    );
  }
}