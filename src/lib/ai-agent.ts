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
import type { RelevantProduct } from "@/lib/product-search";
import { AIAgentResponseSchema } from "@/lib/schemas";

export interface AgentContext {
  brandName?: string | null;
  businessDesc?: string | null;
  productsInfo?: string | null;
  pricingInfo?: string | null;
  workingHours?: string | null;
  tone?: string | null;
  systemPrompt?: string | null;
  languageMode?: string | null;
  websiteUrl?: string | null;
  websiteButtonText?: string | null;
  userId?: string | null;

  // ── NEW: Structured Knowledge Sources ──
  relevantProducts?: RelevantProduct[];
  faqs?: { question: string; answer: string }[];
  policies?: { type: string; title: string; content: string }[];
  guardrails?: {
    noInventPrices?: boolean;
    noInventProducts?: boolean;
    noMentionCompetitors?: boolean;
    noSharePersonal?: boolean;
    strictKnowledgeOnly?: boolean;
    alwaysHandoffComplaints?: boolean;
    maxReplyLines?: number;
    customRules?: string | null;
  };
}

// رسالة واحدة في تاريخ المحادثة
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string; // ← جديد: لو الرسالة فيها صورة (OpenAI Vision بس، Gemini بيتعامل لوحده)
}

export interface AgentResult {
  ok: boolean;
  reply?: string;
  action?: "handoff" | null;
  reason?: string | null;
  priority?: "normal" | "high";
  error?: string;
  offTopic?: boolean;
  tokensUsed?: number;   // ← إجمالي التوكن المستهلكة (input + output)
  productIds?: string[]; // ← المنتجات المقترحة/المذكورة من الـ context (أقصى 3)
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function withUtm(url: string): string {
  const utm = "utm_source=whatsapp_ai&utm_medium=chat&utm_campaign=ai_assistant";
  return url.includes("?") ? `${url}&${utm}` : `${url}?${utm}`;
}

function buildSystemPrompt(ctx: AgentContext): string {
  const toneMap: Record<string, string> = {
    friendly: "ودود ومساعد",
    formal: "رسمي واحترافي",
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

  // ── 1) Product Knowledge (Structured products first, fallback to free-text) ──
  if (ctx.relevantProducts && ctx.relevantProducts.length > 0) {
    lines.push("── المنتجات المتاحة حاليًا (الكتالوج المتصل) ──");
    ctx.relevantProducts.forEach((p, idx) => {
      const priceStr = p.price != null ? `${p.price} ${p.currency || "EGP"}` : "غير محدد";
      const stockStr = p.stock != null ? `(المخزون: ${p.stock})` : "";
      const descStr = p.description ? ` - ${p.description.substring(0, 150)}` : "";
      const urlStr = p.url ? ` [رابط: ${p.url}]` : "";
      lines.push(`${idx + 1}. [ID: ${p.id}] ${p.name} - السعر: ${priceStr} ${stockStr}${descStr}${urlStr}`);
    });
    lines.push("");
  } else {
    if (ctx.productsInfo?.trim())
      lines.push(`── المنتجات والخدمات ──\n${ctx.productsInfo.trim()}`, "");
    if (ctx.pricingInfo?.trim())
      lines.push(`── الأسعار ──\n${ctx.pricingInfo.trim()}`, "");
  }

  // ── 2) FAQs ──
  if (ctx.faqs && ctx.faqs.length > 0) {
    lines.push("── الأسئلة الشائعة والإجابات ──");
    ctx.faqs.forEach((faq) => {
      lines.push(`س: ${faq.question}\nج: ${faq.answer}`);
    });
    lines.push("");
  }

  // ── 3) Brand Policies ──
  if (ctx.policies && ctx.policies.length > 0) {
    lines.push("── سياسات البراند ──");
    ctx.policies.forEach((policy) => {
      lines.push(`- ${policy.title}: ${policy.content}`);
    });
    lines.push("");
  }

  if (ctx.workingHours?.trim())
    lines.push(`── ساعات العمل ──\n${ctx.workingHours.trim()}`, "");

  if (ctx.systemPrompt?.trim())
    lines.push(`── تعليمات إضافية ──\n${ctx.systemPrompt.trim()}`, "");

  const languageInstruction =
    ctx.languageMode === "ar"
      ? "ردّ دائمًا بالعربية، بغض النظر عن لغة رسالة العميل."
      : ctx.languageMode === "en"
      ? "Reply only in English, regardless of the customer's message language."
      : "ردّ بنفس لغة آخر رسالة من العميل (عربي أو إنجليزي) — حتى لو باقي الإعدادات هنا مكتوبة عربي.";

  lines.push(`── اللغة ──`, languageInstruction, "");

  if (ctx.websiteUrl?.trim()) {
    const websiteUrl = withUtm(ctx.websiteUrl.trim());
    lines.push(
      `── رابط الموقع ──`,
      `لو العميل عايز يتصفح المنتجات أو يشتري، ابعتله الرابط ده: ${websiteUrl}`,
      "استخدم الرابط ده بس لما يكون مناسب فعليًا للسياق (العميل قال عايز يشوف/يشتري) — متحطوش في كل رسالة.",
      ctx.websiteButtonText?.trim() ? `ممكن تقول للعميل يدوس "${ctx.websiteButtonText.trim()}" أو حاجة شبهها.` : "",
      "",
    );
  }

  // ── 4) Guardrails & Rules ──
  const g = ctx.guardrails;
  const maxLines = g?.maxReplyLines ?? 3;

  lines.push(
    "── قواعد الرد ──",
    `- تكلم بأسلوب ${toneLabel}.`,
    `- ردودك قصيرة ومباشرة (${maxLines} سطور بحد أقصى).`,
  );

  if (g?.strictKnowledgeOnly ?? true) {
    lines.push("- إذا لم تكن الإجابة موجودة بوضوح في الكتالوج أو الأسئلة الشائعة أو السياسات المتاحة أعلاه، لا تخمّن ولا تبتكر إجابة من عندك إطلاقاً. أبلغ العميل بأدب أن المعلومة غير متوفرة حالياً أو حوّل الطلب لموظف خدمة العملاء.");
  }
  if (g?.noInventPrices ?? true) {
    lines.push("- لا تخترع أسعاراً أو معلومات غير موجودة في السياق أعلاه.");
  }
  if (g?.noInventProducts ?? true) {
    lines.push("- لو العميل سأل عن منتج مش موجود في قائمتك، قوله بأدب إنه مش متاح ولا تخترع منتجات.");
  }
  if (g?.noMentionCompetitors ?? true) {
    lines.push("- لا تذكر أو تقارن نفسك بأي منافسين إطلاقاً.");
  }
  if (g?.noSharePersonal ?? true) {
    lines.push("- لا تلمس أو تطلب أو تطلع العميل على أي بيانات شخصية أو حساسة.");
  }
  lines.push("- لا تذكر إنك AI أو مساعد آلي.");
  lines.push("- لو العميل بعت صورة، حللها واربطها باحتياجه (مثلاً منتج، فاتورة، مشكلة) ورد عليه بناءً عليها.");

  if (g?.alwaysHandoffComplaints ?? true) {
    lines.push("- لو العميل قدم شكوى صريحة، طلب استرجاع مبلغ، أو كان غاضباً جداً، حدد action: handoff.");
  } else {
    lines.push("- لو الموضوع خرج تماماً عن نطاق البيزنس أو العميل محتاج دعم بشري متخصص، حدد action: handoff.");
  }

  if (g?.customRules?.trim()) {
    lines.push(`- قواعد مخصصة: ${g.customRules.trim()}`);
  }

  lines.push(
    "",
    "── صيغة الرد المطلوبة ──",
    "ردّ دايماً بـ JSON صحيح فقط، بدون أي نص خارجه:",
    `{`,
    `  "reply": "نص الرد للعميل",`,
    `  "action": null,`,
    `  "reason": null,`,
    `  "priority": null,`,
    `  "product_ids": []`,
    `}`,
    "",
    `قيم action المتاحة:`,
    `  null      → رد عادي`,
    `  "handoff" → حوّل للبشر (استخدمه لو الموضوع تقيل أو العميل محتاج متخصص أو طلب استرجاع/شكوى)`,
    "",
    `لو action = "handoff"، لازم تملى:`,
    `  "reason": سبب مختصر وواضح بالعربي أو الإنجليزي (مثال: "العميل طلب استرجاع مبلغ")`,
    `  "priority": "high" لو عاجل (شكوى/غضب واضح)، أو "normal" غير كده`,
    "",
    `لو ردك بيتكلم عن منتج معين أو أكتر من قائمة "المنتجات المتاحة حالياً" أعلاه، حط الـ IDs بتاعتها في قائمة "product_ids" (بحد أقصى 3 منتجات). استخدم الـ ID الحقيقي المكتوب في القائمة فقط!`
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

  const systemPrompt = buildSystemPrompt(ctx);
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const modelsToTry = [
    configuredModel,
    "gemini-2.5-flash-lite",   // ← الأسرع والأرخص (خلف 2.0 flash)
    "gemini-2.5-flash",
    "gemini-1.5-flash-latest",
  ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

  // Gemini بيستخدم "model" مش "assistant"
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    for (const model of modelsToTry) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              maxOutputTokens: 400,
              temperature: 0.4,
              topP: 0.8,
            },
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
    ...messages.map((m) => {
      // لو الرسالة فيها صورة، ابعتها بصيغة Vision (content كـ array)
      if (m.imageUrl && m.role === "user") {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content || "حلل الصورة دي ورد على العميل" },
            { type: "image_url", image_url: { url: m.imageUrl } },
          ],
        };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        temperature: 0.4,
        messages: chatMessages,
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

    const parsedJson = JSON.parse(cleaned);
    const zodResult = AIAgentResponseSchema.safeParse(parsedJson);

    if (!zodResult.success) {
      // Fallback: If JSON schema validation fails, try extracting string reply or fallback
      const replyFallback = typeof parsedJson?.reply === "string" ? parsedJson.reply.trim() : null;
      if (replyFallback) return { ok: true, reply: replyFallback, action: null };
      return { ok: false, error: "Zod validation failed for AI response JSON" };
    }

    const data = zodResult.data;
    const offTopic = data.offTopic === true;
    const reply = data.reply?.trim() ?? null;
    const action = data.action === "handoff" ? "handoff" : null;
    const reason = data.reason?.trim() ?? null;
    const priority = data.priority === "high" ? "high" : "normal";

    let productIds: string[] | undefined;
    if (Array.isArray(data.product_ids)) {
      const ids = data.product_ids
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
        .slice(0, 3);
      productIds = ids.length ? ids : undefined;
    }

    if (!reply && !offTopic)
      return { ok: false, error: "reply field missing in AI response" };

    return {
      ok: true,
      reply: reply ?? "",
      action,
      reason,
      priority,
      offTopic: offTopic || undefined,
      productIds,
    };
  } catch {
    // لو الـ AI فشل يرجع JSON صح، نعامل الـ raw كـ reply عادي
    const fallback = raw.trim();
    if (fallback) return { ok: true, reply: fallback, action: null };
    return { ok: false, error: "Failed to parse AI response as JSON" };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAIReply(
  messages: ConversationMessage[],
  ctx: AgentContext,
  provider: "gemini" | "openai" = "gemini",
): Promise<AgentResult> {
  if (provider === "openai") return callOpenAI(messages, ctx);
  return callGemini(messages, ctx);
}
