// ════════════════════════════════════════════════════════════════════════════
// FILE: src/app/api/cron/process-queue/route.ts
// يُشغَّل كل دقيقة من Vercel Cron
// ════════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { processQueue, triggerScheduledCampaigns } from "@/lib/queue";

export const maxDuration = 60; // Vercel: max execution time (seconds)
export const dynamic     = "force-dynamic";

export async function GET(req: NextRequest) {
  // ── Security: تحقق من Vercel Cron Secret ─────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log(`[CRON] process-queue started at ${new Date().toISOString()}`);

  try {
    // ── Step 1: فعّل الحملات المجدولة التي حان وقتها ─────────────────────
    const triggered = await triggerScheduledCampaigns();
    if (triggered > 0) {
      console.log(`[CRON] Triggered ${triggered} scheduled campaigns`);
    }

    // ── Step 2: شغّل الـ Queue Processor ─────────────────────────────────
    const result = await processQueue();

    const duration = Date.now() - startTime;
    console.log(`[CRON] Done in ${duration}ms:`, result);

    return NextResponse.json({
      ok:        true,
      triggered,
      result,
      durationMs: duration,
      timestamp:  new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("[CRON] process-queue error:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}