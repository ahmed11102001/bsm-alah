// src/app/api/ai-agent/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAIReply, type ConversationMessage } from "@/lib/ai-agent";
import { getRelevantProducts } from "@/lib/product-search";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const aiGuard = await checkFeature(userId, "aiAgent");
  const aiBlocked = guardResponse(aiGuard);
  if (aiBlocked) return aiBlocked;

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

    const [faqs, policies, guardrails] = await Promise.all([
      prisma.brandFAQ.findMany({
        where: { userId },
        orderBy: { sortOrder: "asc" },
        select: { question: true, answer: true },
      }),
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
          maxReplyLines: true, customRules: true,
        },
      }),
    ]);

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
        faqs: faqs.length > 0 ? faqs : undefined,
        policies: policies.length > 0 ? policies : undefined,
        guardrails: guardrails ?? undefined,
      },
      agent.provider as "gemini" | "openai"
    );

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
      tokensUsed: result.tokensUsed,
    });
  } catch (error: any) {
    console.error("[AI-AGENT/PREVIEW] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to test AI reply" }, { status: 500 });
  }
}
