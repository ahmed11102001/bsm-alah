import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  developerProject: {
    count: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { isOwnerOnlyAccount, getLatestOwnedProjectId } from "@/lib/dev-role";

describe("Dev Role Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isOwnerOnlyAccount", () => {
    it("يوزر عنده project واحد بس وهو أونر فيه → true", async () => {
      // ليس لديه مشاريع كمطور
      mockPrisma.developerProject.count.mockResolvedValueOnce(0);
      // لديه مشاريع كـ Owner
      mockPrisma.developerProject.count.mockResolvedValueOnce(1);

      const result = await isOwnerOnlyAccount("user-1");
      expect(result).toBe(true);
      expect(mockPrisma.developerProject.count).toHaveBeenNthCalledWith(1, { where: { developerId: "user-1" } });
      expect(mockPrisma.developerProject.count).toHaveBeenNthCalledWith(2, { where: { ownerId: "user-1" } });
    });

    it("يوزر عنده project هو مطوّر فيه → false (لأن المطور بيحتفظ بصلاحياته حتى لو كان أونر في مكان تاني)", async () => {
      // لديه مشاريع كمطور
      mockPrisma.developerProject.count.mockResolvedValueOnce(1);

      const result = await isOwnerOnlyAccount("user-1");
      expect(result).toBe(false);
      
      // لا نحتاج للبحث في المشاريع كـ Owner لأن الشرط الأول تحقق
      expect(mockPrisma.developerProject.count).toHaveBeenCalledTimes(1);
    });

    it("يوزر مالوش أي project (لا كمطور ولا كأونر) → false", async () => {
      mockPrisma.developerProject.count.mockResolvedValueOnce(0); // كـ مطور
      mockPrisma.developerProject.count.mockResolvedValueOnce(0); // كـ Owner

      const result = await isOwnerOnlyAccount("user-1");
      expect(result).toBe(false); // بناءً على الكود `return ownerProjectCount > 0`
    });
  });

  describe("getLatestOwnedProjectId", () => {
    it("بيرجع أحدث project الأونر بتاعه (مرتب حسب createdAt desc)", async () => {
      mockPrisma.developerProject.findFirst.mockResolvedValue({ id: "proj-1" });

      const result = await getLatestOwnedProjectId("user-1");
      expect(result).toBe("proj-1");
      expect(mockPrisma.developerProject.findFirst).toHaveBeenCalledWith({
        where: { ownerId: "user-1" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
    });

    it("لو مفيش أي project كأونر → null", async () => {
      mockPrisma.developerProject.findFirst.mockResolvedValue(null);

      const result = await getLatestOwnedProjectId("user-1");
      expect(result).toBeNull();
    });
  });
});
