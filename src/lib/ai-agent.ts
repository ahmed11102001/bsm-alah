// src/lib/ai-agent.ts
// Unified AI Agent - supports Gemini and OpenAI

export interface AgentContext {
  brandName?: string | null;
  businessDesc?: string | null;
  productsInfo?: string | null;
  pricingInfo?: string | null;
  workingHours?: string | null;
  tone?: string | null;
  systemPrompt?: string | null;
}

export interface AgentResult {
  ok: boolean;
  reply?: string;
  offTopic?: boolean;
  error?: string;
}

function buildSystemPrompt(ctx: AgentContext): string {
  const toneMap: Record<string, string> = {
    friendly: "friendly and helpful",
    formal: "formal and professional",
    egyptian: "Egyptian Arabic style",
  };

  const toneLabel = toneMap[ctx.tone ?? "friendly"] ?? toneMap.friendly;
  const lines: string[] = [
    `You are a smart assistant${ctx.brandName ? ` for \"${ctx.brandName}\"` : ""}.`,
  ];

  if (ctx.businessDesc?.trim()) lines.push(`\nBusiness: ${ctx.businessDesc}`);
  if (ctx.productsInfo?.trim()) lines.push(`\nProducts and services:\n${ctx.productsInfo}`);
  if (ctx.pricingInfo?.trim()) lines.push(`\nPricing:\n${ctx.pricingInfo}`);
  if (ctx.workingHours?.trim()) lines.push(`\nWorking hours: ${ctx.workingHours}`);
  if (ctx.systemPrompt?.trim()) lines.push(`\n-- Extra instructions --\n${ctx.systemPrompt}`);

  lines.push(
    "",
    "-- Reply rules --",
    `- Always reply in a ${toneLabel} tone.`,
    "- Keep replies short and direct (max 3 lines).",
    "- Do not invent prices or facts not present in context.",
    "- If question is fully off-topic, reply exactly: __OFF_TOPIC__",
    "- Do not mention that you are AI.",
  );

  return lines.join("\n");
}

async function callGemini(message: string, ctx: AgentContext): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is missing" };

  const systemPrompt = buildSystemPrompt(ctx);
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const modelsToTry = [
    configuredModel,
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
  ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

  try {
    for (const model of modelsToTry) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: message }] }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.4, topP: 0.8 },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
            ],
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("[AI-AGENT/GEMINI] Error:", res.status, { model, err });
        if (res.status === 404) continue;
        return { ok: false, error: `Gemini error ${res.status}` };
      }

      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text.trim()) return { ok: false, error: "Empty response from Gemini" };
      if (text.trim() === "__OFF_TOPIC__") return { ok: true, offTopic: true };
      return { ok: true, reply: text.trim() };
    }

    return { ok: false, error: "No supported Gemini model found" };
  } catch (err: any) {
    console.error("[AI-AGENT/GEMINI] Network error:", err);
    return { ok: false, error: err.message ?? "Network error" };
  }
}

async function callOpenAI(message: string, ctx: AgentContext): Promise<AgentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is missing" };

  const systemPrompt = buildSystemPrompt(ctx);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
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
    if (!text.trim()) return { ok: false, error: "Empty response from OpenAI" };
    if (text.trim() === "__OFF_TOPIC__") return { ok: true, offTopic: true };
    return { ok: true, reply: text.trim() };
  } catch (err: any) {
    console.error("[AI-AGENT/OPENAI] Network error:", err);
    return { ok: false, error: err.message ?? "Network error" };
  }
}

export async function getAIReply(
  message: string,
  ctx: AgentContext,
  provider: "gemini" | "openai" = "gemini",
): Promise<AgentResult> {
  if (provider === "openai") return callOpenAI(message, ctx);
  return callGemini(message, ctx);
}
