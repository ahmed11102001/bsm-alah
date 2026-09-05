// src/lib/openai-ads-capi.ts
// ─── OpenAI (ChatGPT) Ads Conversions API (server-side) ─────────────────────
// مبني على الـ curl الرسمي من تاب Conversions API لحدث subscription_created.
// ملحوظات:
// - validate_only مربوط بـ NODE_ENV: في التطوير بيبعت كـ test بس، في الإنتاج حقيقي.
//   راجع القيمة بنفسك بعد أول نشر فعلي قبل الاعتماد على أرقام التقارير.
// - source_url إجباري في القالب الرسمي — ابعت رابط صفحة الـ checkout بتاعت اليوزر.
// - القالب الرسمي ما فيهوش قيمة/عملة/بيانات مطابقة — بس { type: "plan_enrollment" }.
//   ما تضيفش حقول من تخمينك: فشل حدث واحد بيرفض الـ batch كله حسب التوثيق.

export async function sendOpenAIPurchaseEvent(params: {
  eventId: string;
  sourceUrl: string; // رابط صفحة الـ checkout أو أي صفحة تمثل مصدر التحويل
}): Promise<void> {
  const pixelId = process.env.OPENAI_ADS_PIXEL_ID;
  const apiKey = process.env.OPENAI_ADS_API_KEY;
  if (!pixelId || !apiKey) {
    console.warn("[OpenAI Ads CAPI] Skipped: OPENAI_ADS_PIXEL_ID or OPENAI_ADS_API_KEY not set");
    return;
  }

  await fetch(`https://bzr.openai.com/v1/events?pid=${pixelId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      validate_only: process.env.NODE_ENV !== "production",
      events: [
        {
          id: params.eventId,
          type: "subscription_created",
          timestamp_ms: Date.now(),
          source_url: params.sourceUrl,
          action_source: "web",
          data: {
            type: "plan_enrollment",
          },
        },
      ],
    }),
  }).catch((e) => console.error("[OpenAI Ads CAPI] Failed:", e));
}
