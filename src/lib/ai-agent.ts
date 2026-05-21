// src/lib/ai-agent.ts
// ─── AI Sales Agent — يدعم Gemini و OpenAI ───────────────────────────────────
//
// التغييرات عن النسخة القديمة:
//   1. بياخد تاريخ المحادثة كاملاً (مش رسالة واحدة) → يتذكر السياق
//   2. System Prompt موجّه للبيع لعملاء البراند (مش FAQ بس)
//   3. بيرجع JSON منظم { reply, action } بدل نص عادي
//   4. كل براند معزول تماماً — الـ context بييجي من إعداداته هو بس

// ─── Types ────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";

export interface AgentContext {
  brandName?:    string | null;
  businessDesc?: string | null;
  productsInfo?: string | null;
  pricingInfo?:  string | null;
  workingHours?: string | null;
  tone?:         string | null;
  systemPrompt?: string | null;
  userId?:       string | null;
}

// رسالة واحدة في تاريخ المحادثة
export interface ConversationMessage {
  role:    "user" | "assistant";
  content: string;
}

export interface AgentResult {
  ok:       boolean;
  reply?:   string;
  action?:  "handoff" | null;
  error?:   string;
  offTopic?: boolean;
  tokensUsed?: number;   // ← إجمالي التوكن المستهلكة (input + output)
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: AgentContext): string {
  const toneMap: Record<string, string> = {
    friendly: "ودود ومساعد",
    formal:   "رسمي واحترافي",
    egyptian: "عامية مصرية خفيفة",
  };
  const toneLabel = toneMap[ctx.tone ?? "friendly"] ?? toneMap.friendly;

  const lines: string[] = [];

  lines.push(
    `أنت مساعد مبيعات ذكي${ctx.brandName ? ` لـ "${ctx.brandName}"` : ""}.`,
    `مهمتك الأساسية: تفهم احتياج العميل وتساعده يوصل للمنتج أو الخدمة المناسبة له.`,
    "",
  );

  if (ctx.businessDesc?.trim())
    lines.push(`── عن البيزنس ──\n${ctx.businessDesc.trim()}`, "");

  if (ctx.productsInfo?.trim())
    lines.push(`── المنتجات والخدمات ──\n${ctx.productsInfo.trim()}`, "");

  if (ctx.pricingInfo?.trim())
    lines.push(`── الأسعار ──\n${ctx.pricingInfo.trim()}`, "");

  if (ctx.workingHours?.trim())
    lines.push(`── ساعات العمل ──\n${ctx.workingHours.trim()}`, "");

  if (ctx.systemPrompt?.trim())
    lines.push(`── تعليمات إضافية ──\n${ctx.systemPrompt.trim()}`, "");

  lines.push(
    "── قواعد الرد ──",
    `- تكلم بأسلوب ${toneLabel}.`,
    "- ردودك قصيرة ومباشرة (3 سطور بحد أقصى).",
    "- لا تخترع أسعاراً أو معلومات مش موجودة في السياق أعلاه.",
    "- لا تذكر إنك AI أو مساعد آلي.",
    "- لو العميل سأل عن منتج مش موجود في قائمتك، قوله بأدب إنه مش متاح.",
    "- لو الموضوع خرج تماماً عن نطاق البيزنس أو العميل محتاج دعم بشري متخصص، حدد action: handoff.",
    "",
    "── صيغة الرد المطلوبة ──",
    "ردّ دايماً بـ JSON صحيح فقط، بدون أي نص خارجه:",
    `{`,
    `  "reply": "نص الرد للعميل",`,
    `  "action": null`,
    `}`,
    "",
    `قيم action المتاحة:`,
    `  null     → رد عادي`,
    `  "handoff" → حوّل للبشر (استخدمه لو الموضوع تقيل أو العميل محتاج متخصص)`,
  );

  return lines.join("\n");
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function callGemini(
  messages: ConversationMessage[],
  ctx: AgentContext,
): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is missing" };

  const systemPrompt   = buildSystemPrompt(ctx);
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const modelsToTry = [
    configuredModel,
    "gemini-2.5-flash-lite",   // ← الأسرع والأرخص (خلف 2.0 flash)
    "gemini-2.5-flash",
    "gemini-1.5-flash-latest",
  ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

  // Gemini بيستخدم "model" مش "assistant"
  const contents = messages.map((m) => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    for (const model of modelsToTry) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              maxOutputTokens: 400,
              temperature:     0.4,
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
        const err = await res.text();
        console.error("[AI-AGENT/GEMINI] Error:", res.status, { model, err });
        if (res.status === 404) continue;
        return { ok: false, error: `Gemini error ${res.status}` };
      }

      const data = await res.json();
      const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!raw.trim()) return { ok: false, error: "Empty response from Gemini" };
      const tokensUsed: number =
        (data?.usageMetadata?.promptTokenCount ?? 0) +
        (data?.usageMetadata?.candidatesTokenCount ?? 0);
      const parsed = parseAgentJSON(raw);
      return { ...parsed, tokensUsed };
    }

    return { ok: false, error: "No supported Gemini model found" };
  } catch (err: any) {
    Sentry.captureException(err, {
      tags: { component: "ai-agent" },
      extra: { userId: ctx.userId ?? null, provider: "gemini" },
    });
    console.error("[AI-AGENT/GEMINI] Network error:", err);
    return { ok: false, error: err.message ?? "Network error" };
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAI(
  messages: ConversationMessage[],
  ctx: AgentContext,
): Promise<AgentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is missing" };

  const systemPrompt = buildSystemPrompt(ctx);

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        max_tokens:  400,
        temperature: 0.4,
        messages:    chatMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[AI-AGENT/OPENAI] Error:", res.status, err);
      return { ok: false, error: `OpenAI error ${res.status}` };
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    if (!raw.trim()) return { ok: false, error: "Empty response from OpenAI" };
    const tokensUsed: number = data?.usage?.total_tokens ?? 0;
    const parsed = parseAgentJSON(raw);
    return { ...parsed, tokensUsed };
  } catch (err: any) {
    Sentry.captureException(err, {
      tags: { component: "ai-agent" },
      extra: { userId: ctx.userId ?? null, provider: "openai" },
    });
    console.error("[AI-AGENT/OPENAI] Network error:", err);
    return { ok: false, error: err.message ?? "Network error" };
  }
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────
// بيعالج لو الـ AI حاط الـ JSON جوه ```json ... ``` أو في نص إضافي

function parseAgentJSON(raw: string): AgentResult {
  try {
    // نظّف أي markdown code fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const offTopic = parsed.offTopic === true;
    const reply =
      typeof parsed.reply === "string" ? parsed.reply.trim() : null;
    const action = parsed.action === "handoff" ? "handoff" : null;

    if (!reply && !offTopic)
      return { ok: false, error: "reply field missing in AI response" };

    return { ok: true, reply: reply ?? "", action, offTopic: offTopic || undefined };
  } catch {
    // لو الـ AI فشل يرجع JSON صح، نعامل الـ raw كـ reply عادي
    const fallback = raw.trim();
    if (fallback) return { ok: true, reply: fallback, action: null };
    return { ok: false, error: "Failed to parse AI response as JSON" };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAIReply(
  messages:  ConversationMessage[],
  ctx:       AgentContext,
  provider:  "gemini" | "openai" = "gemini",
): Promise<AgentResult> {
  if (provider === "openai") return callOpenAI(messages, ctx);
  return callGemini(messages, ctx);
}