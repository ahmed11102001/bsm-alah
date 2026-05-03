// src/app/api/cron/process-queue/route.ts
// يُشغَّل من Inngest أو أي scheduler خارجي
import { NextRequest, NextResponse } from "next/server";
import { processQueue, triggerScheduledCampaigns } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const triggered = await triggerScheduledCampaigns();

    const result = await processQueue();

    return NextResponse.json({
      ok:         true,
      triggered,
      result,
      durationMs: Date.now() - startTime,
      timestamp:  new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("[QUEUE] process-queue error:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}