import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  contact: {
    findFirst: vi.fn(),
  },
  trackedClick: {
    findFirst: vi.fn(),
  },
  campaignOrder: {
    create: vi.fn(),
  },
  campaign: {
    update: vi.fn(),
  },
  $transaction: vi.fn((actions) => Promise.all(actions)),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import {
  generateClickToken,
  buildTrackedUrl,
  attributeOrderToCampaign,
} from "@/lib/attribution";

describe("Attribution Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateClickToken & buildTrackedUrl", () => {
    it("generateClickToken بيرجع token فريد مش نفس القيمة لنفس المدخلات في أوقات مختلفة", async () => {
      // Because Date.now() is used, it should be different.
      // We will fake timers if needed, but normally running them consecutively is fast enough 
      // but Date.now() might be same if super fast. Let's just mock Date.now or wait a ms.
      const t1 = generateClickToken("camp-1", "01000");
      
      // Delay just to ensure Date.now() changes
      await new Promise(res => setTimeout(res, 2));
      
      const t2 = generateClickToken("camp-1", "01000");

      expect(t1).not.toBe(t2);
      expect(typeof t1).toBe("string");
      expect(t1.length).toBe(32);
    });

    it("buildTrackedUrl بيبني URL صح حوالين الـ token", () => {
      const url = buildTrackedUrl("my-token");
      expect(url).toContain("/t/my-token");
      expect(url.startsWith("http")).toBe(true);
    });
  });

  describe("attributeOrderToCampaign", () => {
    const defaultParams = {
      userId: "u-1",
      customerPhone: "+20 100 123 4567",
      storeOrderId: "order-123",
      revenue: 500,
    };

    it("لو الرقم ملوش contact في الداتا بيس → مفيش attribution", async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const res = await attributeOrderToCampaign(defaultParams);

      expect(res.attributed).toBe(false);
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { phone: "201001234567", userId: "u-1" },
        })
      );
      expect(mockPrisma.trackedClick.findFirst).not.toHaveBeenCalled();
    });

    it("لو الـ contact ملوش click مفتوح أو الـ token منتهي → مفيش attribution وما يرميش error", async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: "contact-1" });
      mockPrisma.trackedClick.findFirst.mockResolvedValue(null);

      const res = await attributeOrderToCampaign(defaultParams);

      expect(res.attributed).toBe(false);
      expect(mockPrisma.trackedClick.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactId: "contact-1",
            isClicked: true,
            attributionExpiresAt: expect.any(Object), // { gt: now }
          }),
        })
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("order له click token صالح → بيتربط بالـ campaign الصح", async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: "contact-1" });
      mockPrisma.trackedClick.findFirst.mockResolvedValue({
        id: "click-1",
        campaignId: "camp-1",
      });

      const res = await attributeOrderToCampaign(defaultParams);

      expect(res.attributed).toBe(true);
      expect(res.campaignId).toBe("camp-1");
      
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      
      // verify create campaignOrder was called in transaction
      expect(mockPrisma.campaignOrder.create).toHaveBeenCalledWith({
        data: {
          campaignId: "camp-1",
          storeOrderId: "order-123",
          revenue: 500,
        },
      });
      
      // verify update campaign totals was called in transaction
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "camp-1" },
        data: {
          revenue: { increment: 500 },
          ordersCount: { increment: 1 },
        },
      });
    });

    it("لو الأوردر متسجل قبل كده (Unique constraint P2002) → بيرجع attributed: false وما بيكسرش السيستم", async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: "contact-1" });
      mockPrisma.trackedClick.findFirst.mockResolvedValue({
        id: "click-1",
        campaignId: "camp-1",
      });
      
      const p2002Error = new Error("Unique constraint failed");
      (p2002Error as any).code = "P2002";
      
      mockPrisma.$transaction.mockRejectedValue(p2002Error);

      const res = await attributeOrderToCampaign(defaultParams);

      expect(res.attributed).toBe(false);
    });

    it("خطأ غير متوقع في الداتابيس → بيرجع false وما بيكسرش", async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: "contact-1" });
      mockPrisma.trackedClick.findFirst.mockResolvedValue({
        id: "click-1",
        campaignId: "camp-1",
      });
      
      mockPrisma.$transaction.mockRejectedValue(new Error("DB Down"));

      const res = await attributeOrderToCampaign(defaultParams);

      expect(res.attributed).toBe(false);
    });
  });
});
