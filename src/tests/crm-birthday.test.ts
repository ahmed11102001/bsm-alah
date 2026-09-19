import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  contact: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  emailAutomation: {
    findMany: vi.fn(),
  },
  emailDelivery: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const mockGetEmailConnection = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/email-marketing/connection", () => ({
  getEmailConnection: mockGetEmailConnection,
}));
vi.mock("@/lib/email-marketing/sender", () => ({
  sendEmailViaUserSmtp: mockSendEmail,
}));

import { parseBirthDate } from "@/lib/crm/birthdate";
import { processImportRows } from "@/lib/crm/import-shared";
import { upsertStoreContact } from "@/lib/store-contacts";
import {
  runBirthdayAutomations,
  isBirthdayToday,
  sentThisYear,
  cairoToday,
} from "@/lib/email-marketing/birthday";

describe("parseBirthDate", () => {
  it("YYYY-MM-DD", () => {
    const d = parseBirthDate("1990-05-17");
    expect(d).not.toBeNull();
    expect(d!.toISOString().slice(0, 10)).toBe("1990-05-17");
  });

  it("DD/MM/YYYY", () => {
    const d = parseBirthDate("17/05/1990");
    expect(d?.toISOString().slice(0, 10)).toBe("1990-05-17");
  });

  it("DD-MM-YYYY و DD.MM.YYYY", () => {
    expect(parseBirthDate("17-05-1990")?.toISOString().slice(0, 10)).toBe("1990-05-17");
    expect(parseBirthDate("17.05.1990")?.toISOString().slice(0, 10)).toBe("1990-05-17");
  });

  it("تواريخ مستحيلة ومستقبلية مرفوضة", () => {
    expect(parseBirthDate("31/02/2000")).toBeNull();
    expect(parseBirthDate("1990-13-01")).toBeNull();
    expect(parseBirthDate("not a date")).toBeNull();
    expect(parseBirthDate("")).toBeNull();
    expect(parseBirthDate(null)).toBeNull();
    const nextYear = new Date().getUTCFullYear() + 1;
    expect(parseBirthDate(`${nextYear}-01-01`)).toBeNull();
  });

  it("الرقم التسلسلي بتاع Excel", () => {
    // 17/05/1990 = serial 33010
    const d = parseBirthDate(33010);
    expect(d?.toISOString().slice(0, 10)).toBe("1990-05-17");
  });
});

describe("import-shared — تاريخ الميلاد والمدينة", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.contact.findUnique.mockResolvedValue(null);
    mockPrisma.contact.upsert.mockImplementation(async (a: any) => ({ id: "c-1", ...a.create }));
  });

  it("صف بتاريخ DD/MM/YYYY ومدينة → يتسجلوا", async () => {
    const summary = await processImportRows("u-1", [
      { name: "سلمى", phone: "01012345678", birthDate: "17/05/1990", city: "القاهرة" },
    ]);
    expect(summary.added).toBe(1);
    expect(summary.invalidBirthDates).toBe(0);
    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.create.birthDate?.toISOString().slice(0, 10)).toBe("1990-05-17");
    expect(args.create.city).toBe("القاهرة");
  });

  it("تاريخ غلط → الصف يتقبل والحقل يتجاهل ويترصد", async () => {
    const summary = await processImportRows("u-1", [
      { name: "كريم", email: "k@mail.com", birthDate: "غلط خالص" },
    ]);
    expect(summary.added).toBe(1);
    expect(summary.invalidBirthDates).toBe(1);
    expect(summary.invalidBirthDateRows).toEqual([1]);
    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.create.birthDate).toBeUndefined();
  });
});

describe("upsertStoreContact — birthDate/city زي الإيميل", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.contact.upsert.mockImplementation(async (a: any) => ({ id: "c-1", ...a.create }));
    mockPrisma.contact.update.mockImplementation(async (a: any) => ({ id: "c-1", ...a.data }));
  });

  it("مبعوتين → يتحدثوا مع الإيميل", async () => {
    await upsertStoreContact({
      userId: "u-1",
      phone: "201012345678",
      email: "a@b.co",
      updateName: "x",
      createName: "x",
      birthDate: new Date(Date.UTC(1990, 4, 17)),
      city: "الجيزة",
    });
    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect(args.update).toMatchObject({ city: "الجيزة" });
    expect(args.update.birthDate?.toISOString().slice(0, 10)).toBe("1990-05-17");
  });

  it("مش مبعوتين → اللي موجود بيفضل", async () => {
    await upsertStoreContact({
      userId: "u-1",
      phone: "201012345678",
      updateName: "x",
      createName: "x",
    });
    const args = mockPrisma.contact.upsert.mock.calls[0][0];
    expect("birthDate" in args.update).toBe(false);
    expect("city" in args.update).toBe(false);
  });
});

describe("birthday core — الإرسال ومنع التكرار", () => {
  const NOW = new Date("2026-09-19T08:00:00Z"); // عيد ميلاد 19/09 بتوقيت القاهرة
  const thisYear = cairoToday(NOW).y;

  const automation = (over: any = {}) => ({
    userId: "u-1",
    type: "BIRTHDAY",
    enabled: true,
    templateId: "tpl-1",
    template: { id: "tpl-1", subject: "عيد ميلاد سعيد {{name}}", bodyHtml: "<p>كل سنة وانت طيب {{name}}</p>", previewText: null },
    ...over,
  });

  const contact = (over: any = {}) => ({
    id: "c-1",
    email: "sara@mail.com",
    name: "سارة",
    birthDate: new Date(Date.UTC(1995, 8, 19)), // 19 سبتمبر
    lastBirthdayEmailSentAt: null,
    ...over,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmailConnection.mockResolvedValue({
      host: "smtp.x.com",
      user: "u",
      password: "p",
      lastTestSuccess: true,
    });
    mockSendEmail.mockResolvedValue({ success: true, messageId: "m-1" });
    mockPrisma.emailDelivery.create.mockImplementation(async (a: any) => ({ id: "d-1", ...a.data }));
    mockPrisma.emailDelivery.update.mockResolvedValue({});
    mockPrisma.contact.update.mockResolvedValue({});
  });

  it("عيد ميلاده النهاردة ومتبعتلوش → إرسال + تحديث lastBirthdayEmailSentAt", async () => {
    mockPrisma.emailAutomation.findMany.mockResolvedValue([automation()]);
    mockPrisma.contact.findMany.mockResolvedValue([contact()]);

    const s = await runBirthdayAutomations(NOW);
    expect(s.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ to: "sara@mail.com", recipientName: "سارة" })
    );
    expect(mockPrisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c-1" },
        data: expect.objectContaining({ lastBirthdayEmailSentAt: expect.any(Date) }),
      })
    );
    expect(mockPrisma.emailDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ campaignId: null, contactEmail: "sara@mail.com" }),
      })
    );
  });

  it("اتبعتله السنة دي → مفيش إرسال تاني (نفس اليوم)", async () => {
    mockPrisma.emailAutomation.findMany.mockResolvedValue([automation()]);
    mockPrisma.contact.findMany.mockResolvedValue([
      contact({ lastBirthdayEmailSentAt: new Date(Date.UTC(thisYear, 2, 10)) }),
    ]);

    const s = await runBirthdayAutomations(NOW);
    expect(s.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("اتبعتله سنة فاتت → يتبعت عادي", async () => {
    mockPrisma.emailAutomation.findMany.mockResolvedValue([automation()]);
    mockPrisma.contact.findMany.mockResolvedValue([
      contact({ lastBirthdayEmailSentAt: new Date(Date.UTC(thisYear - 1, 8, 19)) }),
    ]);

    const s = await runBirthdayAutomations(NOW);
    expect(s.sent).toBe(1);
  });

  it("مش عيد ميلاده → يتجاهل", async () => {
    mockPrisma.emailAutomation.findMany.mockResolvedValue([automation()]);
    mockPrisma.contact.findMany.mockResolvedValue([
      contact({ birthDate: new Date(Date.UTC(1995, 0, 5)) }),
    ]);

    const s = await runBirthdayAutomations(NOW);
    expect(s.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("SMTP مش شغال أو مفيش قالب → skip من غير إرسال", async () => {
    mockPrisma.emailAutomation.findMany.mockResolvedValue([
      automation(),
      automation({ userId: "u-2", templateId: null, template: null }),
      automation({ userId: "u-3" }),
    ]);
    mockGetEmailConnection.mockImplementation(async (uid: string) =>
      uid === "u-3"
        ? { host: "smtp.x.com", user: "u", password: "p", lastTestSuccess: false }
        : { host: "smtp.x.com", user: "u", password: "p", lastTestSuccess: true }
    );
    mockPrisma.contact.findMany.mockResolvedValue([contact()]);

    const s = await runBirthdayAutomations(NOW);
    expect(s.sent).toBe(1);
    expect(s.skippedNoConnection).toBe(1);
    expect(s.skippedNoTemplate).toBe(1);
  });

  it("isBirthdayToday / sentThisYear helpers", () => {
    expect(isBirthdayToday(new Date(Date.UTC(2000, 8, 19)), { m: 9, d: 19 })).toBe(true);
    expect(isBirthdayToday(new Date(Date.UTC(2000, 8, 20)), { m: 9, d: 19 })).toBe(false);
    expect(sentThisYear(null, 2026)).toBe(false);
    expect(sentThisYear(new Date(Date.UTC(2026, 0, 1)), 2026)).toBe(true);
    expect(sentThisYear(new Date(Date.UTC(2025, 11, 31)), 2026)).toBe(false);
  });
});
