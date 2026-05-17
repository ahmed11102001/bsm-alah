// src/__tests__/queue.test.ts
// ─── اختبار Queue Processor ────────────────────────────────────────────────────
// بعد الـ refactor: processQueue بقت fan-out لـ Inngest
// والـ processing الفعلي بيحصل في processQueueItem (Inngest function)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueueStatus, CampaignStatus, MessageStatus, MessageType, MessageDirection } from "@/types/enums";

// ─── Mock sendWhatsAppMessage ─────────────────────────────────────────────────
const mockSendWhatsApp = vi.fn();
vi.mock("@/lib/whatsapp-api", () => ({
  sendWhatsAppMessage: mockSendWhatsApp,
  QUEUE_CONSTANTS: {
    DELAY_BETWEEN_MSGS: 0,
    BACKOFF_STEPS_SEC:  [60, 300, 900, 3600],
    TIER_DAILY_LIMIT:   { 1: 1000, 2: 10000, 3: 100000, 4: Infinity },
    TIER_BATCH_SIZE:    { 1: 10,   2: 30,    3: 80,     4: 150 },
  },
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockPrisma = {
  whatsAppAccount: { findMany: vi.fn(), update: vi.fn() },
  messageQueue:    { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), count: vi.fn(), createMany: vi.fn(), create: vi.fn() },
  campaign:        { update: vi.fn(), findMany: vi.fn() },
  message:         { create: vi.fn(), update: vi.fn() },
  contact:         { findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  subscription:    { findUnique: vi.fn(), update: vi.fn() },
  $transaction:    vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/notifications", () => ({
  notifyPlanLimitReached: vi.fn(),
  createNotification:     vi.fn(),
  notifyCampaignSuccess:  vi.fn(),
  notifyCampaignFailed:   vi.fn(),
  notifyCampaignPartial:  vi.fn(),
}));

// ─── Mock Inngest ─────────────────────────────────────────────────────────────
const mockInngestSend = vi.fn().mockResolvedValue(undefined);
vi.mock("@/inngest/client", () => ({
  inngest: {
    send:           mockInngestSend,
    // createFunction بيأخد (config, handler) ويرجع object فيه handler للـ testing
    createFunction: (config: any, handler: any) => ({ id: config.id, handler }),
  },
}));

const { processQueue, enqueueCampaign, triggerScheduledCampaigns } =
  await import("@/lib/queue");

// ─── Stubs ────────────────────────────────────────────────────────────────────
const stubAccount = {
  id: "acc_1", phoneNumberId: "phone_1", accessToken: "TOKEN",
  messagingTier: 1, dailySentCount: 0, dailyResetAt: new Date(),
  backoffCount: 0, backoffUntil: null,
};

function makeQueueItem(overrides: Record<string, any> = {}) {
  return {
    id: "q_1", userId: "user_1", whatsappAccountId: "acc_1",
    toPhone: "201012345678", contactId: "contact_1",
    messageType: "template", templateName: "order_confirm",
    templateLang: "ar", templateVars: null, content: null,
    campaignId: "camp_1", attempts: 0, maxAttempts: 3,
    phoneNumberId: "phone_1", existingMessageId: null,
    whatsappAccount: stubAccount,
    ...overrides,
  };
}

/** Mock step object لاختبار Inngest functions ──────────────────────────────── */
function makeStep(overrides: Record<string, any> = {}) {
  return {
    run:   vi.fn().mockImplementation((_name: string, fn: () => any) => fn()),
    sleep: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInngestSend.mockResolvedValue(undefined);

  mockPrisma.whatsAppAccount.findMany.mockResolvedValue([stubAccount]);
  mockPrisma.whatsAppAccount.update.mockResolvedValue({});
  mockPrisma.messageQueue.findMany.mockResolvedValue([]);
  mockPrisma.messageQueue.findUnique.mockResolvedValue(null);
  mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.messageQueue.update.mockResolvedValue({});
  mockPrisma.messageQueue.count.mockResolvedValue(0);
  mockPrisma.campaign.update.mockResolvedValue({ queuedCount: 0, status: "running" });
  mockPrisma.message.create.mockResolvedValue({ id: "msg_1" });
  mockPrisma.message.update.mockResolvedValue({});
  mockPrisma.contact.findFirst.mockResolvedValue({ id: "contact_1" });
  mockPrisma.contact.upsert.mockResolvedValue({ id: "contact_1" });
  mockPrisma.contact.update.mockResolvedValue({});
  mockPrisma.$transaction.mockImplementation((fn: any) =>
    typeof fn === "function" ? fn(mockPrisma) : Promise.all(fn)
  );
  mockSendWhatsApp.mockResolvedValue({ ok: true, whatsappMsgId: "wamid.001" });
});

// ═══════════════════════════════════════════════════════════════════════════════
// processQueue — Fan-out to Inngest
// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueue — Fan-out to Inngest", () => {
  it("لو مفيش رسائل → بيرجع processed:0 ومش بيبعت events", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([]);
  mockPrisma.messageQueue.findUnique.mockResolvedValue(null);
    const result = await processQueue();
    expect(result.processed).toBe(0);
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("رسالة واحدة → بيبعت event لـ Inngest", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([
      makeQueueItem({ id: "q_1", phoneNumberId: "phone_1" }),
    ]);
    const result = await processQueue();
    expect(result.processed).toBe(1);
    expect(mockInngestSend).toHaveBeenCalledOnce();
    expect(mockInngestSend).toHaveBeenCalledWith([
      expect.objectContaining({ name: "queue/process-item", data: { queueId: "q_1", phoneNumberId: "phone_1" } }),
    ]);
  });

  it("3 رسائل → بيبعت 3 events دفعة واحدة", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([
      makeQueueItem({ id: "q_1", phoneNumberId: "phone_1" }),
      makeQueueItem({ id: "q_2", phoneNumberId: "phone_1" }),
      makeQueueItem({ id: "q_3", phoneNumberId: "phone_2" }),
    ]);
    const result = await processQueue();
    expect(result.processed).toBe(3);
    expect(mockInngestSend).toHaveBeenCalledOnce();
    const events = mockInngestSend.mock.calls[0][0];
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ name: "queue/process-item", data: { queueId: "q_1" } });
    expect(events[2]).toMatchObject({ name: "queue/process-item", data: { queueId: "q_3" } });
  });

  it("بيجيب الـ pending items اللي scheduledAt <= now فقط", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([]);
  mockPrisma.messageQueue.findUnique.mockResolvedValue(null);
    await processQueue();
    expect(mockPrisma.messageQueue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status:      QueueStatus.pending,
          scheduledAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      })
    );
  });

  it("مش بيبعت لـ sendWhatsAppMessage مباشرة (ده شغل Inngest)", async () => {
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem()]);
    await processQueue();
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("مفيش accounts → الـ fan-out شغال بدون اعتماد عليهم", async () => {
    mockPrisma.whatsAppAccount.findMany.mockResolvedValue([]);
    mockPrisma.messageQueue.findMany.mockResolvedValue([makeQueueItem({ id: "q_1" })]);
    const result = await processQueue();
    expect(result.processed).toBe(1);
    expect(mockInngestSend).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// processQueueItem — الـ Inngest function اللي بتنفذ الإرسال الفعلي
// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueueItem — Happy Path", () => {
  it("رسالة واحدة → بتتبعت وتحفظ", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });

    const result = await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    expect(mockSendWhatsApp).toHaveBeenCalled();
    expect(result?.ok).toBe(true);
  });

  it("بيعمل status=processing فوراً (atomic lock يمنع double-send)", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });

    await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    // claim-item step بيعمل updateMany لـ pending → processing
    expect(mockPrisma.messageQueue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: QueueStatus.pending }),
        data:  expect.objectContaining({ status: QueueStatus.processing }),
      })
    );
  });

  it("بعد النجاح بيعمل status=sent ويحفظ whatsappMsgId", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });

    await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status:        QueueStatus.sent,
          whatsappMsgId: "wamid.001",
        }),
      })
    );
  });

  it("بيعمل step.sleep بعد الإرسال (delay على Inngest مش Vercel)", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });

    await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    expect(step.sleep).toHaveBeenCalledWith("rate-limit-delay", "350ms");
  });

  it("لو الـ item مش pending → بيعمل skip", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.sent }));

    const result = await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(result?.skipped).toBe(true);
  });

  it("مفيش item في الـ DB → بيعمل skip", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(null);

    const result = await (processQueueItem as any).handler({
      event: { data: { queueId: "q_not_exist", phoneNumberId: "phone_1" } },
      step,
    });

    expect(result?.skipped).toBe(true);
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueueItem — Rate Limiting & Backoff", () => {
  it("rate limit (429) → يوقف الـ account ويعمل backoff", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockSendWhatsApp.mockResolvedValue({ ok: false, isRateLimit: true, error: "Rate limit" });
    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });

    await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    expect(mockPrisma.whatsAppAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ backoffCount: { increment: 1 } }),
      })
    );
    // المتجر بيرجع لـ pending مش failed
    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: QueueStatus.pending }),
      })
    );
  });

  it("فشل عادي → بيزوّد attempts ويعمل retry بعد 5 دقائق", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockSendWhatsApp.mockResolvedValue({ ok: false, isRateLimit: false, error: "Network error" });
    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending, attempts: 0, maxAttempts: 3 }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });

    try {
      await (processQueueItem as any).handler({
        event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
        step,
      });
    } catch { /* Inngest بيعمل retry عند الـ throw */ }

    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status:  QueueStatus.pending,
          attempts: { increment: 1 },
        }),
      })
    );
  });

  it("وصل maxAttempts → بيعمل status=failed نهائي", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockSendWhatsApp.mockResolvedValue({ ok: false, isRateLimit: false, error: "Final fail" });
    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending, attempts: 2, maxAttempts: 3 }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });

    await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    }).catch(() => {});

    expect(mockPrisma.messageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: QueueStatus.failed }),
      })
    );
  });

  it("الـ account في backoff → بيعمل skip", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    const future = new Date(Date.now() + 60_000);
    mockPrisma.messageQueue.findUnique.mockResolvedValue(
      makeQueueItem({
        status: QueueStatus.pending,
        whatsappAccount: { ...stubAccount, backoffUntil: future },
      })
    );

    const result = await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(result?.skipped).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("processQueueItem — Campaign Completion", () => {
  it("لما تخلص الرسائل كلها → الحملة بتبقى completed", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.campaign.update.mockResolvedValue({ queuedCount: 0, status: CampaignStatus.running });

    await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    const calls = mockPrisma.campaign.update.mock.calls;
    const completionCall = calls.find((c: any[]) =>
      c[0]?.data?.status === CampaignStatus.completed
    );
    expect(completionCall).toBeDefined();
  });

  it("لما يفضل رسائل pending → الحملة مبتكملش", async () => {
    const { processQueueItem } = await import("@/inngest/functions");
    const step = makeStep();

    mockPrisma.messageQueue.findUnique.mockResolvedValue(makeQueueItem({ status: QueueStatus.pending }));
    mockPrisma.messageQueue.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.campaign.update.mockResolvedValue({ queuedCount: 5, status: CampaignStatus.running });

    await (processQueueItem as any).handler({
      event: { data: { queueId: "q_1", phoneNumberId: "phone_1" } },
      step,
    });

    const calls = mockPrisma.campaign.update.mock.calls;
    const completionCall = calls.find((c: any[]) =>
      c[0]?.data?.status === CampaignStatus.completed
    );
    expect(completionCall).toBeUndefined();
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
      campaignId: "camp_1", userId: "user_1",
      numbers: ["201011111111", "201022222222", "201033333333"],
      templateName: "test_template",
      whatsappAccountId: "acc_1", phoneNumberId: "phone_1", accessToken: "TOKEN",
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
      whatsappAccountId: "acc_1", phoneNumberId: "phone_1", accessToken: "TOKEN",
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
      whatsappAccountId: "acc_1", phoneNumberId: "phone_1", accessToken: "TOKEN",
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
      whatsappAccountId: "acc_1", phoneNumberId: "phone_1", accessToken: "TOKEN",
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