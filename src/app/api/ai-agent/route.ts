// src/app/api/ai-agent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AIProvider } from "@/types/enums";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;

  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  return user?.id ?? null;
}

// ── GET — جيب إعدادات الـ AI Agent ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.aIAgent.findUnique({ where: { userId } });

  // لو مفيش record → رجّع defaults
  return NextResponse.json(agent ?? {
    isEnabled:    false,
    provider:     "gemini",
    brandName:    "",
    businessDesc: "",
    productsInfo: "",
    pricingInfo:  "",
    workingHours: "",
    tone:         "friendly",
    systemPrompt: "",
    pauseMinutes: 10,
    languageMode: "auto",
    websiteUrl: null,
    websiteButtonText: null,
    elevenLabsEnabled: false,
    elevenLabsApiKey:  null,
    elevenLabsAgentId: null,
  });
}

// ── PUT — حفظ إعدادات الـ AI Agent (upsert) ─────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ── Plan guard: AI Agent — enterprise فقط ──
  const aiGuard = await checkFeature(userId, "aiAgent");
  const aiBlocked = guardResponse(aiGuard);
  if (aiBlocked) return aiBlocked;


  try {
    const body = await req.json();
    const {
      isEnabled,
      provider,
      brandName,
      businessDesc,
      productsInfo,
      pricingInfo,
      workingHours,
      tone,
      systemPrompt,
      languageMode,
      websiteUrl,
      websiteButtonText,
      pauseMinutes,
      elevenLabsEnabled,
      elevenLabsApiKey,
      elevenLabsAgentId,
    } = body;

    const apiKeyTrim =
      typeof elevenLabsApiKey === "string" ? elevenLabsApiKey.trim() : "";
    const agentIdTrim =
      typeof elevenLabsAgentId === "string" ? elevenLabsAgentId.trim() : "";

    const providerEnum: AIProvider =
      provider === "openai" ? AIProvider.openai : AIProvider.gemini;

    const payload = {
      isEnabled: typeof isEnabled === "boolean" ? isEnabled : false,
      provider:  providerEnum,
      brandName:        String(brandName ?? ""),
      businessDesc:     String(businessDesc ?? ""),
      productsInfo:     String(productsInfo ?? ""),
      pricingInfo:      String(pricingInfo ?? ""),
      workingHours:     String(workingHours ?? ""),
      tone:             String(tone ?? "friendly"),
      systemPrompt:     String(systemPrompt ?? ""),
      languageMode:     String(languageMode ?? "auto"),
      websiteUrl:       typeof websiteUrl === "string" ? websiteUrl.trim() || null : null,
      websiteButtonText: typeof websiteButtonText === "string" ? websiteButtonText.trim() || null : null,
      pauseMinutes:
        typeof pauseMinutes === "number" ? Math.max(1, pauseMinutes) : 10,
      elevenLabsEnabled:
        typeof elevenLabsEnabled === "boolean" ? elevenLabsEnabled : false,
      elevenLabsApiKey:  apiKeyTrim || null,
      elevenLabsAgentId: agentIdTrim || null,
    };

    const agent = await prisma.aIAgent.upsert({
      where:  { userId },
      update: payload,
      create: { userId, ...payload },
    });

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error("[AI-AGENT/PUT] Failed to save settings", error);
    return NextResponse.json(
      { error: "Failed to save AI agent settings" },
      { status: 500 },
    );
  }
}