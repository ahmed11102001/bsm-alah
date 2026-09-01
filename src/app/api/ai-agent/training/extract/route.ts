// src/app/api/ai-agent/training/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";
import { parseInput, TrainingExtractInputSchema } from "@/lib/schemas";
import { extractTrainingRule } from "@/lib/ai-agent-training";

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "AI_AGENT_MANAGE");
  if (denied) return denied;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const parsed = parseInput(TrainingExtractInputSchema, body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { feedback, contactId, messageId } = parsed.data;

    // جلب سياق الرسائل إذا وُجد contactId أو messageId
    let contextMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (contactId) {
      const messagesQuery = await prisma.message.findMany({
        where: {
          contactId,
          userId,
          deletedAt: null,
          ...(messageId ? { createdAt: { lte: (await prisma.message.findUnique({ where: { id: messageId }, select: { createdAt: true } }))?.createdAt || new Date() } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          content: true,
          direction: true,
          senderType: true,
          type: true,
          createdAt: true,
        },
      });

      contextMessages = messagesQuery.reverse().map((m) => ({
        role: m.senderType === "ai" || m.direction === "outbound" ? "assistant" : "user",
        content: m.content || `[${m.type}]`,
      }));
    }

    // جلب القواعد المخصصة الحالية للـ Guardrails
    const currentGuardrail = await prisma.aIGuardrail.findUnique({
      where: { userId },
      select: { customRules: true },
    });

    // استخراج القاعدة عبر LLM
    const extraction = await extractTrainingRule({
      feedback,
      contextMessages,
      existingGuardrails: currentGuardrail?.customRules,
    });

    if (!extraction.ok) {
      // حفظ سجل مع تسجيل الخطأ لعدم ضياع فيدباك المستخدم
      const rule = await prisma.agentTrainingRule.create({
        data: {
          userId,
          contactId: contactId || null,
          messageId: messageId || null,
          feedback,
          contextSnapshot: contextMessages.length > 0 ? (contextMessages as any) : null,
          status: "pending",
          extractionError: extraction.error,
        },
      });

      return NextResponse.json({ rule, extractionError: extraction.error }, { status: 200 });
    }

    // حفظ السجل كـ pending مع البيانات المستخرجة
    const rule = await prisma.agentTrainingRule.create({
      data: {
        userId,
        contactId: contactId || null,
        messageId: messageId || null,
        feedback,
        contextSnapshot: contextMessages.length > 0 ? (contextMessages as any) : null,
        type: extraction.data.type,
        content: extraction.summary,
        extractedData: extraction.data as any,
        confidence: extraction.data.confidence,
        extractionModel: extraction.model,
        status: "pending",
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error: any) {
    console.error("[API/AI-AGENT/TRAINING/EXTRACT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process training feedback" },
      { status: 500 }
    );
  }
}
