// src/tests/ai-agent-runner-outputs.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mocks
const mockPrisma = {
  contact: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  aIAgent: {
    findUnique: vi.fn(),
  },
  messageQueue: {
    findFirst: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  brandPolicy: { findMany: vi.fn().mockResolvedValue([]) },
  aIGuardrail: { findUnique: vi.fn().mockResolvedValue(null) },
  salesBehaviorSettings: { findUnique: vi.fn().mockResolvedValue(null) },
  websiteCrawlSettings: { findUnique: vi.fn().mockResolvedValue(null) },
  customerServiceSettings: { findUnique: vi.fn().mockResolvedValue(null) },
  brandFAQ: { findMany: vi.fn().mockResolvedValue([]) },
  customerIssue: { findMany: vi.fn().mockResolvedValue([]) },
  product: { findFirst: vi.fn().mockResolvedValue(null) },
  $transaction: vi.fn((actions) => Promise.all(actions)),
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((t) => t),
  isEncrypted: vi.fn(() => false),
}));
vi.mock("@/lib/plan-guard", () => ({
  checkAITokensLimit: vi.fn().mockResolvedValue({ allowed: true }),
  incrementAITokens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications", () => ({
  notifyAiHandoffNeeded: vi.fn(),
  notifyAutomationFailed: vi.fn(),
}));
vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/product-search", () => ({
  getRelevantProducts: vi.fn().mockResolvedValue([]),
  getSuggestedProducts: vi.fn().mockResolvedValue([]),
}));

const mockGetAIReply = vi.fn();
vi.mock("@/lib/ai-agent", () => ({
  getAIReply: (...args: any[]) => mockGetAIReply(...args),
}));

const mockGenerateVoiceReply = vi.fn();
const mockUploadAudioToCloudinary = vi.fn();
vi.mock("@/lib/elevenlabs", () => ({
  generateVoiceReply: (...args: any[]) => mockGenerateVoiceReply(...args),
  uploadAudioToCloudinary: (...args: any[]) => mockUploadAudioToCloudinary(...args),
}));

// Global fetch mock for Meta Graph API
const mockFetch = vi.fn();
global.fetch = mockFetch;

const { runAIAgentReply } = await import("@/lib/ai-agent-runner");

describe("AI Agent Runner Output Channels (Text & Voice)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      phone: "201012345678",
      name: "Ahmed",
      textAiEnabled: true,
      voiceOptOut: false,
      aiStatus: "AUTO",
      user: {
        whatsappAccount: {
          accessToken: "TOKEN",
          phoneNumberId: "PHONE_ID",
        },
      },
    });

    mockPrisma.messageQueue.findFirst.mockResolvedValue(null);
    mockPrisma.message.findMany.mockResolvedValue([
      {
        content: "بكام المنتج؟",
        direction: "inbound",
        type: "text",
        mediaUrl: null,
      },
    ]);

    mockGetAIReply.mockResolvedValue({
      ok: true,
      reply: "سعر المنتج 500 جنيه.",
      tokensUsed: 42,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wam_msg_123" }] }),
      text: async () => "",
    });

    mockGenerateVoiceReply.mockResolvedValue({
      ok: true,
      audioBuffer: Buffer.from("fake-audio"),
    });

    mockUploadAudioToCloudinary.mockResolvedValue("https://res.cloudinary.com/demo/audio.mp3");
  });

  it("Test 1: Text Reply ON, Voice Reply OFF → AI generates once, Text sent, No Voice called", async () => {
    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: "gemini",
      textRepliesEnabled: true,
      voiceRepliesEnabled: false,
      elevenLabsEnabled: false,
      elevenLabsApiKey: null,
    });

    const result = await runAIAgentReply({
      contactId: "contact_1",
      userId: "user_1",
      from: "201012345678",
    });

    expect(result.sent).toBe(true);
    expect(mockGetAIReply).toHaveBeenCalledTimes(1);
    expect(mockGenerateVoiceReply).not.toHaveBeenCalled();

    // Verify WhatsApp fetch was called with type=text
    const textCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "text";
    });
    expect(textCall).toBeDefined();
    const parsedBody = JSON.parse(textCall[1].body);
    expect(parsedBody.text.body).toBe("سعر المنتج 500 جنيه.");
  });

  it("Test 2: Text Reply OFF, Voice Reply ON → AI generates once, No text message, Voice sent with same reply", async () => {
    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: "gemini",
      textRepliesEnabled: false,
      voiceRepliesEnabled: true,
      elevenLabsEnabled: true,
      elevenLabsApiKey: "xi-api-key",
      elevenLabsVoiceId: "voice_abc",
    });

    const result = await runAIAgentReply({
      contactId: "contact_1",
      userId: "user_1",
      from: "201012345678",
    });

    expect(result.sent).toBe(true);
    expect(mockGetAIReply).toHaveBeenCalledTimes(1);
    expect(mockGenerateVoiceReply).toHaveBeenCalledTimes(1);
    expect(mockGenerateVoiceReply).toHaveBeenCalledWith(
      expect.objectContaining({
        textReply: "سعر المنتج 500 جنيه.",
        voiceId: "voice_abc",
      })
    );

    // Verify NO type=text was sent
    const textCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "text";
    });
    expect(textCall).toBeUndefined();

    // Verify type=audio was sent
    const audioCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "audio";
    });
    expect(audioCall).toBeDefined();
  });

  it("Test 3: Text Reply ON, Voice Reply ON → AI generates once, Text sent, Voice sent with same reply", async () => {
    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: "gemini",
      textRepliesEnabled: true,
      voiceRepliesEnabled: true,
      elevenLabsEnabled: true,
      elevenLabsApiKey: "xi-api-key",
      elevenLabsVoiceId: "voice_abc",
    });

    const result = await runAIAgentReply({
      contactId: "contact_1",
      userId: "user_1",
      from: "201012345678",
    });

    expect(result.sent).toBe(true);
    expect(mockGetAIReply).toHaveBeenCalledTimes(1);
    expect(mockGenerateVoiceReply).toHaveBeenCalledTimes(1);
    expect(mockGenerateVoiceReply).toHaveBeenCalledWith(
      expect.objectContaining({
        textReply: "سعر المنتج 500 جنيه.",
      })
    );

    // Both text and audio sent
    const textCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "text";
    });
    const audioCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "audio";
    });
    expect(textCall).toBeDefined();
    expect(audioCall).toBeDefined();
  });

  it("Test 7: ElevenLabs fails → Text Reply still succeeds and is non-blocking", async () => {
    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: "gemini",
      textRepliesEnabled: true,
      voiceRepliesEnabled: true,
      elevenLabsEnabled: true,
      elevenLabsApiKey: "xi-api-key",
    });

    mockGenerateVoiceReply.mockResolvedValue({
      ok: false,
      error: "ElevenLabs 500 error",
    });

    const result = await runAIAgentReply({
      contactId: "contact_1",
      userId: "user_1",
      from: "201012345678",
    });

    expect(result.sent).toBe(true);
    expect(mockGetAIReply).toHaveBeenCalledTimes(1);

    // Text was still sent
    const textCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "text";
    });
    expect(textCall).toBeDefined();
  });

  it("Test 8: Integration connected (elevenLabsEnabled=true) but Voice Output OFF (voiceRepliesEnabled=false) → No Voice sent", async () => {
    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: "gemini",
      textRepliesEnabled: true,
      voiceRepliesEnabled: false,
      elevenLabsEnabled: true,
      elevenLabsApiKey: "xi-api-key",
      elevenLabsVoiceId: "voice_abc",
    });

    const result = await runAIAgentReply({
      contactId: "contact_1",
      userId: "user_1",
      from: "201012345678",
    });

    expect(result.sent).toBe(true);
    expect(mockGenerateVoiceReply).not.toHaveBeenCalled();
    const audioCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "audio";
    });
    expect(audioCall).toBeUndefined();
  });

  it("Test 9: Voice Output ON (voiceRepliesEnabled=true) but Integration NOT connected (elevenLabsEnabled=false) → No Voice sent", async () => {
    mockPrisma.aIAgent.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: "gemini",
      textRepliesEnabled: true,
      voiceRepliesEnabled: true,
      elevenLabsEnabled: false,
      elevenLabsApiKey: "xi-api-key",
    });

    const result = await runAIAgentReply({
      contactId: "contact_1",
      userId: "user_1",
      from: "201012345678",
    });

    expect(result.sent).toBe(true);
    expect(mockGenerateVoiceReply).not.toHaveBeenCalled();
    const audioCall = mockFetch.mock.calls.find((c) => {
      const body = JSON.parse(c[1]?.body || "{}");
      return body.type === "audio";
    });
    expect(audioCall).toBeUndefined();
  });
});
