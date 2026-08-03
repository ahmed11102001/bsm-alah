import { describe, it, expect } from "vitest";
import { normalizeText, calculateFuzzyScore } from "@/lib/product-search";
import { AIGuardrailSchema, AIAgentResponseSchema, parseInput } from "@/lib/schemas";

describe("Product Search Fuzzy & Normalization", () => {
  it("should normalize Arabic characters correctly", () => {
    expect(normalizeText("أحمد إبراهيم آدام")).toBe("احمد ابراهيم ادام");
    expect(normalizeText("مكتبة قراءة")).toBe("مكتبه قراءه");
    expect(normalizeText("مستشفى أهلي")).toBe("مستشفي اهلي");
  });

  it("should calculate fuzzy trigram similarity score correctly", () => {
    // Typos / variations
    const score1 = calculateFuzzyScore("تيشيرت", "تيشرت");
    expect(score1).toBeGreaterThan(0.5);

    const score2 = calculateFuzzyScore("كوتشي", "كوتشى");
    expect(score2).toBeGreaterThan(0.8);

    const scoreUnrelated = calculateFuzzyScore("حذاء", "حقيبة");
    expect(scoreUnrelated).toBeLessThan(0.3);
  });
});

describe("AI Guardrails & Response Zod Schemas", () => {
  it("should validate guardrail inputs using AIGuardrailSchema", () => {
    const valid = parseInput(AIGuardrailSchema, {
      noInventPrices: true,
      noInventProducts: true,
      noMentionCompetitors: true,
      strictKnowledgeOnly: true,
      alwaysHandoffComplaints: true,
      responseStyle: "natural",
      customRules: "ممنوع التوصيل يوم الجمعة",
    });

    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.noMentionCompetitors).toBe(true);
      expect(valid.data.strictKnowledgeOnly).toBe(true);
    }
  });

  it("should validate AI agent response output using AIAgentResponseSchema", () => {
    const aiResponse = {
      reply: "مرحباً، سعر المنتجات متاح في الكتالوج.",
      action: "handoff",
      reason: "استفسار معقد",
      priority: "high",
      product_ids: ["prod_1", "prod_2"],
    };

    const parsed = AIAgentResponseSchema.safeParse(aiResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.action).toBe("handoff");
      expect(parsed.data.product_ids).toHaveLength(2);
    }
  });
});
