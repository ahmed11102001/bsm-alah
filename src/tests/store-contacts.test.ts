import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  contact: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { upsertStoreContact, normalizeContactEmail } from "@/lib/store-contacts";

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

describe("upsertStoreContact — جمهور المتجر (رقم + إيميل)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.contact.upsert.mockImplementation(async (args: any) => ({ id: "c-1", ...args.create }));
    mockPrisma.contact.update.mockImplementation(async (args: any) => ({ id: "c-1", ...args.data }));
  });

  it("1) رقم + إيميل → صف واحد فيه الحقلين", async () => {
    await upsertStoreContact({
      userId: "u-1",
      phone: "201012345678",
      email: "Client@Shop.com ",
      updateName: "أحمد",
      createName: "أحمد",
    });

    expect(mockPrisma.contact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_userId: { phone: "201012345678", userId: "u-1" } },
      })
    );
    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.create).toMatchObject({
      phone: "201012345678",
      email: "client@shop.com", // normalized
      userId: "u-1",
      name: "أحمد",
    });
    expect(args.update).toMatchObject({ name: "أحمد", email: "client@shop.com" });
  });

  it("2) إيميل بس (مفيش رقم) → صف جديد بالإيميل بس ومش بيتجاهل", async () => {
    await upsertStoreContact({
      userId: "u-1",
      phone: undefined,
      email: "MAIL@Example.com",
      updateName: "منى",
      createName: "منى",
    });

    expect(mockPrisma.contact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email_userId: { email: "mail@example.com", userId: "u-1" } },
      })
    );
    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.create).toMatchObject({ email: "mail@example.com", name: "منى" });
    expect(args.create.phone).toBeUndefined();
  });

  it("3) رقم بس (زي القديم) → نفس السلوك، والإيميل مش بيتمسح", async () => {
    await upsertStoreContact({
      userId: "u-1",
      phone: "201012345678",
      email: undefined,
      updateName: "كريم",
      createName: "كريم",
    });

    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ phone_userId: { phone: "201012345678", userId: "u-1" } });
    expect(args.update).toMatchObject({ name: "كريم" });
    expect("email" in args.update).toBe(false); // اللي في الـDB بيفضل زي ما هو
    expect(args.create.email).toBeUndefined();
  });

  it("4) نفس الرقم بإيميل مختلف → تحديث الإيميل على نفس الصف", async () => {
    mockPrisma.contact.upsert.mockResolvedValue({ id: "c-existing" });

    const res = await upsertStoreContact({
      userId: "u-1",
      phone: "201012345678",
      email: "new@mail.com",
      updateName: undefined,
      createName: "x",
    });

    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.update).toMatchObject({ email: "new@mail.com" });
    expect(res).toEqual({ id: "c-existing" });
    // متعملش صف جديد — upsert واحد بس ومفيش update منفصل
    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
  });

  it("دمج: رقم جديد على إيميل مربوط بصف بدون رقم → تحديث نفس الصف (مش صف مكرر)", async () => {
    mockPrisma.contact.upsert.mockRejectedValueOnce(p2002());

    await upsertStoreContact({
      userId: "u-1",
      phone: "201099988877",
      email: "same@mail.com",
      updateName: "سامي",
      createName: "سامي",
    });

    expect(mockPrisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email_userId: { email: "same@mail.com", userId: "u-1" } },
      })
    );
    const args = mockPrisma.contact.update.mock.calls[0][0];
    expect(args.data).toMatchObject({ phone: "201099988877", name: "سامي" });
  });

  it("لا رقم ولا إيميل → throw (الكولر يعمل skip)", async () => {
    await expect(
      upsertStoreContact({ userId: "u-1", createName: "x" })
    ).rejects.toThrow();
    expect(mockPrisma.contact.upsert).not.toHaveBeenCalled();
  });

  it("normalizeContactEmail", () => {
    expect(normalizeContactEmail("  A@B.Co ")).toBe("a@b.co");
    expect(normalizeContactEmail("")).toBeUndefined();
    expect(normalizeContactEmail(null)).toBeUndefined();
    expect(normalizeContactEmail(undefined)).toBeUndefined();
  });
});
