import { describe, it, expect } from "vitest";
import {
  InteractiveMenuConfigSchema,
  AutomationCreateSchema,
} from "@/lib/schemas";
import { TriggerType, ReplyType } from "@/types/enums";

describe("Interactive Menu Validation", () => {
  describe("InteractiveMenuConfigSchema", () => {
    it("Valid interactive config with 1 to 3 buttons passes validation", () => {
      const validConfig = {
        body: "أهلاً بك 👋 اختر من الخيارات التالية:",
        footer: "اختر للمتابعة",
        buttons: [
          { buttonId: "btn_1", text: "الأسعار", nextStepId: "rule_1" },
          { buttonId: "btn_2", text: "المنتجات", nextStepId: "rule_2" },
          { buttonId: "btn_3", text: "خدمة العملاء", nextStepId: null },
        ],
      };
      const result = InteractiveMenuConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it("Rejects when buttons count exceeds 3 (WhatsApp limit)", () => {
      const invalidConfig = {
        body: "اختر:",
        buttons: [
          { buttonId: "btn_1", text: "زر 1" },
          { buttonId: "btn_2", text: "زر 2" },
          { buttonId: "btn_3", text: "زر 3" },
          { buttonId: "btn_4", text: "زر 4" },
        ],
      };
      const result = InteractiveMenuConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("Rejects when buttons list is empty", () => {
      const invalidConfig = {
        body: "اختر:",
        buttons: [],
      };
      const result = InteractiveMenuConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("Rejects duplicate buttonId values", () => {
      const invalidConfig = {
        body: "اختر:",
        buttons: [
          { buttonId: "btn_same", text: "زر 1" },
          { buttonId: "btn_same", text: "زر 2" },
        ],
      };
      const result = InteractiveMenuConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("Rejects button text longer than 20 characters (WhatsApp limit)", () => {
      const invalidConfig = {
        body: "اختر:",
        buttons: [
          { buttonId: "btn_1", text: "هذا النص طويل جداً ويتجاوز عشرين حرفاً" },
        ],
      };
      const result = InteractiveMenuConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("Rejects message body longer than 1024 characters", () => {
      const invalidConfig = {
        body: "a".repeat(1025),
        buttons: [{ buttonId: "btn_1", text: "زر" }],
      };
      const result = InteractiveMenuConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe("AutomationCreateSchema with INTERACTIVE_MENU", () => {
    it("Valid FIRST_MESSAGE + INTERACTIVE_MENU rule passes", () => {
      const input = {
        name: "Welcome Menu",
        triggerType: TriggerType.FIRST_MESSAGE,
        replyType: ReplyType.INTERACTIVE_MENU,
        interactiveConfig: {
          body: "أهلاً بك 👋 كيف يمكننا مساعدتك؟",
          buttons: [
            { buttonId: "btn_welcome_1", text: "عرض المنتجات" },
            { buttonId: "btn_welcome_2", text: "سؤال عن السعر" },
          ],
        },
      };
      const result = AutomationCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("Valid KEYWORD + INTERACTIVE_MENU rule passes", () => {
      const input = {
        name: "Keyword Menu",
        triggerType: TriggerType.KEYWORD,
        triggerValue: "قائمة",
        replyType: ReplyType.INTERACTIVE_MENU,
        interactiveConfig: {
          body: "اختر من القائمة:",
          buttons: [
            { buttonId: "btn_kw_1", text: "الخدمات" },
          ],
        },
      };
      const result = AutomationCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("Rejects INTERACTIVE_MENU when interactiveConfig is missing", () => {
      const input = {
        name: "Invalid Menu",
        triggerType: TriggerType.FIRST_MESSAGE,
        replyType: ReplyType.INTERACTIVE_MENU,
      };
      const result = AutomationCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
