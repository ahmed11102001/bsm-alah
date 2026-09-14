// src/app/api/ai-agent/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAIReply, type ConversationMessage } from "@/lib/ai-agent";
import { getRelevantProducts } from "@/lib/product-search";
import {
  checkFeature,
  guardResponse,
  checkAITokensLimit,
  reserveAgentBetaTokens,
  settleAgentBetaTokens,
  incrementAITokens,
  getAgentBetaStatus,
} from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

// ── POST — تجربة مساعد الذكاء الاصطناعي (Test Chat / Preview) ──
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "AI_AGENT_MANAGE");

  if (denied) return denied;
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const aiGuard = await checkFeature(userId, "aiAgent");
  const aiBlocked = guardResponse(aiGuard);
  if (aiBlocked) return aiBlocked;

  // ── P0: المعاينة توليد Gemini حقيقي — كانت بلا فحص كوتا ولا خصم ──────
  // البيتا: حجز ذري من الـ 30K قبل التوليد. غيرها: فحص الكوتا الشهرية.
  const betaPreview = await getAgentBetaStatus(userId).catch(() => null);
  const isBetaMeteredPreview = betaPreview?.active === true;
  const PREVIEW_ESTIMATED_TOKENS = 1500;
  if (isBetaMeteredPreview) {
    const reservation = await reserveAgentBetaTokens(userId, PREVIEW_ESTIMATED_TOKENS);
    if (!reservation.ok) {
      return NextResponse.json(
        {
          error: "انتهت توكنز تجربة Agent Beta Access (30K). رقِّ إلى باقة Max لمتابعة استخدام إيجنت وني.",
          code: "LIMIT_REACHED",
        },
        { status: 403 }
      );
    }
  } else {
    const quota = await checkAITokensLimit(userId, PREVIEW_ESTIMATED_TOKENS);
    const quotaBlocked = guardResponse(quota);
    if (quotaBlocked) return quotaBlocked;
  }

  try {
    const body = await req.json();
    const { messages, message } = body as {
      messages?: { role: "user" | "assistant"; content: string }[];
      message?: string;
    };

    const userMessage = message?.trim() || (messages?.length ? messages[messages.length - 1].content : "");
    if (!userMessage) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Fetch Agent settings
    const agent = await prisma.aIAgent.findUnique({ where: { userId } });
    if (!agent) {
      return NextResponse.json({ error: "إعدادات المساعد غير موجودة" }, { status: 404 });
    }

    // Prepare conversation history
    const conversation: ConversationMessage[] = (messages && messages.length > 0)
      ? messages.map(m => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: userMessage }];

    // Retrieve Knowledge Sources
    const relevantProducts = await getRelevantProducts(userId, userMessage, 5);

    const [policies, guardrails, salesSettings, customerServiceSettings, faqs, issues] = await Promise.all([
      prisma.brandPolicy.findMany({
        where: { userId },
        select: { type: true, title: true, content: true },
      }),
      prisma.aIGuardrail.findUnique({
        where: { userId },
        select: {
          noInventPrices: true, noInventProducts: true,
          noMentionCompetitors: true, noSharePersonal: true,
          strictKnowledgeOnly: true, alwaysHandoffComplaints: true,
          responseStyle: true, customRules: true,
        },
      }),
      prisma.salesBehaviorSettings.findUnique({ where: { userId } }),
      prisma.customerServiceSettings.findUnique({ where: { userId } }),
      prisma.brandFAQ.findMany({
        where: { userId },
        select: { question: true, answer: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.customerIssue.findMany({
        where: { userId },
        select: { problem: true, resolution: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const hasCustomerService =
      !!customerServiceSettings?.generalSupportInfo?.trim() ||
      !!customerServiceSettings?.supportProcess?.trim() ||
      !!customerServiceSettings?.escalationInstructions?.trim() ||
      faqs.length > 0 ||
      issues.length > 0;

    const result = await getAIReply(
      conversation,
      {
        brandName: agent.brandName,
        businessDesc: agent.businessDesc,
        productsInfo: agent.productsInfo,
        pricingInfo: agent.pricingInfo,
        workingHours: agent.workingHours,
        tone: agent.tone,
        systemPrompt: agent.systemPrompt,
        languageMode: agent.languageMode,
        websiteUrl: agent.websiteUrl,
        websiteButtonText: agent.websiteButtonText,
        relevantProducts: relevantProducts.length > 0 ? relevantProducts : undefined,
        salesBehavior: salesSettings
          ? {
              goal: salesSettings.goal,
              suggestDiscounts: salesSettings.suggestDiscounts,
            }
          : undefined,
        policies: policies.length > 0 ? policies : undefined,
        customerService: hasCustomerService
          ? {
              generalSupportInfo: customerServiceSettings?.generalSupportInfo,
              supportProcess: customerServiceSettings?.supportProcess,
              escalationInstructions: customerServiceSettings?.escalationInstructions,
              faqs: faqs.length > 0 ? faqs : undefined,
              issues: issues.length > 0 ? issues : undefined,
            }
          : undefined,
        guardrails: guardrails ?? undefined,
      },
      // البيتا: Gemini فقط حتى لو المحفوظ openai
      isBetaMeteredPreview ? "gemini" : (agent.provider as "gemini" | "openai")
    );

    // ── P0: تسوية/خصم فعلي (كانت غائبة) ────────────────────────────────
    const actualPreview = result.tokensUsed ?? 0;
    if (isBetaMeteredPreview) {
      await settleAgentBetaTokens(userId, PREVIEW_ESTIMATED_TOKENS, result.ok ? actualPreview : 0);
    } else if (result.ok && actualPreview > 0) {
      await incrementAITokens(userId, actualPreview);
    }

    // Resolve images for product_ids if any
    let matchedProducts: any[] = [];
    if (result.productIds?.length && relevantProducts.length > 0) {
      const retrievedIdSet = new Set(relevantProducts.map(p => p.id));
      const validIds = result.productIds.filter(id => retrievedIdSet.has(id));
      if (validIds.length > 0) {
        matchedProducts = await prisma.product.findMany({
          where: { id: { in: validIds }, userId, isActive: true },
          select: { id: true, name: true, price: true, currency: true, images: true, url: true },
        });
      }
    }

    return NextResponse.json({
      ok: result.ok,
      reply: result.reply,
      action: result.action,
      reason: result.reason,
      priority: result.priority,
      productIds: result.productIds,
      matchedProducts,
      retrievedProductsCount: relevantProducts.length,
      knowledgeSources: [
        ...(agent.brandName || agent.businessDesc ? ["brand"] : []),
        ...(relevantProducts.length > 0 ? ["catalog"] : []),
        ...(hasCustomerService ? ["customer_service"] : []),
        ...(policies.length > 0 ? ["policies"] : []),
        ...(guardrails ? ["behavior_rules"] : []),
      ],
      tokensUsed: result.tokensUsed,
    });
  } catch (error: any) {
    console.error("[AI-AGENT/PREVIEW] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to test AI reply" }, { status: 500 });
  }
}
