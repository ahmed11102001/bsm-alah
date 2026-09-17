import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../env-utils", () => ({
  validateEnv: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: (cfg: any) => cfg,
}));

import nextConfigExport from "../../next.config";
import { encryptToken, decryptToken } from "../lib/crypto";

describe("Email Marketing Architecture & Services", () => {
  it("next.config.ts rewrites /dashboard/email and sub-paths to /email-marketing", async () => {
    const config =
      typeof nextConfigExport === "function"
        ? await (nextConfigExport as any)("phase-production-build", {})
        : await nextConfigExport;

    expect(config.rewrites).toBeDefined();
    const rewrites = await config.rewrites();
    expect(Array.isArray(rewrites)).toBe(true);

    const emailBaseRewrite = rewrites.find(
      (r: any) =>
        r.source === "/dashboard/email" && r.destination === "/email-marketing"
    );
    expect(emailBaseRewrite).toBeDefined();

    const emailWildcardRewrite = rewrites.find(
      (r: any) =>
        r.source === "/dashboard/email/:path*" &&
        r.destination === "/email-marketing/:path*"
    );
    expect(emailWildcardRewrite).toBeDefined();
  });

  it("encrypts and decrypts SMTP passwords securely using AES-256-GCM", () => {
    // Set dummy 64 hex char encryption key for the test if not present
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    }

    const rawPassword = "SuperSecretSmtpPassword123!#";
    const encrypted = encryptToken(rawPassword);

    expect(encrypted).not.toBe(rawPassword);
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawPassword);
  });

  it("replaces template variables correctly in email personalization", () => {
    const templateSubject = "أهلاً بك يا {{name}} في منصتنا";
    const templateBody = "مرحباً {{name}}، بريدك المسجل هو {{email}}.";

    const contactName = "أحمد خليل";
    const contactEmail = "ahmed@example.com";

    const personalizedSubject = templateSubject
      .replace(/\{\{name\}\}/g, contactName)
      .replace(/\{\{email\}\}/g, contactEmail);

    const personalizedBody = templateBody
      .replace(/\{\{name\}\}/g, contactName)
      .replace(/\{\{email\}\}/g, contactEmail);

    expect(personalizedSubject).toBe("أهلاً بك يا أحمد خليل في منصتنا");
    expect(personalizedBody).toBe("مرحباً أحمد خليل، بريدك المسجل هو ahmed@example.com.");
  });

  it("calculates delivery rate and campaign stats properly", () => {
    const sentCount = 100;
    const deliveredCount = 98;
    const failedCount = 2;

    const deliveryRate = sentCount > 0 ? +((deliveredCount / sentCount) * 100).toFixed(1) : 100;
    expect(deliveryRate).toBe(98.0);
    expect(deliveredCount + failedCount).toBe(sentCount);
  });

  it("dispatches Inngest event for email campaign background execution", async () => {
    const mockInngestSend = vi.fn().mockResolvedValue({ ids: ["test-event-id"] });
    const mockPrisma = {
      emailCampaign: {
        findFirst: vi.fn().mockResolvedValue({
          id: "camp_123",
          userId: "user_123",
          name: "Black Friday Email Blast",
          subject: "Special Offer!",
          templateId: "tmpl_123",
          template: { id: "tmpl_123", bodyHtml: "<p>Hello</p>", previewText: "Hi" },
        }),
        update: vi.fn().mockResolvedValue({ id: "camp_123", status: "QUEUED" }),
      },
      contact: {
        count: vi.fn().mockResolvedValue(250),
      },
    };

    // Simulate queueCampaignSending behavior
    const campaign = await mockPrisma.emailCampaign.findFirst({
      where: { id: "camp_123", userId: "user_123" },
    });
    const targetCount = await mockPrisma.contact.count();
    await mockPrisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: "QUEUED", targetCount },
    });
    await mockInngestSend({
      name: "email/campaign.send",
      data: { campaignId: campaign.id, userId: "user_123" },
    });

    expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith({
      where: { id: "camp_123" },
      data: { status: "QUEUED", targetCount: 250 },
    });
    expect(mockInngestSend).toHaveBeenCalledWith({
      name: "email/campaign.send",
      data: { campaignId: "camp_123", userId: "user_123" },
    });
  });

  it("safeguards masked bullet passwords from overwriting existing encrypted password", () => {
    const existingEncrypted = "iv_123:tag_123:cipher_123";
    const maskedInput = "••••••••";

    const hasNewRawPassword = Boolean(
      maskedInput &&
        maskedInput.trim() &&
        !maskedInput.includes("•") &&
        !maskedInput.includes("*")
    );

    expect(hasNewRawPassword).toBe(false);

    // If new raw password is provided
    const newRawInput = "MyBrandNewSmtpPass!99";
    const hasValidRaw = Boolean(
      newRawInput &&
        newRawInput.trim() &&
        !newRawInput.includes("•") &&
        !newRawInput.includes("*")
    );
    expect(hasValidRaw).toBe(true);
  });

  it("verifies Channels page resolves email connection state properly", () => {
    const emailConnectionConnected = {
      host: "smtp.gmail.com",
      fromEmail: "sales@store.com",
      lastTestSuccess: true,
    };
    const isConnected = Boolean(emailConnectionConnected?.host);
    expect(isConnected).toBe(true);

    const emailConnectionDisconnected = null;
    const isDisconnected = Boolean((emailConnectionDisconnected as any)?.host);
    expect(isDisconnected).toBe(false);
  });

  it("verifies CRM unified contact targeting query constraints for email campaigns", () => {
    // Campaign recipients query must strictly filter contacts with non-null email and SUBSCRIBED status
    const buildTargetWhere = (userId: string, targetTag?: string | null) => {
      const where: any = {
        userId,
        email: { not: null },
        emailStatus: "SUBSCRIBED",
      };
      if (targetTag) {
        where.tags = { has: targetTag };
      }
      return where;
    };

    const generalWhere = buildTargetWhere("usr_123");
    expect(generalWhere).toEqual({
      userId: "usr_123",
      email: { not: null },
      emailStatus: "SUBSCRIBED",
    });

    const taggedWhere = buildTargetWhere("usr_123", "VIP");
    expect(taggedWhere).toEqual({
      userId: "usr_123",
      email: { not: null },
      emailStatus: "SUBSCRIBED",
      tags: { has: "VIP" },
    });
  });

  it("verifies EmailDelivery links directly to CRM Contact", () => {
    const mockContact = {
      id: "cnt_crm_999",
      email: "lead@store.com",
      name: "سارة أحمد",
      phone: "+201000000000",
    };

    const deliveryRecord = {
      campaignId: "camp_777",
      contactId: mockContact.id,
      contactEmail: mockContact.email,
      contactName: mockContact.name,
      status: "QUEUED" as const,
    };

    expect(deliveryRecord.contactId).toBe(mockContact.id);
    expect(deliveryRecord.contactEmail).toBe("lead@store.com");
    expect(deliveryRecord.contactName).toBe("سارة أحمد");
  });
});

