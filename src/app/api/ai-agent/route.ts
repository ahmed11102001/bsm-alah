// src/app/api/ai-agent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
  });
}

// ── PUT — حفظ إعدادات الـ AI Agent (upsert) ─────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      pauseMinutes,
    } = body;

    const data = {
      isEnabled:    typeof isEnabled    === "boolean" ? isEnabled    : false,
      provider:     provider === "openai"             ? "openai"     : "gemini",
      brandName:    brandName    ?? "",
      businessDesc: businessDesc ?? "",
      productsInfo: productsInfo ?? "",
      pricingInfo:  pricingInfo  ?? "",
      workingHours: workingHours ?? "",
      tone:         tone         ?? "friendly",
      systemPrompt: systemPrompt ?? "",
      pauseMinutes: typeof pauseMinutes === "number" ? Math.max(1, pauseMinutes) : 10,
    } as any;

    const agent = await prisma.aIAgent.upsert({
      where:  { userId },
      update: data,
      create: { userId, ...data },
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
