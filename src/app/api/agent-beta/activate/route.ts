// src/app/api/agent-beta/activate/route.ts
// ─── تفعيل Agent Beta Access — لحظة بداية الـ 5 أيام ───────────────────
// POST فقط، OWNER فقط، لمرة واحدة، Free/Go/Pro فقط.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { activateAgentBeta, getAgentBetaStatus } from "@/lib/plan-guard";
import { notifyAgentBetaActivated } from "@/lib/notifications";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // التفعيل للمالك فقط — sub-accounts (FULL_ACCESS/CHAT_ONLY) ممنوعون
  if (session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "تفعيل Agent Beta Access متاح لصاحب الحساب فقط" },
      { status: 403 }
    );
  }

  const ownerId = session.user.id as string;
  const result = await activateAgentBeta(ownerId);

  if (!result.ok) {
    const messages: Record<string, string> = {
      is_super_admin: "الحسابات الداخلية لا تحتاج تفعيل البيتا",
      is_enterprise: "باقتك Max تمتلك إيجنت وني أصلاً",
      already_consumed: "استخدمت Agent Beta Access من قبل — رقِّ إلى Max للمتابعة",
    };
    return NextResponse.json(
      { error: messages[result.reason] ?? "تعذر التفعيل", reason: result.reason },
      { status: 409 }
    );
  }

  // إشعار داخلي (non-blocking) — لا يفشل التفعيل لو فشل
  notifyAgentBetaActivated(ownerId).catch(() => {});

  const beta = await getAgentBetaStatus(ownerId);
  return NextResponse.json({ ok: true, reason: result.reason, endsAt: result.endsAt, beta });
}
