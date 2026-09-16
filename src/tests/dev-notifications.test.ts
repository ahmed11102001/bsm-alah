import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  developerNotification: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { notifyDeveloper } from "@/lib/dev-notifications";

describe("dev-notifications helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.developerNotification.findFirst.mockResolvedValue(null);
    mockPrisma.developerNotification.create.mockResolvedValue({});
  });

  it("ينشئ الإشعار عادي بدون dedup", async () => {
    await notifyDeveloper("dev-1", {
      type: "TOPUP_APPROVED",
      title: "تم الشحن",
      message: "اتشحن 50ج",
      link: "https://x/billing",
    });
    expect(mockPrisma.developerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        developerId: "dev-1",
        title: "تم الشحن",
        link: "https://x/billing",
      }),
    });
    expect(mockPrisma.developerNotification.findFirst).not.toHaveBeenCalled();
  });

  it("dedup: يتخطى لو يوجد نفس الإشعار غير مقروء", async () => {
    mockPrisma.developerNotification.findFirst.mockResolvedValue({ id: "n1" });
    await notifyDeveloper("dev-1", {
      type: "TRIAL_EXPIRING",
      title: "t",
      message: "m",
      link: "https://x/billing",
      dedupHours: 72,
    });
    expect(mockPrisma.developerNotification.create).not.toHaveBeenCalled();
  });

  it("dedup: ينشئ لو مفيش سابق", async () => {
    mockPrisma.developerNotification.findFirst.mockResolvedValue(null);
    await notifyDeveloper("dev-1", {
      type: "TRIAL_EXPIRING",
      title: "t",
      message: "m",
      dedupHours: 72,
    });
    expect(mockPrisma.developerNotification.create).toHaveBeenCalled();
  });

  it("لا يرمي أبدًا — فشل الـ DB بصمت", async () => {
    mockPrisma.developerNotification.create.mockRejectedValue(new Error("db down"));
    await expect(
      notifyDeveloper("dev-1", { type: "SYSTEM", title: "t", message: "m" })
    ).resolves.toBeUndefined();
  });

  it("يتجاهل developerId الفاضي", async () => {
    await notifyDeveloper("", { type: "SYSTEM", title: "t", message: "m" });
    expect(mockPrisma.developerNotification.create).not.toHaveBeenCalled();
  });
});
