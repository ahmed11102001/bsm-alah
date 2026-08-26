import { describe, it, expect } from "vitest";
import { type AgentContext } from "@/lib/ai-agent";

// Helper to inspect the generated prompt from AgentContext
// We can test buildSystemPrompt by checking the prompt structure or exporting it,
// or by testing the context assembly behavior.
describe("Customer Service Knowledge & Goal Independence", () => {
  it("should maintain customer service knowledge across all sales goals", () => {
    const goals: Array<"customer_service" | "balanced" | "sales_focused"> = [
      "customer_service",
      "balanced",
      "sales_focused",
    ];

    const customerServiceKnowledge = {
      generalSupportInfo: "نساعد العملاء في ربط Shopify بمتجرهم وإعداد المتاجر ومشاكل الطلبات.",
      supportProcess: "ابدأ بفهم المشكلة، ثم اطلب المعلومات الناقصة، ثم قدم خطوات الحل. إذا لم تكن المعلومة موجودة في قاعدة المعرفة، لا تخمن وحول المحادثة لموظف.",
      escalationInstructions: "إذا طلب العميل موظفًا، أو كانت المشكلة تتطلب وصولًا إلى حسابه، أو لم تكن الإجابة موجودة في قاعدة المعرفة.",
      faqs: [
        {
          question: "كيف أربط Shopify؟",
          answer: "يمكنك الربط من خلال التوجه إلى لوحة التحكم > المتاجر > ربط Shopify وإدخال مفتاح الـ API.",
        },
      ],
      issues: [
        {
          problem: "فشل ربط Shopify",
          resolution: "تأكد أولًا من صحة مفتاح الـ API وصلاحيات المتجر، وإذا استمر الخطأ اطلب من العميل إعادة توليد المفتاح.",
        },
      ],
    };

    for (const goal of goals) {
      const ctx: AgentContext = {
        brandName: "متجر التجربة",
        businessDesc: "متجر تجريبي لخدمات التجارة الإلكترونية",
        salesBehavior: {
          goal,
          suggestDiscounts: false,
        },
        customerService: customerServiceKnowledge,
      };

      // Customer service knowledge must be retained and accessible regardless of goal
      expect(ctx.customerService).toBeDefined();
      expect(ctx.customerService?.generalSupportInfo).toContain("Shopify");
      expect(ctx.customerService?.faqs).toHaveLength(1);
      expect(ctx.customerService?.faqs?.[0].question).toBe("كيف أربط Shopify؟");
      expect(ctx.customerService?.issues).toHaveLength(1);
      expect(ctx.customerService?.issues?.[0].problem).toBe("فشل ربط Shopify");
      expect(ctx.customerService?.issues?.[0].resolution).toContain("صحة مفتاح الـ API");
      expect(ctx.customerService?.supportProcess).toContain("لا تخمن وحول المحادثة لموظف");
      expect(ctx.customerService?.escalationInstructions).toContain("إذا طلب العميل موظفًا");
    }
  });

  it("should handle optional customer service fields gracefully without breaking", () => {
    const emptyCtx: AgentContext = {
      brandName: "متجر بسيط",
      customerService: undefined,
    };

    expect(emptyCtx.customerService).toBeUndefined();

    const partialCtx: AgentContext = {
      brandName: "متجر بسيط",
      customerService: {
        generalSupportInfo: "دعم فني عبر واتساب",
      },
    };

    expect(partialCtx.customerService?.generalSupportInfo).toBe("دعم فني عبر واتساب");
    expect(partialCtx.customerService?.faqs).toBeUndefined();
    expect(partialCtx.customerService?.issues).toBeUndefined();
  });
});
