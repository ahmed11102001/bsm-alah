import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  developerProject: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import {
  getProjectForOwnerOrDeveloper,
  getProjectForOwner,
} from "@/lib/dev-project-auth";

describe("Dev Project Auth Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectForOwnerOrDeveloper", () => {
    it("الأونر بتاع الـ project → بيتبعت الـ query الصح لـ Prisma وترجع النتيجة", async () => {
      const mockProject = { id: "proj-1", ownerId: "user-1", status: "ACTIVE" };
      mockPrisma.developerProject.findFirst.mockResolvedValue(mockProject);

      const result = await getProjectForOwnerOrDeveloper("proj-1", "user-1");
      
      expect(result).toEqual(mockProject);
      expect(mockPrisma.developerProject.findFirst).toHaveBeenCalledWith({
        where: {
          id: "proj-1",
          status: "ACTIVE",
          OR: [
            { developerId: "user-1", developerRemovedAt: null },
            { ownerId: "user-1" },
          ],
        },
      });
    });

    it("مطوّر مضاف للـ project و developerRemovedAt: null → بيتبعت الـ query الصح وتسمح له بالوصول", async () => {
      const mockProject = { id: "proj-1", developerId: "user-1", developerRemovedAt: null, status: "ACTIVE" };
      mockPrisma.developerProject.findFirst.mockResolvedValue(mockProject);

      const result = await getProjectForOwnerOrDeveloper("proj-1", "user-1");
      
      expect(result).toEqual(mockProject);
      // التأكد إن Query بيبحث عن developerRemovedAt: null (هذا أهم فحص أمني)
      const callArgs = mockPrisma.developerProject.findFirst.mock.calls[0][0];
      expect(callArgs.where.OR).toContainEqual({ developerId: "user-1", developerRemovedAt: null });
    });

    it("مطوّر كان مضاف بس developerRemovedAt مش null → لازم الـ Query تستبعده (ويرجع null لو استخدمنا DB حقيقية)", async () => {
      // هنا إحنا بنـ Mock، فأهم حاجة إن الـ Query نفسها صحيحة وتطلب developerRemovedAt: null
      mockPrisma.developerProject.findFirst.mockResolvedValue(null); // لأن Prisma مش هتلاقيه

      const result = await getProjectForOwnerOrDeveloper("proj-1", "user-1");
      
      expect(result).toBeNull();
      const callArgs = mockPrisma.developerProject.findFirst.mock.calls[0][0];
      // إذا لم يكن الـ Query يحتوي على developerRemovedAt: null، سيفشل الاختبار
      expect(callArgs.where.OR).toContainEqual({ developerId: "user-1", developerRemovedAt: null });
    });

    it("الـ project مش ACTIVE → الـ Query بتبحث حصراً عن ACTIVE", async () => {
      mockPrisma.developerProject.findFirst.mockResolvedValue(null);

      const result = await getProjectForOwnerOrDeveloper("proj-1", "user-1");
      
      expect(result).toBeNull();
      const callArgs = mockPrisma.developerProject.findFirst.mock.calls[0][0];
      expect(callArgs.where.status).toBe("ACTIVE");
    });
  });

  describe("getProjectForOwner", () => {
    it("الأونر → بيتبعت Query فيها ownerId حصراً", async () => {
      const mockProject = { id: "proj-1", ownerId: "owner-1", status: "ACTIVE" };
      mockPrisma.developerProject.findFirst.mockResolvedValue(mockProject);

      const result = await getProjectForOwner("proj-1", "owner-1");
      
      expect(result).toEqual(mockProject);
      expect(mockPrisma.developerProject.findFirst).toHaveBeenCalledWith({
        where: {
          id: "proj-1",
          ownerId: "owner-1",
          status: "ACTIVE",
        },
      });
      
      // التأكد إنه مفيش OR clause فيها developerId
      const callArgs = mockPrisma.developerProject.findFirst.mock.calls[0][0];
      expect(callArgs.where.OR).toBeUndefined();
      expect(callArgs.where.developerId).toBeUndefined();
    });

    it("المطوّر حتى لو نشط → الـ Query هتستبعده لأنها بتبحث بـ ownerId بس (مما يؤدي لـ null من Prisma)", async () => {
      mockPrisma.developerProject.findFirst.mockResolvedValue(null);

      const result = await getProjectForOwner("proj-1", "dev-1");
      
      expect(result).toBeNull();
      expect(mockPrisma.developerProject.findFirst).toHaveBeenCalledWith({
        where: {
          id: "proj-1",
          ownerId: "dev-1", // هتبحث عن المطوّر كأنه أونر، ومش هتلاقيه
          status: "ACTIVE",
        },
      });
    });
  });
});
