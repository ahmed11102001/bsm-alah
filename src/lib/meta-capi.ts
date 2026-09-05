// src/lib/meta-capi.ts
// ─── Meta Conversions API (server-side) ─────────────────────────────────────
// للدفع اليدوي: لحظة الموافقة الحقيقية بتحصل والأدمن هو اللي فاتح المتصفح،
// فمفيش Pixel client-side يقدر يسجّلها — لازم تتبعت من السيرفر مباشرة.

import { createHash } from "crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendMetaPurchaseEvent(params: {
  userId: string;
  email: string;
  phone?: string | null;
  value: number;
  currency: string;
  contentName: string;
  clickId?: string | null; // fbc المخزّن وقت التسجيل (wani_fbc)
  testEventCode?: string; // للاختبار فقط — بيظهر في Test Events tab
}): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn("[Meta CAPI] Skipped: META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set");
    return;
  }

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          em: [sha256(params.email)],
          ...(params.phone ? { ph: [sha256(params.phone.replace(/\D/g, ""))] } : {}),
          ...(params.clickId ? { fbc: params.clickId } : {}),
        },
        custom_data: {
          value: params.value,
          currency: params.currency,
          content_name: params.contentName,
        },
      },
    ],
  };
  if (params.testEventCode) body.test_event_code = params.testEventCode;

  await fetch(
    `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  ).catch((e) => console.error("[Meta CAPI] Failed:", e));
}
