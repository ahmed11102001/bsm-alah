// src/tests/handoff-resume.test.ts
// ─── Tests for AI Agent Handoff Auto-Resume ──────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockInngestSend } = vi.hoisted(() => {
  return {
    mockPrisma: {
      aIAgent: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      contact: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      message: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      messageQueue: {
        findFirst: vi.fn(),
      },
    },
    mockInngestSend: vi.fn().mockResolvedValue({ ids: ["event_123"] }),
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock notifications
vi.mock("@/lib/notifications", () => ({
  notifyAiHandoffNeeded: vi.fn().mockResolvedValue(undefined),
  notifyNewMessage: vi.fn().mockResolvedValue(undefined),
}));

// Mock Inngest client
vi.mock("@/inngest/client", () => ({
  inngest: {
    createFunction: (config: any, handler: any) => ({
      config,
      handler,
    }),
    send: (...args: any[]) => mockInngestSend(...args),
  },
}));

import { handoffResumeFn } from "@/inngest/handoff-resume-functions";

describe("AI Agent Handoff Auto-Resume Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockStep = () => {
    return {
      run: vi.fn(async (name: string, fn: () => Promise<any>) => await fn()),
      sleep: vi.fn().mockResolvedValue(undefined),
    };
  };

  // ── Scenario 1: AI handoff → no human reply → Auto Resume after delay ────────
  it("Scenario 1: should auto-resume conversation to AUTO when no human replies", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");
    const handoffAtIso = handoffTime.toISOString();

    // 1. Agent has 3 minutes resume delay
    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: 3,
    });

    // 2. Contact is in NEEDS_HUMAN with matching handoffAt
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "NEEDS_HUMAN",
      handoffAt: handoffTime,
    });

    // 3. No outbound human message after handoffAt
    mockPrisma.message.findFirst.mockResolvedValue(null);

    // 4. Conditional update succeeds
    mockPrisma.contact.updateMany.mockResolvedValue({ count: 1 });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffAtIso,
        },
      },
      step,
    });

    expect(step.sleep).toHaveBeenCalledWith("wait-for-human-response", "3m");
    expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
      where: {
        id: "contact_1",
        aiStatus: "NEEDS_HUMAN",
        handoffAt: handoffTime,
      },
      data: {
        aiStatus: "AUTO",
        handoffReason: null,
        handoffAt: null,
      },
    });
    expect(result).toEqual({ resumed: true });
  });

  // ── Scenario 2: AI handoff → human replies before delay expires → no Auto Resume ──
  it("Scenario 2: should not resume when a human replies before delay expires", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");
    const handoffAtIso = handoffTime.toISOString();

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: 3,
    });

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "NEEDS_HUMAN",
      handoffAt: handoffTime,
    });

    // Human replied at 10:01 (outbound human message)
    mockPrisma.message.findFirst.mockResolvedValue({
      id: "msg_human_reply",
      createdAt: new Date("2026-08-26T10:01:00.000Z"),
    });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffAtIso,
        },
      },
      step,
    });

    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ resumed: false, reason: "human_replied" });
  });

  // ── Scenario 3: AI handoff → customer sends messages only → should not treat as human reply ──
  it("Scenario 3: customer inbound messages during wait do not count as human reply", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");
    const handoffAtIso = handoffTime.toISOString();

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: 3,
    });

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "NEEDS_HUMAN",
      handoffAt: handoffTime,
    });

    // Message query specifically looks for outbound + human: returns null because customer msgs are inbound
    mockPrisma.message.findFirst.mockImplementation((args: any) => {
      if (
        args.where.direction === "outbound" &&
        args.where.senderType === "human"
      ) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    mockPrisma.contact.updateMany.mockResolvedValue({ count: 1 });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffAtIso,
        },
      },
      step,
    });

    expect(result).toEqual({ resumed: true });
    expect(mockPrisma.contact.updateMany).toHaveBeenCalled();
  });

  // ── Scenario 4: Auto Resume disabled → no Auto Resume ────────────────────────
  it("Scenario 4: should not resume if auto-resume is disabled (null or 0)", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: null, // Disabled ("never")
    });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffTime.toISOString(),
        },
      },
      step,
    });

    expect(step.sleep).not.toHaveBeenCalled();
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled();
    expect(result).toEqual({ resumed: false, reason: "auto_resume_disabled" });
  });

  // ── Scenario 5: AI handoff → human replies → existing human pause duration continues ──
  it("Scenario 5: human reply changes status or prevents resume, leaving pauseMinutes intact", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      pauseMinutes: 120,
      handoffResumeMinutes: 3,
    });

    // Contact was changed to HUMAN_ACTIVE by chat route when employee replied
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "HUMAN_ACTIVE",
      handoffAt: handoffTime,
    });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffTime.toISOString(),
        },
      },
      step,
    });

    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ resumed: false, reason: "status_already_HUMAN_ACTIVE" });
  });

  // ── Scenario 6: Timer executes after conversation already became AUTO ────────
  it("Scenario 6: should do nothing if conversation is already AUTO", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: 3,
    });

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "AUTO", // Already manually resumed
      handoffAt: null,
    });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffTime.toISOString(),
        },
      },
      step,
    });

    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ resumed: false, reason: "status_already_AUTO" });
  });

  // ── Scenario 7: Timer executes after human reply → no AI takeover ────────────
  it("Scenario 7: should prevent AI takeover if human outbound message exists", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: 5,
    });

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "NEEDS_HUMAN",
      handoffAt: handoffTime,
    });

    mockPrisma.message.findFirst.mockResolvedValue({
      id: "human_msg_1",
      createdAt: new Date("2026-08-26T10:02:00.000Z"),
      senderType: "human",
      direction: "outbound",
    });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffTime.toISOString(),
        },
      },
      step,
    });

    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ resumed: false, reason: "human_replied" });
  });

  // ── Scenario 8: Race condition protection via conditional update ──────────────
  it("Scenario 8: conditional update with count=0 handles race conditions safely", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: 3,
    });

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "NEEDS_HUMAN",
      handoffAt: handoffTime,
    });

    mockPrisma.message.findFirst.mockResolvedValue(null);

    // Another process updated the record concurrently (e.g. employee replied right at this millisecond)
    mockPrisma.contact.updateMany.mockResolvedValue({ count: 0 });

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffTime.toISOString(),
        },
      },
      step,
    });

    expect(result).toEqual({ resumed: false, reason: "conditional_update_failed" });
  });

  // ── Scenario 9: Setting changed to disabled during wait period ────────────────
  it("Scenario 9: re-checks setting at execution time and halts if disabled during wait", async () => {
    const handoffTime = new Date("2026-08-26T10:00:00.000Z");

    // Initially 3 minutes at start of step 1, then null at step 2
    mockPrisma.aIAgent.findUnique
      .mockResolvedValueOnce({ handoffResumeMinutes: 3 })
      .mockResolvedValueOnce({ handoffResumeMinutes: null });

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "NEEDS_HUMAN",
      handoffAt: handoffTime,
    });

    mockPrisma.message.findFirst.mockResolvedValue(null);

    const step = createMockStep();
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: handoffTime.toISOString(),
        },
      },
      step,
    });

    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      resumed: false,
      reason: "auto_resume_disabled_during_wait",
    });
  });

  // ── Scenario 10: Multiple handoffs — stale timer from earlier handoff ignored ──
  it("Scenario 10: stale timer with older handoffAt does not affect newer handoff", async () => {
    const olderHandoffTime = new Date("2026-08-26T10:00:00.000Z");
    const newerHandoffTime = new Date("2026-08-26T11:00:00.000Z");

    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      handoffResumeMinutes: 3,
    });

    // Contact has been handed off again at 11:00
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      aiStatus: "NEEDS_HUMAN",
      handoffAt: newerHandoffTime,
    });

    const step = createMockStep();
    // Old timer from 10:00 fires
    const result = await (handoffResumeFn as any).handler({
      event: {
        data: {
          userId: "user_1",
          contactId: "contact_1",
          handoffAt: olderHandoffTime.toISOString(),
        },
      },
      step,
    });

    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ resumed: false, reason: "stale_timer" });
  });
});
