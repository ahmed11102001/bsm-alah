// src/lib/ai-agent-training.ts
import prisma from "@/lib/prisma";
import {
  TrainingRuleExtractionSchema,
  type TrainingRuleExtractionOutput,
  PolicyTypeEnum,
} from "@/lib/schemas";
import { PolicyType } from "@prisma/client";

export interface ExtractionInput {
  feedback: string;
  contextMessages?: { role: "user" | "assistant"; content: string }[];
  existingGuardrails?: string | null;
}

export function formatRuleSummary(data: TrainingRuleExtractionOutput): string {
  switch (data.type) {
    case "faq":
      return `س: ${data.question}\nج: ${data.answer}`;
    case "customer_issue":
      return `المشكلة: ${data.problem}\nالحل: ${data.resolution}`;
    case "policy":
      return `سياسة (${data.policyType}): ${data.title}\n${data.content}`;
    case "guardrail":
      return data.content;
    case "sales_behavior":
      return `سلوك البيع: ضبط ${data.field} إلى ${String(data.value)}`;
    default:
      return JSON.stringify(data);
  }
}

/**
 * دالة استخراج القواعد المقترحة من تعليق وسياق المحادثة عبر LLM
 */
export async function extractTrainingRule(
  input: ExtractionInput
): Promise<
  | { ok: true; data: TrainingRuleExtractionOutput; model: string; summary: string }
  | { ok: false; error: string }
> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!geminiApiKey && !openaiApiKey) {
    return { ok: false, error: "لا يوجد مفتاح API متوفر لـ Gemini أو OpenAI" };
  }

  const systemInstruction = `أنت خبير تحليل وتدريب وكلاء الذكاء الاصطناعي (AI Agent Training Analyst).
مهمتك: قراءة تعليق/ملاحظة صاحب المتجر على رد الإيجنت (أو توجيهه العام)، وفهم السياق السابق للمحادثة، وتحويل هذا التعليق إلى قاعدة منظمة ومحددة (Structured Rule) جاهزة للحفظ في النظام.

أنواع القواعد المتاحة (يجب اختيار نوع واحد بدقة):
1. "faq" (سؤال وجواب متكرر):
   - استخدمه إذا كان التعليق يوضح إجابة محددة لسؤال يسأله العملاء.
   - يتطلب: { type: "faq", question: string, answer: string, confidence: number, clarificationNeeded?: string }

2. "customer_issue" (مشكلة وحل في خدمة العملاء):
   - استخدمه إذا كان التعليق يتعامل مع مشكلة تواجه العميل (مثل تأخر الشحن، تلف منتج، مشكلة دفع) وكيفية التعامل معها.
   - يتطلب: { type: "customer_issue", problem: string, resolution: string, confidence: number, clarificationNeeded?: string }

3. "policy" (سياسة متجر):
   - استخدمه إذا كان التعليق يحدد سياسة رسمية للمتجر (استرجاع، شحن، دفع، ضمان، خصوصية).
   - يتطلب: { type: "policy", title: string, content: string, policyType: "return_policy" | "shipping_policy" | "payment_policy" | "warranty_policy" | "privacy_policy" | "custom", confidence: number, clarificationNeeded?: string }

4. "guardrail" (قاعدة سلوك / حد صارم / أسلوب حديث):
   - استخدمه إذا كان التعليق يمنع سلوكاً معيناً، أو يلزم بأسلوب رد محدد، أو يضع قيداً عاماً (مثلاً: "لا تذكر أن التوصيل مجاني إلا لو تخطى 500 ج"، "لا تعرض منتجات نفدت").
   - يتطلب: { type: "guardrail", content: string, confidence: number, clarificationNeeded?: string }

5. "sales_behavior" (إعدادات استراتيجية المبيعات):
   - استخدمه إذا كان التعليق يتعلق بتفعيل أو تعطيل اقتراح البدائل، الأب سيل (Upsell)، الكروس سيل (CrossSell)، أو الخصومات، أو هدف البيع.
   - يتطلب: { type: "sales_behavior", field: "suggestAlternatives" | "suggestUpsell" | "suggestCrossSell" | "suggestDiscounts" | "maxSuggestedProducts" | "goal", value: boolean | number | string, confidence: number, clarificationNeeded?: string }

إرشادات هامة:
- استخرج الصياغة باحترافية ووضوح باللغة العربية.
- يجب أن تكون القيمة confidence رقماً بين 0 و 1 يعبر عن مدى وضوح تعليق المستخدم وثقتك في صحة الاستخراج.
- إذا كان التعليق غامضاً أو يحتاج تفاصيل ناقصة، ضع شرحاً موجزاً في clarificationNeeded ولكن حاول وضع أفضل تخمين للقاعدة مع تقليل الـ confidence.
- الرد يجب أن يكون JSON فقط دون أي كود Markdown (\`\`\`json) أو نصوص خارج الـ JSON.`;

  // بناء سياق المحادثة والتعليق
  const contextText =
    input.contextMessages && input.contextMessages.length > 0
      ? input.contextMessages
          .map(
            (m) =>
              `${m.role === "assistant" ? "الإيجنت (Assistant)" : "العميل (User)"}: ${m.content}`
          )
          .join("\n")
      : "لا يوجد سياق رسائل سابقة (تعليق مباشر).";

  const userPrompt = `── سياق آخر رسائل في المحادثة ──
${contextText}

── القواعد المخصصة الحالية (لتجنب التكرار إذا كانت موجودة) ──
${input.existingGuardrails?.trim() || "لا توجد قواعد مخصصة حالياً."}

── تعليق / توجيه صاحب المتجر ──
"${input.feedback.trim()}"

قم بتحليل التعليق والسياق واستخرج كائن JSON بالنوع والقاعدة المناسبة بدقة.`;

  // المحاولة عبر Gemini أولاً
  if (geminiApiKey) {
    const configuredModel = process.env.GEMINI_MODEL?.trim();
    const modelsToTry = [
      configuredModel,
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-2.5-flash",
    ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
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
          const errText = await res.text();
          console.error(`[AI-TRAINING/GEMINI] Error ${res.status} (${model}):`, errText);
          if (res.status === 404) continue;
          continue;
        }

        const resData = await res.json();
        const rawText: string = resData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (!rawText.trim()) continue;

        const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleanJson);
        const validated = TrainingRuleExtractionSchema.safeParse(parsed);

        if (validated.success) {
          return {
            ok: true,
            data: validated.data,
            model: `gemini:${model}`,
            summary: formatRuleSummary(validated.data),
          };
        } else {
          console.warn("[AI-TRAINING/GEMINI] Validation error:", validated.error);
        }
      } catch (err: any) {
        console.error(`[AI-TRAINING/GEMINI] Exception (${model}):`, err);
      }
    }
  }

  // Fallback to OpenAI if Gemini failed or OpenAI is configured
  if (openaiApiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content ?? "";
        const parsed = JSON.parse(content);
        const validated = TrainingRuleExtractionSchema.safeParse(parsed);
        if (validated.success) {
          return {
            ok: true,
            data: validated.data,
            model: "openai:gpt-4o-mini",
            summary: formatRuleSummary(validated.data),
          };
        }
      }
    } catch (err: any) {
      console.error("[AI-TRAINING/OPENAI] Exception:", err);
    }
  }

  return { ok: false, error: "تعذر استخراج القاعدة من التعليق بواسطة نموذج الذكاء الاصطناعي." };
}

/**
 * تطبيق قاعدة معتمدة على الجداول المستهدفة وتسجيل معرف السجل والجدول للـ Undo
 */
export async function applyTrainingRule(
  ruleId: string,
  userId: string,
  overrides?: Partial<TrainingRuleExtractionOutput>
): Promise<{ ok: true; appliedTable: string; appliedRecordId: string } | { ok: false; error: string }> {
  const rule = await prisma.agentTrainingRule.findFirst({
    where: { id: ruleId, userId },
  });

  if (!rule) {
    return { ok: false, error: "السجل التدريبي غير موجود" };
  }

  if (rule.status === "approved") {
    return { ok: false, error: "هذه القاعدة معتمدة ومطبقة بالفعل" };
  }

  const rawExtracted = (rule.extractedData as any) || {};
  const mergedData = { ...rawExtracted, ...(overrides || {}) };

  const parsedResult = TrainingRuleExtractionSchema.safeParse(mergedData);
  if (!parsedResult.success) {
    return {
      ok: false,
      error: `بيانات القاعدة غير صحيحة: ${parsedResult.error.issues[0]?.message || "خطأ في التحقق"}`,
    };
  }

  const ruleData = parsedResult.data;
  const summaryContent = formatRuleSummary(ruleData);

  try {
    const result = await prisma.$transaction(async (tx) => {
      let appliedTable = "";
      let appliedRecordId = "";

      switch (ruleData.type) {
        case "faq": {
          const faq = await tx.brandFAQ.create({
            data: {
              userId,
              question: ruleData.question.trim(),
              answer: ruleData.answer.trim(),
            },
          });
          appliedTable = "BrandFAQ";
          appliedRecordId = faq.id;
          break;
        }

        case "customer_issue": {
          const issue = await tx.customerIssue.create({
            data: {
              userId,
              problem: ruleData.problem.trim(),
              resolution: ruleData.resolution.trim(),
            },
          });
          appliedTable = "CustomerIssue";
          appliedRecordId = issue.id;
          break;
        }

        case "policy": {
          const policyTypeVal = ruleData.policyType as PolicyType;
          if (ruleData.existingPolicyId) {
            const existing = await tx.brandPolicy.findFirst({
              where: { id: ruleData.existingPolicyId, userId },
            });
            if (existing) {
              const updated = await tx.brandPolicy.update({
                where: { id: existing.id },
                data: {
                  title: ruleData.title.trim(),
                  content: ruleData.content.trim(),
                  type: policyTypeVal,
                },
              });
              appliedTable = "BrandPolicy";
              appliedRecordId = updated.id;
              break;
            }
          }

          const policy = await tx.brandPolicy.create({
            data: {
              userId,
              title: ruleData.title.trim(),
              content: ruleData.content.trim(),
              type: policyTypeVal,
            },
          });
          appliedTable = "BrandPolicy";
          appliedRecordId = policy.id;
          break;
        }

        case "guardrail": {
          const guardrail = await tx.aIGuardrail.upsert({
            where: { userId },
            create: {
              userId,
              customRules: `- ${ruleData.content.trim()}`,
            },
            update: {},
          });

          // إضافة كسطر منفصل يبدأ بـ "- "
          const currentRules = guardrail.customRules?.trim() || "";
          const newLine = `- ${ruleData.content.trim()}`;
          const updatedRules = currentRules
            ? `${currentRules}\n${newLine}`
            : newLine;

          const updatedGuardrail = await tx.aIGuardrail.update({
            where: { id: guardrail.id },
            data: { customRules: updatedRules },
          });

          appliedTable = "AIGuardrail";
          appliedRecordId = updatedGuardrail.id;
          break;
        }

        case "sales_behavior": {
          const field = ruleData.field;
          const value = ruleData.value;
          const updateData: any = {};
          updateData[field] = value;

          const settings = await tx.salesBehaviorSettings.upsert({
            where: { userId },
            create: {
              userId,
              ...updateData,
            },
            update: updateData,
          });

          appliedTable = "SalesBehaviorSettings";
          appliedRecordId = settings.id;
          break;
        }
      }

      await tx.agentTrainingRule.update({
        where: { id: rule.id },
        data: {
          status: "approved",
          type: ruleData.type,
          content: summaryContent,
          extractedData: ruleData as any,
          appliedTable,
          appliedRecordId,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
        },
      });

      return { appliedTable, appliedRecordId };
    });

    return { ok: true, ...result };
  } catch (error: any) {
    console.error("[AI-TRAINING/APPLY] Error:", error);
    return { ok: false, error: error.message || "حدث خطأ أثناء تطبيق القاعدة" };
  }
}

/**
 * التراجع عن تطبيق قاعدة معتمدة وحذف السجل المضاف أو شطب سطر الـ Guardrail
 */
export async function undoTrainingRule(
  ruleId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rule = await prisma.agentTrainingRule.findFirst({
    where: { id: ruleId, userId },
  });

  if (!rule) {
    return { ok: false, error: "السجل التدريبي غير موجود" };
  }

  if (rule.status !== "approved" || !rule.appliedTable || !rule.appliedRecordId) {
    return { ok: false, error: "القاعدة ليست في حالة معتمدة أو لم يتم تطبيقها بعد" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      switch (rule.appliedTable) {
        case "BrandFAQ": {
          await tx.brandFAQ.deleteMany({
            where: { id: rule.appliedRecordId!, userId },
          });
          break;
        }

        case "CustomerIssue": {
          await tx.customerIssue.deleteMany({
            where: { id: rule.appliedRecordId!, userId },
          });
          break;
        }

        case "BrandPolicy": {
          await tx.brandPolicy.deleteMany({
            where: { id: rule.appliedRecordId!, userId },
          });
          break;
        }

        case "AIGuardrail": {
          const guardrail = await tx.aIGuardrail.findUnique({
            where: { userId },
          });

          if (guardrail && guardrail.customRules) {
            const extracted = (rule.extractedData as any) || {};
            const targetContent = extracted.content || rule.content || "";
            const lines = guardrail.customRules.split("\n");

            // البحث عن السطر المطابق (سواء كان بـ - أو بدونه)
            const targetClean = targetContent.replace(/^[-•*]\s*/, "").trim();
            const filteredLines = lines.filter((line) => {
              const lineClean = line.replace(/^[-•*]\s*/, "").trim();
              return lineClean !== targetClean;
            });

            if (filteredLines.length === lines.length) {
              throw new Error(
                "لم يتم العثور على نص القاعدة في القواعد المخصصة (قد تكون عُدلت يدوياً في صفحة السلوك والحدود). يرجى مراجعتها وتعديلها يدوياً من هناك."
              );
            }

            const updatedRules = filteredLines.join("\n").trim();
            await tx.aIGuardrail.update({
              where: { id: guardrail.id },
              data: { customRules: updatedRules.length > 0 ? updatedRules : null },
            });
          }
          break;
        }

        case "SalesBehaviorSettings": {
          const extracted = (rule.extractedData as any) || {};
          const field = extracted.field;
          if (field) {
            const defaults: Record<string, any> = {
              suggestAlternatives: true,
              suggestUpsell: true,
              suggestCrossSell: false,
              suggestDiscounts: false,
              maxSuggestedProducts: 1,
              goal: "balanced",
            };
            const resetVal = defaults[field];
            if (resetVal !== undefined) {
              const resetObj: any = {};
              resetObj[field] = resetVal;
              await tx.salesBehaviorSettings.update({
                where: { userId },
                data: resetObj,
              });
            }
          }
          break;
        }
      }

      // إعادة حالة السجل إلى pending وتصفير الحقول المطبقة
      await tx.agentTrainingRule.update({
        where: { id: rule.id },
        data: {
          status: "pending",
          appliedTable: null,
          appliedRecordId: null,
        },
      });
    });

    return { ok: true };
  } catch (error: any) {
    console.error("[AI-TRAINING/UNDO] Error:", error);
    return { ok: false, error: error.message || "حدث خطأ أثناء التراجع عن القاعدة" };
  }
}
