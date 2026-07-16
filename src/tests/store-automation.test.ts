import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  storeAutomation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  storeOrder: {
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  message: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const mockWhatsAppApi = vi.hoisted(() => ({
  sendWhatsAppMessage: vi.fn(),
}));
vi.mock("@/lib/whatsapp-api", () => mockWhatsAppApi);

const mockCrypto = vi.hoisted(() => ({
  decryptToken: vi.fn((val) => val), // just pass through for test
}));
vi.mock("@/lib/crypto", () => mockCrypto);

const mockNotifications = vi.hoisted(() => ({
  notifyStoreAutoSent: vi.fn().mockResolvedValue(undefined),
  notifyStoreAutoFailed: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications", () => mockNotifications);

const mockInngest = vi.hoisted(() => ({
  inngest: { send: vi.fn() },
}));
vi.mock("@/inngest/client", () => mockInngest);

const mockSmartFollowup = vi.hoisted(() => ({
  scheduleShippingFollowUp: vi.fn(),
}));
vi.mock("@/lib/smart-followup", () => mockSmartFollowup);

import {
  executeStoreAutomationSend,
  triggerStoreAutomation,
  type TriggerStoreAutomationParams,
} from "@/lib/store-automation";

describe("Store Automation Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.storeOrder.update.mockResolvedValue({});
    mockPrisma.message.create.mockResolvedValue({});
    mockPrisma.storeAutomation.update.mockResolvedValue({});

    mockWhatsAppApi.sendWhatsAppMessage.mockResolvedValue({
      ok: true,
      whatsappMsgId: "msg-123",
    });
  });

  const baseParams: TriggerStoreAutomationParams = {
    userId: "u-1",
    automationType: "order_confirm",
    storeSource: "shopify",
    storeId: "store-1",
    customerPhone: "0100",
    contactId: "c-1",
    storeOrderId: "order-1",
  };

  const mockAutomationData = {
    id: "auto-1",
    isEnabled: true,
    template: { name: "my_template", language: "ar", status: "APPROVED" },
    user: {
      whatsappAccount: { accessToken: "token", phoneNumberId: "phone-1" },
    },
  };

  describe("executeStoreAutomationSend", () => {
    it("Race condition: حد تاني claim العملية قبلنا (count: 0) → يوقف وما يبعتش", async () => {
      mockPrisma.storeAutomation.findUnique.mockResolvedValue(mockAutomationData);
      
      // Simulate claim failure (already claimed)
      mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 0 });

      const res = await executeStoreAutomationSend({
        ...baseParams,
        automationType: "order_shipped", // only order_shipped has the claim logic
      });

      expect(res.sent).toBe(false);
      expect(res.reason).toBe("already_shipped_or_in_progress");
      expect(mockWhatsAppApi.sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it("نجح في الـ claim (count: 1) → يكمل ويبعت الرسالة", async () => {
      mockPrisma.storeAutomation.findUnique.mockResolvedValue(mockAutomationData);
      mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 1 }); // Claim success

      const res = await executeStoreAutomationSend({
        ...baseParams,
        automationType: "order_shipped",
      });

      expect(res.sent).toBe(true);
      expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalled();
      
      // Also check that it scheduled follow-up
      expect(mockSmartFollowup.scheduleShippingFollowUp).toHaveBeenCalledWith("order-1", "u-1");
    });

    it("الأنواع المختلفة بتبعت بالـ template الصح", async () => {
      mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 1 });
      
      const types = ["order_confirm", "order_shipped", "promo", "cart_abandon"] as const;
      
      for (const type of types) {
        mockPrisma.storeAutomation.findUnique.mockResolvedValue({
          ...mockAutomationData,
          template: { name: `template_for_${type}`, language: "ar", status: "APPROVED" }
        });
        
        await executeStoreAutomationSend({ ...baseParams, automationType: type });
        
        expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            templateName: `template_for_${type}`
          })
        );
      }
    });

    it("فشل الإرسال (WhatsApp error) → يرجع حالة claim لـ null عشان يتجرب تاني", async () => {
      mockPrisma.storeAutomation.findUnique.mockResolvedValue(mockAutomationData);
      mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 1 }); // Initial claim success
      
      // Make send fail
      mockWhatsAppApi.sendWhatsAppMessage.mockResolvedValue({ ok: false, error: "API down" });

      const res = await executeStoreAutomationSend({
        ...baseParams,
        automationType: "order_shipped",
      });

      expect(res.sent).toBe(false);
      expect(res.reason).toBe("API down");

      // Verify rollback of claim
      expect(mockPrisma.storeOrder.updateMany).toHaveBeenLastCalledWith({
        where: { id: "order-1" },
        data: { shippedAt: null },
      });
      
      expect(mockNotifications.notifyStoreAutoFailed).toHaveBeenCalled();
    });
  });

  describe("triggerStoreAutomation", () => {
    it("بيتأكد من إن الـ automation مفعّل", async () => {
      mockPrisma.storeAutomation.findUnique.mockResolvedValue({ isEnabled: false });

      const res = await triggerStoreAutomation(baseParams);

      expect(res.sent).toBe(false);
      expect(res.reason).toBe("disabled");
      expect(mockInngest.inngest.send).not.toHaveBeenCalled();
    });

    it("المصادر التلاتة بيتعامل معاهم وبيعمل query صح", async () => {
      const sources = ["shopify", "easyorders", "woocommerce"] as const;

      for (const source of sources) {
        mockPrisma.storeAutomation.findUnique.mockResolvedValue({ isEnabled: false });
        
        await triggerStoreAutomation({ ...baseParams, storeSource: source });

        const expectedWhere = source === "shopify"
          ? { shopifyStoreId_type: { shopifyStoreId: "store-1", type: "order_confirm" } }
          : source === "easyorders"
            ? { easyOrdersStoreId_type: { easyOrdersStoreId: "store-1", type: "order_confirm" } }
            : { wooCommerceStoreId_type: { wooCommerceStoreId: "store-1", type: "order_confirm" } };

        expect(mockPrisma.storeAutomation.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: expectedWhere })
        );
      }
    });

    it("لو في delayMinutes بيعمل schedule ومش بيبعت فوراً", async () => {
      mockPrisma.storeAutomation.findUnique.mockResolvedValue({
        isEnabled: true,
        delayMinutes: 30,
      });

      const res = await triggerStoreAutomation(baseParams);

      expect(res.sent).toBe(false);
      expect(res.reason).toBe("scheduled");
      expect(mockInngest.inngest.send).toHaveBeenCalledWith({
        name: "store/automation.trigger",
        data: expect.objectContaining({ delayMinutes: 30 }),
      });
      
      // executeStoreAutomationSend shouldn't be called directly
      expect(mockWhatsAppApi.sendWhatsAppMessage).not.toHaveBeenCalled();
    });
  });
});
