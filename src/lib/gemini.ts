// src/lib/gemini.ts
// ─── Gemini 1.5 Flash — Smart Reply Engine ───────────────────────────────────
// يُستدعى فقط لو:
//   1. مفيش keyword match
//   2. المستخدم عنده بيانات البراند (businessDesc)
//   3. الباقة تسمح بالـ AI (starter+)

export interface BrandContext {
  brandName?:         string | null;
  businessDesc:       string;
  productsInfo?:      string | null;
  pricingInfo?:       string | null;
  workingHours?:      string | null;
  aiTone:             string;
  extraInstructions?: string | null;
}

export interface GeminiResult {
  ok:      boolean;
  reply?:  string;
  error?:  string;
  offTopic?: boolean; // رسالة خارج نطاق البراند
}

// ─── بناء الـ System Prompt من بيانات البراند ─────────────────────────────────
function buildSystemPrompt(ctx: BrandContext): string {
  const toneMap: Record<string, string> = {
    friendly: "ودود وقريب من العميل",
    formal:   "رسمي ومهني",
    egyptian: "بالعامية المصرية بشكل طبيعي",
  };
  const toneLabel = toneMap[ctx.aiTone] ?? toneMap.friendly;

  const lines: string[] = [
    `أنت مساعد ذكي${ctx.brandName ? ` لـ "${ctx.brandName}"` : ""}.`,
    "",
    `نشاطنا: ${ctx.businessDesc}`,
  ];

  if (ctx.productsInfo?.trim())
    lines.push(`\nمنتجاتنا وخدماتنا:\n${ctx.productsInfo}`);

  if (ctx.pricingInfo?.trim())
    lines.push(`\nالأسعار:\n${ctx.pricingInfo}`);

  if (ctx.workingHours?.trim())
    lines.push(`\nساعات العمل: ${ctx.workingHours}`);

  lines.push(
    "",
    "── قواعد الرد ──",
    `- اردد دائماً بأسلوب ${toneLabel}.`,
    "- ردودك مختصرة ومباشرة — 3 أسطر كحد أقصى.",
    "- لا تخترع أسعاراً أو معلومات غير موجودة في السياق أعلاه.",
    `- إذا كان السؤال خارج نطاق خدماتنا تماماً، رد بالضبط بهذه الجملة فقط: __OFF_TOPIC__`,
    "- لا تذكر أنك AI أو Gemini — أنت مساعد البراند فقط.",
  );

  if (ctx.extraInstructions?.trim())
    lines.push(`\n── تعليمات خاصة لهذه القاعدة ──\n${ctx.extraInstructions}`);

  return lines.join("\n");
}

// ─── Core call ────────────────────────────────────────────────────────────────
export async function getSmartReply(
  incomingMessage: string,
  ctx: BrandContext,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY غير مضبوط" };

  const systemPrompt = buildSystemPrompt(ctx);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: incomingMessage }] }],
          generationConfig: {
            maxOutputTokens: 300,   // ردود قصيرة — مش روايات
            temperature:     0.4,   // ثابت نسبياً — مش خيالي
            topP:            0.8,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[GEMINI] API error:", res.status, errBody);
      return { ok: false, error: `Gemini error ${res.status}` };
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text.trim()) return { ok: false, error: "رد فارغ من Gemini" };

    // خارج نطاق البراند
    if (text.trim() === "__OFF_TOPIC__")
      return { ok: true, offTopic: true };

    return { ok: true, reply: text.trim() };

  } catch (err: any) {
    console.error("[GEMINI] Network error:", err);
    return { ok: false, error: err.message ?? "خطأ في الشبكة" };
  }
}