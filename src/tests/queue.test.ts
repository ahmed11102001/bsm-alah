// src/__tests__/queue.test.ts
// ─── اختبار Queue Processor ────────────────────────────────────────────────────
// ده اللي بيبعت الحملات فعلاً. لو فيه bug:
//   - رسائل بتتبعت مرتين (double send)
//   - rate limit مش بيتطبق → حساب واتساب بيتبان
//   - الحملة مبتكملش → status بيفضل "running" للأبد

import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueueStatus, CampaignStatus, MessageStatus, MessageType, MessageDirection } from "@/types/enums";

// ─── Mock sendWhatsAppMessage ─────────────────────────────────────────────────
const mockSendWhatsApp = vi.fn();
vi.mock("@/lib/whatsapp-api", () => ({
  sendWhatsAppMessage: mockSendWhatsApp,
  QUEUE_CONSTANTS: {
    DELAY_BETWEEN_MSGS: 0,        // zero delay في الـ tests
    BACKOFF_STEPS_SEC:  [60, 300, 900, 3600],
    TIER_DAILY_LIMIT:   { 1: 1000, 2: 10000, 3: 100000, 4: Infinity },
    TIER_BATCH_SIZE:    { 1: 10,   2: 30,    3: 80,     4: 150 },
  },
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockPrisma = {
  whatsAppAccount: {
    findMany: vi.fn(),
    update:   vi.fn(),
  },
  messageQueue: {
    findMany:    vi.fn(),
    updateMany:  vi.fn(),
    update:      vi.fn(),
    count:       vi.fn(),
    createMany:  vi.fn(),
    create:      vi.fn(),
  },
  campaign: {
    update:  vi.fn(),
    findMany: vi.fn(),
  },
  message: {
    create: vi.fn(),
    update: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
    upsert:    vi.fn(),
    update:    vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    update:     vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/notifications", () => ({
  notifyPlanLimitReached: vi.fn(),
  createNotification:     vi.fn(),
  notifyCampaignSuccess:  vi.fn(),
  notifyCampaignFailed:   vi.fn(),
  notifyCampaignPartial:  vi.fn(),
}));

const { processQueue, enqueueCampaign, enqueueDirectMessage, triggerScheduledCampaigns } =
  await import("@/lib/queue");

// ─── Stubs ────────────────────────────────────────────────────────────────────
const stubAccount = {
  id:             "acc_1",
  phoneNumberId:  "phone_1",
  accessToken:    "TOKEN",
  messagingTier:  1,
  dailySentCount: 0,
  dailyResetAt:   new Date(),
  backoffCount:   0,
  backoffUntil:   null,
};

function makeQueueItem(overrides = {}) {
  return {
    id:                "q_1",
    userId:            "user_1",
    whatsappAccountId: "acc_1",
    toPhone:           "201012345678",
    contactId:         "contact_1",
    messageType:       "template",
    templateName:      "order_confirm",
    templateLang:      "ar",
    templateVars:      null,
    content:           null,
    campaignId:        "camp_1",
    attempts:          0,
    maxAttempts:       3,
    phoneNumberId:     "phone_1",
    existingMessageId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.whatsAppAccount.findMany.mockResolvedValue([stubAccount]);
  mockPrisma.whatsAppAccount.update.mockResolvedValue({});
  mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.messageQueue.update.mockResolvedValue({});
  mockPrisma.messageQueue.count.mockResolvedValue(0);
  mockPrisma.campaign.update.mockResolvedValue({ queuedCount: 0, status: "running" });
  mockPrisma.message.create.mockResolvedValue({ id: "msg_1" });
  mockPrisma.message.update.mockResolvedValue({});
  mockPrisma.contact.findFirst.mockResolvedValue({ id: "contact_1" });
  mockPrisma.contact.upsert.mockResolvedValue({ id: "contact_1" });
  mockPrisma.contact.update.mockResolvedValue({});

  // $transaction بيشغّل الـ callback
  mockPrisma.$transaction.mockImplementation((fn: any) =>
    typeof fn === "function" ? fn(mockPrisma) : Promise.all(fn)
  );

  // الافتراضي: batch فاضي (مفيش رسائل)
  mockPrisma.messageQueue.findMany.mockResolvedValue([]);
  mockSendWhatsApp.mockResolvedValue({ ok: true, whatsappMsgId: "wamid.001" });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueue — Happy Path", () => {
  it("لو مفيش رسائل → بيرجع processed:0", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([]);
    const result = await processQueue();
    expect(result.processed).toBe(0);
    expect(result.sent).toBe(0);
  });

  it("رسالة واحدة → بتتبعت وتحفظ", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);

    const result = await processQueue();

    expect(mockSendWhatsApp).toHaveBeenCalledOnce();
    expect(result.sent).toBe(1);
    expect(result.processed).toBe(1);
  });

  it("بيبعت الـ params الصحيحة لـ sendWhatsAppMessage", async () => {
    const item = makeQueueItem({
      templateName: "order_confirmed",
      templateLang: "ar",
      templateVars: { body: ["أحمد"] },
    });
    mockPrisma.messageQueue.findMany.mockResolvedValue([item]);

    await processQueue();

    expect(mockSendWhatsApp).toHaveBeenCalledWith(
      expect.objectContaining({
        toPhone:      "201012345678",
        phoneNumberId: "phone_1",
        accessToken:   "TOKEN",
        templateName:  "order_confirmed",
        templateLang:  "ar",
        templateVars:  { body: ["أحمد"] },
      })
    );
  });

  it("بيعمل status=processing فوراً (atomic lock يمنع double-send)", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);

    await processQueue();

    // الـ updateMany الأول لازم يكون processing
    expect(mockPrisma.messageQueue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: QueueStatus.processing, processedAt: expect.any(Date) },
      })
    );
  });

  it("بعد النجاح بيعمل status=sent ويحفظ whatsappMsgId", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);

    await processQueue();

    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status:        QueueStatus.sent,
          whatsappMsgId: "wamid.001",
        }),
      })
    );
  });

  it("بيزوّد dailySentCount بعد كل رسالة ناجحة", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);

    await processQueue();

    expect(mockPrisma.whatsAppAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { dailySentCount: { increment: 1 } },
      })
    );
  });

  it("بيعمل campaign.update بـ sentCount increment", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);

    await processQueue();

    expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sentCount: { increment: 1 } }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueue — Rate Limiting & Backoff", () => {
  it("rate limit (429) → يوقف الـ account ويعمل backoff", async () => {
    mockSendWhatsApp.mockResolvedValue({ ok: false, isRateLimit: true });
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);

    const result = await processQueue();

    expect(result.skipped).toBe(1);
    // لازم يعمل backoff على الـ account
    expect(mockPrisma.whatsAppAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "acc_1" },
        data: expect.objectContaining({
          backoffUntil: expect.any(Date),
          backoffCount: { increment: 1 },
        }),
      })
    );
    // الرسالة ترجع pending مش failed
    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: QueueStatus.pending }),
      })
    );
  });

  it("بعد rate limit، باقي الـ batch بيتعمله skip (مش بيتبعت)", async () => {
    // رسالتين — الأولى بترد بـ rate limit
    mockSendWhatsApp
      .mockResolvedValueOnce({ ok: false, isRateLimit: true })
      .mockResolvedValueOnce({ ok: true, whatsappMsgId: "wamid.002" });

    mockPrisma.messageQueue.findMany.mockResolvedValue([
      makeQueueItem({ id: "q_1" }),
      makeQueueItem({ id: "q_2" }),
    ]);

    const result = await processQueue();

    // الأولى rate limited، الثانية skip
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1); // مش 2
    expect(result.skipped).toBe(2); // q_1 (rate limit) + q_2 (account blocked)
  });

  it("token error (code 190) → بيعمل queue failed ويوقف الـ account", async () => {
    // لازم نـ override الـ default mock بعد beforeEach
    mockSendWhatsApp.mockReset();
    mockSendWhatsApp.mockResolvedValue({
      ok: false, isTokenError: true, error: "Invalid OAuth access token",
    });
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem({ id: "q_1" })]);

    await processQueue();

    // بيعمل update بـ status=failed على الـ queue item
    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: QueueStatus.failed }),
      })
    );
    // مش بيعمل backoff (token error مختلف عن rate limit)
    const backoffCall = mockPrisma.whatsAppAccount.update.mock.calls.find((c: any[]) =>
      c[0]?.data?.backoffUntil
    );
    expect(backoffCall).toBeUndefined();
  });

  it("daily limit → بيعمل skip للـ account كله", async () => {
    const fullAccount = { ...stubAccount, dailySentCount: 1000 }; // وصل الحد
    mockPrisma.whatsAppAccount.findMany.mockResolvedValue([fullAccount]);

    const result = await processQueue();

    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it("مفيش accounts → بيرجع فوراً", async () => {
    mockPrisma.whatsAppAccount.findMany.mockResolvedValue([]);

    const result = await processQueue();

    expect(result.processed).toBe(0);
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueue — Retry Logic", () => {
  it("فشل عادي (مش rate limit) → بيزوّد attempts ويعمل retry بعد 5 دقائق", async () => {
    mockSendWhatsApp.mockResolvedValue({ ok: false, error: "Unknown error" });
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem({ attempts: 0, maxAttempts: 3 })]);

    await processQueue();

    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status:      QueueStatus.pending, // مش failed لأن لسه في attempts
          attempts:    { increment: 1 },
          nextRetryAt: expect.any(Date),
        }),
      })
    );
  });

  it("وصل maxAttempts → بيعمل status=failed نهائي", async () => {
    mockSendWhatsApp.mockResolvedValue({ ok: false, error: "Persistent error" });
    mockPrisma.messageQueue.findMany.mockResolvedValue([
      makeQueueItem({ attempts: 2, maxAttempts: 3 }), // المحاولة الأخيرة
    ]);

    await processQueue();

    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: QueueStatus.failed }),
      })
    );
  });

  it("فشل نهائي بـ existingMessageId → بيعمل message.update بـ failed", async () => {
    mockSendWhatsApp.mockResolvedValue({ ok: false, error: "Final error" });
    mockPrisma.messageQueue.findMany.mockResolvedValue([
      makeQueueItem({ attempts: 2, maxAttempts: 3, existingMessageId: "msg_existing", campaignId: null }),
    ]);

    await processQueue();

    expect(mockPrisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg_existing" },
        data:  expect.objectContaining({ status: MessageStatus.failed }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueue — Campaign Completion", () => {
  it("لما تخلص الرسائل كلها → الحملة بتبقى completed", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);
    mockPrisma.messageQueue.count.mockResolvedValue(0); // مفيش pending/processing
    mockPrisma.campaign.update.mockResolvedValue({ queuedCount: 0, status: "running" });

    await processQueue();

    // لازم يعمل update بـ completed
    const calls = mockPrisma.campaign.update.mock.calls;
    const completionCall = calls.find((c: any[]) =>
      c[0]?.data?.status === CampaignStatus.completed
    );
    expect(completionCall).toBeDefined();
  });

  it("لما يفضل رسائل pending → الحملة مبتكملش", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);
    mockPrisma.messageQueue.count.mockResolvedValue(5); // لسه في رسائل
    mockPrisma.campaign.update.mockResolvedValue({ queuedCount: 5, status: "running" });

    await processQueue();

    const calls = mockPrisma.campaign.update.mock.calls;
    const completionCall = calls.find((c: any[]) =>
      c[0]?.data?.status === CampaignStatus.completed
    );
    expect(completionCall).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueue — Backoff Clearing", () => {
  it("بعد نجاح ورسالة، لو الـ account كان في backoff → بيتصفر", async () => {
    const accountWithBackoff = { ...stubAccount, backoffCount: 2 };
    mockPrisma.whatsAppAccount.findMany.mockResolvedValue([accountWithBackoff]);
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);

    await processQueue();

    // clearBackoff بيعمل update بـ backoffUntil: null
    expect(mockPrisma.whatsAppAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { backoffUntil: null, backoffCount: 0 },
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("enqueueCampaign", () => {
  beforeEach(() => {
    mockPrisma.messageQueue.createMany.mockResolvedValue({ count: 3 });
    mockPrisma.campaign.update.mockResolvedValue({});
  });

  it("بيعمل createMany بعدد الـ numbers", async () => {
    await enqueueCampaign({
      campaignId:        "camp_1",
      userId:            "user_1",
      numbers:           ["201011111111", "201022222222", "201033333333"],
      templateName:      "test_template",
      whatsappAccountId: "acc_1",
      phoneNumberId:     "phone_1",
      accessToken:       "TOKEN",
    });

    expect(mockPrisma.messageQueue.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ toPhone: "201011111111", templateName: "test_template" }),
          expect.objectContaining({ toPhone: "201022222222" }),
          expect.objectContaining({ toPhone: "201033333333" }),
        ]),
      })
    );
  });

  it("بعد الإضافة بيعمل campaign.update بـ status=running", async () => {
    await enqueueCampaign({
      campaignId: "camp_1", userId: "user_1",
      numbers: ["201011111111"],
      templateName: "test_template",
      whatsappAccountId: "acc_1",
      phoneNumberId: "phone_1",
      accessToken: "TOKEN",
    });

    expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: CampaignStatus.running }),
      })
    );
  });

  it("scheduledAt مستقبلي → status=scheduled", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    await enqueueCampaign({
      campaignId: "camp_1", userId: "user_1",
      numbers: ["201011111111"],
      templateName: "test_template",
      scheduledAt: future,
      whatsappAccountId: "acc_1",
      phoneNumberId: "phone_1",
      accessToken: "TOKEN",
    });

    expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: CampaignStatus.scheduled }),
      })
    );
  });

  it("بيرجع عدد الـ queued messages", async () => {
    const result = await enqueueCampaign({
      campaignId: "camp_1", userId: "user_1",
      numbers: ["201011111111", "201022222222"],
      templateName: "test_template",
      whatsappAccountId: "acc_1",
      phoneNumberId: "phone_1",
      accessToken: "TOKEN",
    });

    expect(result.queued).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("triggerScheduledCampaigns", () => {
  it("لو مفيش حملات scheduled → بيرجع 0", async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    const count = await triggerScheduledCampaigns();
    expect(count).toBe(0);
  });

  it("حملة scheduled حان وقتها → بتتحول لـ running", async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([{ id: "camp_scheduled" }]);

    const count = await triggerScheduledCampaigns();

    expect(count).toBe(1);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});