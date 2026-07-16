import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  storeOrder: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  abandonedCart: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  smartFollowUpSetting: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  template: {
    findFirst: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  message: {
    create: vi.fn().mockResolvedValue({}),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const mockWhatsAppApi = vi.hoisted(() => ({
  sendWhatsAppMessage: vi.fn(),
}));
vi.mock("@/lib/whatsapp-api", () => mockWhatsAppApi);

const mockCrypto = vi.hoisted(() => ({
  decryptToken: vi.fn((val) => val),
}));
vi.mock("@/lib/crypto", () => mockCrypto);

const mockNotifications = vi.hoisted(() => ({
  notifyAiHandoffNeeded: vi.fn().mockResolvedValue(undefined),
  notifySmartFollowUpAlert: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications", () => mockNotifications);

import {
  checkShippingRescheduleNeeded,
  checkCartRescheduleNeeded,
  resolveActiveFollowUpContext,
  closeExpiredStageIfNeeded,
  handleShippingFollowUpReply,
  handleCartFollowUpReply,
  handleOrderConfirmReply,
  sendShippingFollowUpNow,
  sendCartFollowUpNow,
  sendSessionText,
  sendSessionButtons,
} from "@/lib/smart-followup";

import { ShippingFollowUpStage, CartFollowUpStage } from "@/types/enums";

describe("Smart Followup Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhatsAppApi.sendWhatsAppMessage.mockResolvedValue({
      ok: true,
      whatsappMsgId: "msg-123",
    });
  });

  describe("checkRescheduleNeeded (Shipping & Cart)", () => {
    it("لا يحتاج تأجيل إذا كان delay الجديد أقل أو يساوي القديم", async () => {
      mockPrisma.storeOrder.findUnique.mockResolvedValue({ userId: "u-1" });
      mockPrisma.smartFollowUpSetting.findUnique.mockResolvedValue({ triggerDelayDays: 2 }); // الجديد

      const res = await checkShippingRescheduleNeeded("order-1", 3); // القديم
      expect(res.needsReschedule).toBe(false);
      expect(res.extraSleepSeconds).toBe(0);
    });

    it("يحتاج تأجيل إذا كان delay الجديد أكبر، وبيرجع الفرق بالثواني", async () => {
      mockPrisma.storeOrder.findUnique.mockResolvedValue({ userId: "u-1" });
      mockPrisma.smartFollowUpSetting.findUnique.mockResolvedValue({ triggerDelayDays: 5 }); // الجديد

      const res = await checkShippingRescheduleNeeded("order-1", 3); // القديم 3
      expect(res.needsReschedule).toBe(true);
      // الفرق يومين = 2 * 24 * 60 * 60 = 172800 ثانية
      expect(res.extraSleepSeconds).toBe(172800);
    });
  });

  describe("resolveActiveFollowUpContext & closeExpiredStageIfNeeded", () => {
    it("resolveActiveFollowUpContext بيرجع الـ context الصح بناء على الـ ID أو التليفون", async () => {
      // 1. contextId -> shipping
      const mockOrder = { id: "order-1", userId: "u-1" };
      mockPrisma.storeOrder.findFirst.mockResolvedValueOnce(mockOrder); // findStoreOrderByContext with ID

      const res = await resolveActiveFollowUpContext({ userId: "u-1", phone: "010", contextId: "msg-1" });
      expect(res).toEqual({ kind: "shipping", order: mockOrder });
    });

    it("closeExpiredStageIfNeeded بيقفل الـ stage القديم", async () => {
      const expiredRecord = {
        id: "order-1",
        followUpStage: ShippingFollowUpStage.SENT,
        followUpStageExpiresAt: new Date(Date.now() - 10000), // منتهي
      };

      await closeExpiredStageIfNeeded("shipping", expiredRecord);

      expect(mockPrisma.storeOrder.updateMany).toHaveBeenCalledWith({
        where: { id: "order-1", followUpStage: { not: ShippingFollowUpStage.DONE } },
        data: { followUpStage: ShippingFollowUpStage.DONE },
      });
    });
  });

  describe("Reply Handlers", () => {
    const mockAccount = { phoneNumberId: "phone-1", accessToken: "token-1" };

    describe("handleShippingFollowUpReply", () => {
      it("delivered → بيحدث الـ stage ويبعت رسالة تقييم", async () => {
        mockPrisma.smartFollowUpSetting.findUnique.mockResolvedValue({ texts: {} });
        mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 1 }); // Atomic claim

        const order = { id: "o-1", userId: "u-1", customerPhone: "010", followUpStage: ShippingFollowUpStage.SENT } as any;
        await handleShippingFollowUpReply(order, {
          payloadId: "delivered",
          messageText: "delivered",
          accountOwner: mockAccount,
          userId: "u-1",
        });

        expect(mockPrisma.storeOrder.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ followUpStage: ShippingFollowUpStage.AWAITING_RATING }),
          })
        );
        expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalledWith(
          expect.objectContaining({ messageType: "interactive_list" })
        );
      });

      it("atomic claim بيمنع التنفيذ المزدوج", async () => {
        mockPrisma.smartFollowUpSetting.findUnique.mockResolvedValue({ texts: {} });
        mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 0 }); // Claim failed

        const order = { id: "o-1", userId: "u-1", customerPhone: "010", followUpStage: ShippingFollowUpStage.SENT } as any;
        await handleShippingFollowUpReply(order, {
          payloadId: "delivered",
          messageText: "delivered",
          accountOwner: mockAccount,
          userId: "u-1",
        });

        expect(mockWhatsAppApi.sendWhatsAppMessage).not.toHaveBeenCalled();
      });
    });

    describe("handleCartFollowUpReply", () => {
      it("continue_order → بيحدث الـ stage ويبعت الرابط", async () => {
        mockPrisma.smartFollowUpSetting.findUnique.mockResolvedValue({ texts: {} });
        mockPrisma.abandonedCart.updateMany.mockResolvedValue({ count: 1 });

        const cart = { id: "c-1", userId: "u-1", customerPhone: "010", followUpStage: CartFollowUpStage.SENT, recoveryUrl: "http://url" } as any;
        await handleCartFollowUpReply(cart, {
          payloadId: "continue_order",
          messageText: "continue_order",
          accountOwner: mockAccount,
          userId: "u-1",
        });

        expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalledWith(
          expect.objectContaining({ content: expect.stringContaining("http://url") })
        );
      });
    });

    describe("handleOrderConfirmReply", () => {
      it("CONFIRM_ORDER → بيبعت رسالة تأكيد", async () => {
        mockPrisma.smartFollowUpSetting.findUnique.mockResolvedValue({ isEnabled: true, texts: {} });
        
        const order = { id: "o-1", userId: "u-1", customerPhone: "010" } as any;
        await handleOrderConfirmReply(order, {
          payloadId: "CONFIRM_ORDER",
          messageText: "CONFIRM_ORDER",
          accountOwner: mockAccount,
          userId: "u-1",
        });

        expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalledWith(
          expect.objectContaining({ messageType: "text" })
        );
      });
    });
  });

  describe("Direct send helpers (WhatsApp Payload check)", () => {
    it("sendSessionText بيبني payload صح", async () => {
      await sendSessionText("010", "phone-1", "token-1", "Hello World");
      expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalledWith({
        toPhone: "010",
        phoneNumberId: "phone-1",
        accessToken: "token-1",
        messageType: "text",
        templateName: null,
        templateLang: "ar",
        templateVars: null,
        content: "Hello World",
      });
    });

    it("sendSessionButtons بيبني payload صح", async () => {
      await sendSessionButtons("010", "phone-1", "token-1", "Hello", [{ id: "b1", title: "Button" }]);
      expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalledWith({
        toPhone: "010",
        phoneNumberId: "phone-1",
        accessToken: "token-1",
        messageType: "interactive_buttons",
        templateName: null,
        templateLang: "ar",
        templateVars: null,
        content: null,
        interactive: { body: "Hello", buttons: [{ id: "b1", title: "Button" }] },
      });
    });

    it("sendShippingFollowUpNow بيبني template payload صح", async () => {
      mockPrisma.storeOrder.findUnique.mockResolvedValue({ id: "o-1", userId: "u-1", customerPhone: "010", status: "shipped", contactId: "c-1" });
      mockPrisma.smartFollowUpSetting.findUnique.mockResolvedValue({ isEnabled: true });
      mockPrisma.template.findFirst.mockResolvedValue({ name: "template1", language: "ar", status: "APPROVED" });
      mockPrisma.storeOrder.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({ whatsappAccount: { accessToken: "t", phoneNumberId: "p" } });

      const res = await sendShippingFollowUpNow("o-1", 1);
      
      expect(res.sent).toBe(true);
      expect(mockWhatsAppApi.sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messageType: "template",
          templateName: "template1",
        })
      );
    });
  });
});
