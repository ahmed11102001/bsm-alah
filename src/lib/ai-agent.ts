// src/lib/ai-agent.ts
// ─── Unified AI Agent — يدعم Gemini و OpenAI ─────────────────────────────────

export interface AgentContext {
  brandName?:    string | null;
  businessDesc?: string | null;
  productsInfo?: string | null;
  pricingInfo?:  string | null;
  workingHours?: string | null;
  tone?:         string | null;
  systemPrompt?: string | null; // custom system prompt (اختياري — يضاف فوق Brand context)
}

export interface AgentResult {
  ok:        boolean;
  reply?:    string;
  offTopic?: boolean;
  error?:    string;
}

// ─── Build System Prompt ──────────────────────────────────────────────────────
function buildSystemPrompt(ctx: AgentContext): string {
  const toneMap: Record<string, string> = {
    friendly: "ودود وقريب من العميل",
    formal:   "رسمي ومهني",
    egyptian: "بالعامية المصرية بشكل طبيعي",
  };
  const toneLabel = toneMap[ctx.tone ?? "friendly"] ?? toneMap.friendly;

  const lines: string[] = [
    `أنت مساعد ذكي${ctx.brandName ? ` لـ "${ctx.brandName}"` : ""}.`,
  ];

  if (ctx.businessDesc?.trim())
    lines.push(`\nنشاطنا: ${ctx.businessDesc}`);

  if (ctx.productsInfo?.trim())
    lines.push(`\nمنتجاتنا وخدماتنا:\n${ctx.productsInfo}`);

  if (ctx.pricingInfo?.trim())
    lines.push(`\nالأسعار:\n${ctx.pricingInfo}`);

  if (ctx.workingHours?.trim())
    lines.push(`\nساعات العمل: ${ctx.workingHours}`);

  if (ctx.systemPrompt?.trim())
    lines.push(`\n── تعليمات إضافية ──\n${ctx.systemPrompt}`);

  lines.push(
    "",
    "── قواعد الرد ──",
    `- اردد دائماً بأسلوب ${toneLabel}.`,
    "- ردودك مختصرة ومباشرة — 3 أسطر كحد أقصى.",
    "- لا تخترع أسعاراً أو معلومات غير موجودة في السياق أعلاه.",
    "- إذا كان السؤال خارج نطاق خدماتنا تماماً، رد بالضبط بهذه الجملة فقط: __OFF_TOPIC__",
    "- لا تذكر أنك AI — أنت مساعد البراند فقط.",
  );

  return lines.join("\n");
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(message: string, ctx: AgentContext): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY غير مضبوط" };

  const systemPrompt = buildSystemPrompt(ctx);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4, topP: 0.8 },
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
      const err = await res.text();
      console.error("[AI-AGENT/GEMINI] Error:", res.status, err);
      return { ok: false, error: `Gemini error ${res.status}` };
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text.trim()) return { ok: false, error: "رد فارغ من Gemini" };
    if (text.trim() === "__OFF_TOPIC__") return { ok: true, offTopic: true };
    return { ok: true, reply: text.trim() };

  } catch (err: any) {
    console.error("[AI-AGENT/GEMINI] Network error:", err);
    return { ok: false, error: err.message ?? "خطأ في الشبكة" };
  }
}

// ─── OpenAI (ChatGPT) ─────────────────────────────────────────────────────────
async function callOpenAI(message: string, ctx: AgentContext): Promise<AgentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY غير مضبوط" };

  const systemPrompt = buildSystemPrompt(ctx);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini", // سريع ورخيص وكفاءة عالية
        max_tokens:  300,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: message },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[AI-AGENT/OPENAI] Error:", res.status, err);
      return { ok: false, error: `OpenAI error ${res.status}` };
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) return { ok: false, error: "رد فارغ من OpenAI" };
    if (text.trim() === "__OFF_TOPIC__") return { ok: true, offTopic: true };
    return { ok: true, reply: text.trim() };

  } catch (err: any) {
    console.error("[AI-AGENT/OPENAI] Network error:", err);
    return { ok: false, error: err.message ?? "خطأ في الشبكة" };
  }
}

// ─── Unified Entry Point ──────────────────────────────────────────────────────
export async function getAIReply(
  message:  string,
  ctx:      AgentContext,
  provider: "gemini" | "openai" = "gemini",
): Promise<AgentResult> {
  if (provider === "openai") return callOpenAI(message, ctx);
  return callGemini(message, ctx);
}