import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  emailAutomation: {
    findUnique: vi.fn(),
  },
  storeOrder: {
    findFirst: vi.fn(),
  },
  emailDelivery: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const mockSendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/email-marketing/sender", () => ({
  sendEmailViaUserSmtp: mockSendEmail,
}));

import {
  loadPostDeliverySetup,
  loadOrderContact,
  sendPostDeliveryEmail,
} from "@/inngest/email-post-delivery-functions";

const automation = (over: any = {}) => ({
  userId: "u-1",
  type: "POST_DELIVERY",
  enabled: true,
  templateId: "tpl-1",
  template: { id: "tpl-1", subject: "شكرًا لطلبك {{name}}", bodyHtml: "<p>قيّمنا</p>", previewText: null },
  ...over,
});

describe("post-delivery helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true, messageId: "m-1" });
    mockPrisma.emailDelivery.create.mockImplementation(async (a: any) => ({ id: "d-1", ...a.data }));
    mockPrisma.emailDelivery.update.mockResolvedValue({});
  });

  it("الأتمتة مقفولة أو من غير قالب → null", async () => {
    mockPrisma.emailAutomation.findUnique.mockResolvedValue(null);
    expect(await loadPostDeliverySetup("u-1")).toBeNull();

    mockPrisma.emailAutomation.findUnique.mockResolvedValue(automation({ enabled: false }));
    expect(await loadPostDeliverySetup("u-1")).toBeNull();

    mockPrisma.emailAutomation.findUnique.mockResolvedValue(
      automation({ templateId: null, template: null })
    );
    expect(await loadPostDeliverySetup("u-1")).toBeNull();
  });

  it("الأتمتة شغالة → بترجع بالقالب", async () => {
    mockPrisma.emailAutomation.findUnique.mockResolvedValue(automation());
    const setup = await loadPostDeliverySetup("u-1");
    expect(setup?.template?.id).toBe("tpl-1");
    expect(mockPrisma.emailAutomation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type: { userId: "u-1", type: "POST_DELIVERY" } },
      })
    );
  });

  it("resolve الـ Contact من StoreOrder (shopify/woocommerce)", async () => {
    mockPrisma.storeOrder.findFirst.mockResolvedValue({
      id: "o-1",
      contact: { id: "c-1", email: "buyer@mail.com", name: "مشتري" },
    });
    const t = await loadOrderContact("u-1", "shopify", 12345);
    expect(t).toMatchObject({ email: "buyer@mail.com", contactId: "c-1" });
    expect(mockPrisma.storeOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u-1",
          source: "shopify",
          externalId: "12345",
        }),
      })
    );
  });

  it("مفيش إيميل للعميل → null (تجاهل)", async () => {
    mockPrisma.storeOrder.findFirst.mockResolvedValue({
      id: "o-1",
      contact: { id: "c-1", email: null, name: "x" },
    });
    expect(await loadOrderContact("u-1", "woocommerce", 9)).toBeNull();

    mockPrisma.storeOrder.findFirst.mockResolvedValue(null);
    expect(await loadOrderContact("u-1", "woocommerce", 9)).toBeNull();
  });

  it("إرسال ناجح → DELIVERED", async () => {
    mockPrisma.emailAutomation.findUnique.mockResolvedValue(automation());
    mockPrisma.storeOrder.findFirst.mockResolvedValue({
      id: "o-1",
      contact: { id: "c-1", email: "buyer@mail.com", name: "مشتري" },
    });

    const r = await sendPostDeliveryEmail("u-1", "shopify", 12345);
    expect(r).toEqual({ sent: true });
    expect(mockSendEmail).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ to: "buyer@mail.com", recipientName: "مشتري" })
    );
    expect(mockPrisma.emailDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ campaignId: null, contactEmail: "buyer@mail.com" }),
      })
    );
    expect(mockPrisma.emailDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DELIVERED" }) })
    );
  });

  it("الأتمتة اتقفلت خلال الانتظار → مفيش إرسال", async () => {
    mockPrisma.emailAutomation.findUnique.mockResolvedValue(automation({ enabled: false }));
    const r = await sendPostDeliveryEmail("u-1", "shopify", 12345);
    expect(r).toEqual({ sent: false, reason: "automation_off" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("فشل الإرسال → FAILED مع السبب", async () => {
    mockPrisma.emailAutomation.findUnique.mockResolvedValue(automation());
    mockPrisma.storeOrder.findFirst.mockResolvedValue({
      id: "o-1",
      contact: { id: "c-1", email: "buyer@mail.com", name: null },
    });
    mockSendEmail.mockResolvedValue({ success: false, error: "SMTP down" });

    const r = await sendPostDeliveryEmail("u-1", "woocommerce", 7);
    expect(r).toEqual({ sent: false, reason: "send_failed" });
    expect(mockPrisma.emailDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) })
    );
  });
});
