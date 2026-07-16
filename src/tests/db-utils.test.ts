import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  audience: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  campaign: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import {
  safeQuery,
  getUser,
  getUserByEmail,
  createUser,
  updateUser,
  getAudiences,
  createAudience,
  getCampaigns,
  createCampaign,
  updateCampaign,
  runTransaction,
} from "@/lib/db-utils";

import { CampaignStatus } from "@/types/enums";

describe("DB Utils Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("safeQuery", () => {
    it("query نجح → { data, error: null }", async () => {
      const result = await safeQuery(async () => "Success");
      expect(result).toEqual({ data: "Success", error: null });
    });

    it("query فشل بـ P2002 → بيرجع رسالة مقروءة وما يكسرش السيرفر", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "x",
      });

      const result = await safeQuery(async () => {
        throw p2002Error;
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe("This record already exists");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("query فشل بخطأ غير معروف → بيرجع رسالة عامة", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await safeQuery(async () => {
        throw new Error("Boom");
      });
      expect(result.data).toBeNull();
      expect(result.error).toBe("Unknown database error");
      consoleSpy.mockRestore();
    });
  });

  describe("User Functions", () => {
    it("getUser: يرجع null نضيف لو مفيش نتيجة", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await getUser("u-1");
      expect(res).toEqual({ data: null, error: null });
    });

    it("getUserByEmail: بيبعت الـ query الصح", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1" });
      const res = await getUserByEmail("test@test.com");
      expect(res.data).toEqual({ id: "u-1" });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@test.com" },
      });
    });

    it("createUser: بيبني الـ prisma call الصح", async () => {
      mockPrisma.user.create.mockResolvedValue({ id: "u-1" });
      await createUser({ email: "t", password: "p", name: "n" });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { email: "t", password: "p", name: "n" },
        })
      );
    });

    it("updateUser: بيبني الـ prisma call الصح", async () => {
      mockPrisma.user.update.mockResolvedValue({ id: "u-1" });
      await updateUser("u-1", { name: "Ahmed" });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "u-1" },
          data: { name: "Ahmed" },
        })
      );
    });
  });

  describe("Audience Functions", () => {
    it("getAudiences: بيطلب الـ include صح", async () => {
      mockPrisma.audience.findMany.mockResolvedValue([]);
      await getAudiences("u-1");
      expect(mockPrisma.audience.findMany).toHaveBeenCalledWith({
        where: { userId: "u-1" },
        include: { contacts: true },
      });
    });

    it("createAudience: بيبني العلاقات (contacts.create) صح", async () => {
      mockPrisma.audience.create.mockResolvedValue({ id: "a-1" });
      await createAudience("u-1", { name: "Aud 1", contacts: ["010", "011"] });
      
      expect(mockPrisma.audience.create).toHaveBeenCalledWith({
        data: {
          name: "Aud 1",
          userId: "u-1",
          contacts: {
            create: [
              { phone: "010", userId: "u-1" },
              { phone: "011", userId: "u-1" },
            ],
          },
        },
        include: { contacts: true },
      });
    });
  });

  describe("Campaign Functions", () => {
    it("getCampaigns: بيرتب بالـ createdAt desc", async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      await getCampaigns("u-1");
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { userId: "u-1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("createCampaign: بيفهم الـ status mapping ويرجع default لو مش معروف", async () => {
      mockPrisma.campaign.create.mockResolvedValue({ id: "c-1" });
      
      // string valid
      await createCampaign("u-1", { name: "Test", status: "running" });
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CampaignStatus.running }),
        })
      );

      // string invalid (fallback to draft)
      await createCampaign("u-1", { status: "unknown" });
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CampaignStatus.draft }),
        })
      );
    });

    it("updateCampaign: بيفهم التعديل الجزئي", async () => {
      mockPrisma.campaign.update.mockResolvedValue({ id: "c-1" });
      await updateCampaign("c-1", { status: "completed", sentCount: 10 });
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: {
          status: CampaignStatus.completed,
          sentCount: 10,
        },
      });
    });
  });

  describe("runTransaction", () => {
    it("بيعمل wrapper لـ prisma.$transaction", async () => {
      mockPrisma.$transaction.mockResolvedValue("TxSuccess");
      const res = await runTransaction(async (tx) => "TxSuccess");
      expect(res.data).toBe("TxSuccess");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
