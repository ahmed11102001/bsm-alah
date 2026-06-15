/**
 * WhatsPro — MCP Server (Model Context Protocol)
 * يسمح لـ Claude بالتحكم في واتس برو مباشرة من الشات
 *
 * Docs: https://modelcontextprotocol.io
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MessageStatus, MessageDirection, CampaignStatus } from "@/types/enums";
import { checkMCPCommandsLimit, incrementMCPCommandUsage } from "@/lib/plan-guard";

// ── Auth helper ───────────────────────────────────────────────────────────────
async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.replace(/^Bearer\s+/i, "").trim();
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
    description: "قائمة القوالب مع حالتها — APPROVED / PENDING / REJECTED / PAUSED — يمكن الفلترة حسب الحالة",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "APPROVED", "PENDING", "REJECTED", "PAUSED"],
          description: "فلترة حسب الحالة — افتراضي: all",
        },
      },
    },
  },
  {
    name: "create_template",
    description: "إنشاء قالب واتساب جديد وإرساله إلى Meta للمراجعة — أو حفظه كمسودة محلية",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "اسم القالب — حروف صغيرة وأرقام و _ فقط، لا يبدأ برقم. مثال: order_confirmed",
        },
        category: {
          type: "string",
          enum: ["MARKETING", "UTILITY"],
          description: "MARKETING للعروض والتسويق — UTILITY لتأكيد الطلب والخدمات",
        },
        language: {
          type: "string",
          enum: ["ar", "en", "fr", "es"],
          description: "لغة القالب — افتراضي: ar",
        },
        body: {
          type: "string",
          description: "نص الرسالة. استخدم {{1}} {{2}} ... للمتغيرات الديناميكية",
        },
        header_type: {
          type: "string",
          enum: ["none", "text", "image", "video", "document"],
          description: "نوع الـ header — افتراضي: none",
        },
        header_text: {
          type: "string",
          description: "نص الـ header — فقط لو header_type = text",
        },
        footer: {
          type: "string",
          description: "نص الـ footer (اختياري، حد أقصى 60 حرف)",
        },
        buttons: {
          type: "array",
          description: "أزرار الرسالة (اختياري، حد أقصى 3 أزرار)",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["url", "phone", "quick_reply"] },
              text: { type: "string", description: "نص الزر" },
              value: { type: "string", description: "الرابط أو رقم الهاتف — فارغ للـ quick_reply" },
            },
            required: ["type", "text"],
          },
        },
        example_vars: {
          type: "array",
          description: "قيم تجريبية للمتغيرات {{1}} {{2}} ... بالترتيب — Meta تطلبها عند الإرسال",
          items: { type: "string" },
        },
        draft: {
          type: "boolean",
          description: "true لحفظ مسودة محلية بدون إرسال لـ Meta — false (افتراضي) للإرسال للمراجعة",
        },
      },
      required: ["name", "category", "body"],
    },
  },
  {
    name: "delete_template",
    description: "حذف قالب من النظام ومن Meta (إذا كان مرسلاً) — يتطلب اسم القالب أو ID",
    inputSchema: {
      type: "object",
      properties: {
        template_id: {
          type: "string",
          description: "ID القالب من قاعدة البيانات — استخدم list_templates للحصول عليه",
        },
      },
      required: ["template_id"],
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
    const readRate = totalSent > 0 ? +((totalRead / totalSent) * 100).toFixed(1) : 0;
    const replyRate = totalSent > 0 ? +((totalInbound / totalSent) * 100).toFixed(1) : 0;

    return {
      إجمالي_المرسل: totalSent,
      تم_التوصيل: totalDelivered,
      تم_القراءة: totalRead,
      الردود_الواردة: totalInbound,
      إجمالي_الحملات: totalCampaigns,
      معدل_التوصيل: `${deliveryRate}%`,
      معدل_القراءة: `${readRate}%`,
      معدل_الرد: `${replyRate}%`,
    };
  }

  // ── list_campaigns ───────────────────────────────────────────────────────
  if (name === "list_campaigns") {
    const limit = Math.min(args.limit ?? 10, 50);
    const status = args.status && args.status !== "all" ? args.status : undefined;

    const campaigns = await prisma.campaign.findMany({
      where: { userId: ownerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
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
      id: c.id,
      الاسم: c.name,
      الحالة: c.status,
      القالب: c.template?.name ?? "—",
      مرسل: c.sentCount,
      وصل: (dMap.get(c.id) ?? 0) + (rMap.get(c.id) ?? 0),
      قُرئ: rMap.get(c.id) ?? 0,
      فشل: c.failedCount,
      تاريخ_الإنشاء: c.createdAt.toLocaleDateString("ar-EG"),
    }));
  }

  // ── get_campaign_details ─────────────────────────────────────────────────
  if (name === "get_campaign_details") {
    const c = await prisma.campaign.findFirst({
      where: { id: args.campaign_id, userId: ownerId },
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
    const readRate = c.sentCount > 0 ? +((read / c.sentCount) * 100).toFixed(1) : 0;

    return {
      id: c.id,
      الاسم: c.name,
      الحالة: c.status,
      القالب: c.template?.name ?? "—",
      إجمالي_الجمهور: c._count.messages,
      مرسل: c.sentCount,
      وصل: delivered + read,
      قُرئ: read,
      فشل: c.failedCount,
      معدل_التوصيل: `${deliveryRate}%`,
      معدل_القراءة: `${readRate}%`,
      تاريخ_الإنشاء: c.createdAt.toLocaleDateString("ar-EG"),
      موعد_الجدولة: c.scheduledAt?.toLocaleDateString("ar-EG") ?? "—",
      تاريخ_الاكتمال: c.completedAt?.toLocaleDateString("ar-EG") ?? "—",
    };
  }

  // ── list_recent_messages ─────────────────────────────────────────────────
  if (name === "list_recent_messages") {
    const limit = Math.min(args.limit ?? 10, 50);
    const unreadOnly = args.unread_only ?? false;

    const messages = await prisma.message.findMany({
      where: {
        userId: ownerId,
        direction: MessageDirection.inbound,
        ...(unreadOnly ? { status: { not: MessageStatus.read } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, content: true, status: true, createdAt: true,
        contact: { select: { phone: true, name: true } },
      },
    });

    return messages.map(m => ({
      id: m.id,
      الرقم: m.contact?.phone ?? "—",
      الاسم: m.contact?.name ?? "—",
      الرسالة: m.content,
      الحالة: m.status,
      الوقت: m.createdAt.toLocaleString("ar-EG"),
    }));
  }

  // ── list_contacts ────────────────────────────────────────────────────────
  if (name === "list_contacts") {
    const limit = Math.min(args.limit ?? 20, 100);

    const audiences = await prisma.audience.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, name: true, type: true, createdAt: true,
        _count: { select: { contacts: true } },
      },
    });

    return audiences.map(a => ({
      id: a.id,
      الاسم: a.name,
      النوع: a.type,
      عدد_العملاء: a._count.contacts,
      تاريخ_الإنشاء: a.createdAt.toLocaleDateString("ar-EG"),
    }));
  }

  // ── get_report_summary ───────────────────────────────────────────────────
  if (name === "get_report_summary") {
    const days = args.days ?? 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const [sent, delivered, read, inbound, campaigns] = await Promise.all([
      prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.outbound, createdAt: { gte: since } } }),
      prisma.message.count({ where: { userId: ownerId, status: { in: [MessageStatus.delivered, MessageStatus.read] }, createdAt: { gte: since } } }),
      prisma.message.count({ where: { userId: ownerId, status: MessageStatus.read, createdAt: { gte: since } } }),
      prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.inbound, createdAt: { gte: since } } }),
      prisma.campaign.count({ where: { userId: ownerId, createdAt: { gte: since } } }),
    ]);

    return {
      الفترة: `آخر ${days} يوم`,
      إجمالي_المرسل: sent,
      تم_التوصيل: delivered,
      تم_القراءة: read,
      ردود_واردة: inbound,
      حملات_منفذة: campaigns,
      معدل_التوصيل: sent > 0 ? `${+((delivered / sent) * 100).toFixed(1)}%` : "0%",
      معدل_القراءة: sent > 0 ? `${+((read / sent) * 100).toFixed(1)}%` : "0%",
      معدل_الرد: sent > 0 ? `${+((inbound / sent) * 100).toFixed(1)}%` : "0%",
    };
  }

  // ── list_templates ───────────────────────────────────────────────────────
  if (name === "list_templates") {
    const statusFilter = args.status && args.status !== "all" ? args.status : undefined;

    const templates = await prisma.template.findMany({
      where: { userId: ownerId, ...(statusFilter ? { status: statusFilter } : {}) },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, language: true, category: true, status: true, createdAt: true },
    });

    if (templates.length === 0)
      return {
        رسالة: statusFilter
          ? `لا توجد قوالب بحالة ${statusFilter}`
          : "لا توجد قوالب — أنشئ قالباً من صفحة القوالب أو عبر create_template"
      };

    return templates.map(t => ({
      id: t.id,
      الاسم: t.name,
      اللغة: t.language ?? "ar",
      الفئة: t.category ?? "—",
      الحالة: t.status,
      تاريخ_الإنشاء: t.createdAt.toLocaleDateString("ar-EG"),
    }));
  }

  // ── create_template ──────────────────────────────────────────────────────
  if (name === "create_template") {
    const {
      name: tplName, category, language = "ar",
      body, header_type = "none", header_text = "",
      footer = "", buttons = [], example_vars = [], draft = false,
    } = args;

    // Validation
    if (!tplName?.trim())
      return { error: "اسم القالب مطلوب" };
    if (/^\d/.test(tplName))
      return { error: "اسم القالب لا يمكن أن يبدأ برقم" };
    if (!/^[a-z0-9_]+$/.test(tplName))
      return { error: "اسم القالب: حروف صغيرة وأرقام و _ فقط" };
    if (!body?.trim())
      return { error: "نص الرسالة (body) مطلوب" };
    if (!category)
      return { error: "الفئة (category) مطلوبة: MARKETING أو UTILITY" };

    // Validate variable continuity
    const varNums = [...body.matchAll(/\{\{(\d+)\}\}/g)].map(m => parseInt(m[1])).sort((a, b) => a - b);
    for (let i = 0; i < varNums.length; i++) {
      if (varNums[i] !== i + 1)
        return { error: `ترتيب المتغيرات غير صحيح — يجب أن تكون {{1}} {{2}} ... بدون تخطي` };
    }

    const host = process.env.NEXTAUTH_URL ?? "https://whatsprosystem.vercel.app";

    const res = await fetch(`${host}/api/templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-user-id": ownerId,
        "x-mcp-internal": "true",
      },
      body: JSON.stringify({
        name: tplName.toLowerCase(),
        category,
        language,
        headerType: header_type,
        headerText: header_text,
        body,
        footer,
        buttons,
        exampleVars: example_vars,
        draft,
        _mcpInternal: true,
        _mcpOwnerId: ownerId,
      }),
    });

    const data = await res.json();

    if (!res.ok)
      return { error: data.error ?? "فشل إنشاء القالب" };

    return {
      نجاح: true,
      رسالة: draft
        ? `✅ تم حفظ القالب "${tplName}" كمسودة محلية`
        : `✅ تم إرسال القالب "${tplName}" إلى Meta للمراجعة — الحالة: PENDING`,
      id: data.id,
      الاسم: data.name,
      الحالة: data.status,
      ملاحظة: draft
        ? "القالب محفوظ محلياً فقط — استخدم submit_template_to_meta لإرساله لاحقاً"
        : "Meta تستغرق عادةً بضع دقائق إلى ساعات للمراجعة",
    };
  }

  // ── delete_template ──────────────────────────────────────────────────────
  if (name === "delete_template") {
    const { template_id } = args;

    if (!template_id)
      return { error: "template_id مطلوب — استخدم list_templates للحصول عليه" };

    const template = await prisma.template.findFirst({
      where: { id: template_id, userId: ownerId },
      select: { id: true, name: true, metaId: true },
    });

    if (!template)
      return { error: `القالب "${template_id}" غير موجود أو لا ينتمي لحسابك` };

    const host = process.env.NEXTAUTH_URL ?? "https://whatsprosystem.vercel.app";

    const res = await fetch(`${host}/api/templates`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-user-id": ownerId,
        "x-mcp-internal": "true",
      },
      body: JSON.stringify({
        id: template_id,
        _mcpInternal: true,
        _mcpOwnerId: ownerId,
      }),
    });

    const data = await res.json();

    if (!res.ok)
      return { error: data.error ?? "فشل حذف القالب" };

    return {
      نجاح: true,
      رسالة: `✅ تم حذف القالب "${template.name}" بنجاح`,
      id: template_id,
    };
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
      where: { id: audience_id, userId: ownerId },
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
      where: { id: ownerId },
      select: { apiKey: true },
    });

    const res = await fetch(`${host}/api/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-user-id": ownerId,  // internal header — validated inside
      },
      body: JSON.stringify({
        name: campaignName.trim(),
        templateName: template_name,
        numbers,
        scheduledAt: scheduled_at ?? null,
        _mcpInternal: true,
        _mcpOwnerId: ownerId,
      }),
    });

    const data = await res.json();

    if (!res.ok)
      return { error: data.error ?? "فشل إنشاء الحملة" };

    return {
      نجاح: true,
      رسالة: scheduled_at
        ? `✅ تم جدولة الحملة "${campaignName}" لـ ${new Date(scheduled_at).toLocaleString("ar-EG")}`
        : `✅ تم إطلاق الحملة "${campaignName}" — جاري الإرسال`,
      اسم_الحملة: campaignName,
      عدد_المستلمين: numbers.length,
      القالب: template_name,
      الجمهور: audience.name,
      موعد_الإرسال: scheduled_at
        ? new Date(scheduled_at).toLocaleString("ar-EG")
        : "فوري",
    };
  }

  return { error: `أداة غير معروفة: ${name}` };
}

// ── MCP Protocol handlers ─────────────────────────────────────────────────────


// ── CORS headers — required for claude.ai web ────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// GET — Claude.ai (SSE) أو discovery (browser/Desktop)
export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";

  // SSE mode — claude.ai web
  if (accept.includes("text/event-stream")) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const payload = JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {
            serverInfo: { name: "WhatsPro", version: "1.0.0" },
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
          },
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        const hb = setInterval(() => {
          try { controller.enqueue(encoder.encode(": heartbeat\n\n")); }
          catch { clearInterval(hb); }
        }, 15_000);
      },
    });
    return new NextResponse(stream, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  // Discovery mode
  return NextResponse.json(
    { name: "WhatsPro", version: "1.0.0", description: "WhatsApp Marketing Platform" },
    { headers: CORS }
  );
}


// POST — الطلبات الفعلية من Claude
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: { code: -32001, message: "Unauthorized — أضف الـ API Key الخاص بك" } },
        { status: 401, headers: CORS }
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

      // ── Plan guard: check MCP commands limit ─────────────────────────
      const guard = await checkMCPCommandsLimit(user.ownerId);
      if (!guard.allowed) {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          error: {
            code: -32003,
            message: guard.code === "FEATURE_LOCKED"
              ? "❌ ميزة Claude AI تتطلب باقة Professional أو أعلى. قم بالترقية من الداشبورد."
              : `⚠️ انتهت أوامر Claude الشهرية. يمكنك شراء 100 أمر إضافي بـ 99 جنيه من الداشبورد.`,
            data: { code: guard.code, requiredPlan: guard.requiredPlan, limit: guard.limit, used: guard.used },
          },
        }, { headers: CORS });
      }

      const result = await runTool(toolName, toolArgs, user.ownerId);

      // ── Increment usage after successful tool call ────────────────────
      await incrementMCPCommandUsage(user.ownerId).catch(() => { });

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