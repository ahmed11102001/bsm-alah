import { describe, it, expect } from "vitest";
import {
  isDeveloperTemplateCategory,
  isMerchantTemplateCategory,
  isOtpSendable,
  isCampaignSendable,
} from "@/lib/template-visibility";

describe("template visibility contract (single source of truth)", () => {
  it("splits the two worlds with no overlap", () => {
    expect(isDeveloperTemplateCategory("AUTHENTICATION")).toBe(true);
    expect(isDeveloperTemplateCategory("MARKETING")).toBe(false);
    expect(isDeveloperTemplateCategory("UTILITY")).toBe(false);
    expect(isMerchantTemplateCategory("MARKETING")).toBe(true);
    expect(isMerchantTemplateCategory("UTILITY")).toBe(true);
    expect(isMerchantTemplateCategory("AUTHENTICATION")).toBe(false);
    // Case-insensitive: merchant rows store mixed-case statuses/categories.
    expect(isMerchantTemplateCategory("marketing")).toBe(true);
    expect(isDeveloperTemplateCategory("authentication")).toBe(true);
    expect(isDeveloperTemplateCategory(null)).toBe(false);
    expect(isMerchantTemplateCategory(undefined)).toBe(false);
  });

  it("OTP-sendable = AUTHENTICATION + APPROVED + linked Meta id", () => {
    const ok = { category: "AUTHENTICATION", status: "APPROVED", metaTemplateId: "meta-1" };
    expect(isOtpSendable(ok)).toBe(true);
    expect(isOtpSendable({ ...ok, category: "MARKETING" })).toBe(false);
    expect(isOtpSendable({ ...ok, category: "UTILITY" })).toBe(false);
    expect(isOtpSendable({ ...ok, status: "PENDING" })).toBe(false);
    expect(isOtpSendable({ ...ok, status: "REJECTED" })).toBe(false);
    expect(isOtpSendable({ ...ok, status: "DISABLED" })).toBe(false);
    expect(isOtpSendable({ ...ok, metaTemplateId: null })).toBe(false);
    expect(isOtpSendable({ ...ok, status: "approved" })).toBe(true);
  });

  it("campaign-sendable = MARKETING/UTILITY + APPROVED, never AUTH", () => {
    expect(isCampaignSendable({ category: "MARKETING", status: "APPROVED" })).toBe(true);
    expect(isCampaignSendable({ category: "UTILITY", status: "APPROVED" })).toBe(true);
    expect(isCampaignSendable({ category: "marketing", status: "approved" })).toBe(true);
    expect(isCampaignSendable({ category: "AUTHENTICATION", status: "APPROVED" })).toBe(false);
    expect(isCampaignSendable({ category: "MARKETING", status: "PENDING" })).toBe(false);
    expect(isCampaignSendable({ category: "MARKETING", status: "REJECTED" })).toBe(false);
    expect(isCampaignSendable({ category: "MARKETING", status: "DISABLED" })).toBe(false);
    expect(isCampaignSendable({ category: "MARKETING", status: "pending" })).toBe(false);
    expect(isCampaignSendable({ category: null, status: "APPROVED" })).toBe(false);
  });
});
