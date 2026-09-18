import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  contact: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import {
  normalizeCrmInput,
  normalizeCrmEmail,
  normalizeCrmPhone,
  createCrmContact,
  updateCrmContact,
  listCrmContacts,
} from "@/lib/crm/contacts";
import { processImportRows } from "@/lib/crm/import-shared";

describe("CRM normalize", () => {
  it("يرفض المدخلات من غير وسيلة تواصل", () => {
    expect(normalizeCrmInput({ name: "x" })).toBeNull();
    expect(normalizeCrmInput({ name: "x", phone: "abc", email: "not-an-email" })).toBeNull();
  });

  it("يقبل رقم أو إيميل مع التطبيع", () => {
    const r = normalizeCrmInput({ name: "  أحمد  ", phone: "01012345678", email: "A@B.co " });
    expect(r).toMatchObject({ name: "أحمد", email: "a@b.co" });
    expect(typeof r?.phone).toBe("string");
  });

  it("normalizeCrmEmail / normalizeCrmPhone", () => {
    expect(normalizeCrmEmail("A@B.Co")).toBe("a@b.co");
    expect(normalizeCrmEmail("bad")).toBeNull();
    expect(normalizeCrmPhone("01012345678")).toBe("201012345678");
    expect(normalizeCrmPhone("xyz")).toBeNull();
  });
});

describe("CRM create — دمج وليس تكرار", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.contact.upsert.mockImplementation(async (a: any) => ({ id: "c-1", tags: [], ...a.create }));
    mockPrisma.contact.update.mockImplementation(async (a: any) => ({ id: "c-1", ...a.data }));
  });

  it("جديد تمامًا → create", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);
    mockPrisma.contact.create.mockResolvedValue({ id: "c-new" });

    const { contact, created } = await createCrmContact("u-1", {
      name: "سامي",
      phone: "01012345678",
      email: "sami@mail.com",
      tags: ["vip"],
    });

    expect(created).toBe(true);
    expect(contact).toEqual({ id: "c-new" });
    expect(mockPrisma.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u-1", email: "sami@mail.com", tags: ["vip"] }),
      })
    );
  });

  it("موجود بنفس الرقم وإيميله فاضي → دمج الإيميل (مش صف جديد)", async () => {
    mockPrisma.contact.findUnique.mockImplementation(async (a: any) => {
      if (a.where.phone_userId) return { id: "c-1", tags: [], deletedAt: null, email: null };
      return null;
    });
    mockPrisma.contact.upsert.mockResolvedValue({ id: "c-1", tags: [] });

    const { created } = await createCrmContact("u-1", {
      name: "سامي",
      phone: "01012345678",
      email: "sami@mail.com",
    });

    expect(created).toBe(false);
    expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    expect(mockPrisma.contact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_userId: { phone: "201012345678", userId: "u-1" } },
      })
    );
    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.update).toMatchObject({ email: "sami@mail.com" });
  });

  it("محذوف soft واتضاف تاني → استرجاع", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "c-old", tags: ["x"], deletedAt: new Date(), name: "قديم", phone: "201012345678", email: null,
    });
    mockPrisma.contact.update.mockResolvedValue({ id: "c-old" });

    const { created } = await createCrmContact("u-1", { name: "جديد", phone: "01012345678" });

    expect(created).toBe(true);
    expect(mockPrisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c-old" },
        data: expect.objectContaining({ deletedAt: null, name: "جديد" }),
      })
    );
  });

  it("من غير رقم ولا إيميل → throw", async () => {
    await expect(createCrmContact("u-1", { name: "x" })).rejects.toMatchObject({
      code: "PHONE_OR_EMAIL_REQUIRED",
    });
  });
});

describe("CRM update — حماية القيد الذهبي", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("مسح الرقم والإيميل معًا → 400", async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({ id: "c-1", phone: "2010", email: null });
    await expect(updateCrmContact("u-1", "c-1", { phone: "", email: "" })).rejects.toMatchObject({
      code: "PHONE_OR_EMAIL_REQUIRED",
    });
  });

  it("مسح الإيميل بس والرقم موجود → مسموح", async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({ id: "c-1", phone: "2010", email: "a@b.co" });
    mockPrisma.contact.update.mockResolvedValue({ id: "c-1" });
    await updateCrmContact("u-1", "c-1", { email: "" });
    expect(mockPrisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: null }) })
    );
  });

  it("مش موجود → NOT_FOUND", async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null);
    await expect(updateCrmContact("u-1", "nope", { name: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("CRM import-shared — ملخص added/updated/skipped", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.contact.findUnique.mockResolvedValue(null);
    mockPrisma.contact.upsert.mockImplementation(async (a: any) => ({ id: "c-x", ...a.create }));
  });

  it("صفوف مختلطة: جديد + مكرر + فاضي", async () => {
    mockPrisma.contact.findUnique.mockImplementation(async (a: any) => {
      if (a.where?.phone_userId?.phone === "201011111111") return { id: "c-old" };
      return null;
    });

    const summary = await processImportRows("u-1", [
      { name: "جديد", phone: "01022222222", email: "new@mail.com" },
      { name: "مكرر", phone: "01011111111" },
      { name: "فاضي" },
      { name: "إيميل بس", email: "only@mail.com" },
    ]);

    expect(summary.total).toBe(4);
    expect(summary.added).toBe(2);
    expect(summary.updated).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.skippedSamples[0]).toMatchObject({ row: 3, reason: "NO_CHANNEL" });
  });
});

describe("CRM list — فلتر القناة", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.count.mockResolvedValue(0);
  });

  it("فلتر email يستبعد اللي عندهم رقم", async () => {
    await listCrmContacts({ ownerId: "u-1", channel: "email" });
    const where = mockPrisma.contact.findMany.mock.calls[0][0].where;
    expect(where.OR ?? where.AND).toBeDefined();
    // يستبعد الصفوف اللي فيها رقم
    expect(JSON.stringify(where)).toContain('"phone"');
  });

  it("بحث q يدور في الاسم والرقم والإيميل", async () => {
    await listCrmContacts({ ownerId: "u-1", search: "أحمد" });
    const where = mockPrisma.contact.findMany.mock.calls[0][0].where;
    const andClause = (where.AND as any[]).find((c) => c.OR);
    expect(andClause.OR).toHaveLength(3);
  });
});
