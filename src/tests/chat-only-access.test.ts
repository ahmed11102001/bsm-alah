import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/permissions-core";

describe("CHAT_ONLY access boundary", () => {
  it("allows chat and team view only", () => {
    expect(hasPermission("CHAT_ONLY", "CHAT_VIEW")).toBe(true);
    expect(hasPermission("CHAT_ONLY", "CHAT_SEND")).toBe(true);
    expect(hasPermission("CHAT_ONLY", "TEAM_VIEW")).toBe(true);
  });

  it("does not allow audience, campaigns, reports, API, or WhatsApp settings", () => {
    expect(hasPermission("CHAT_ONLY", "CONTACTS_VIEW")).toBe(false);
    expect(hasPermission("CHAT_ONLY", "CAMPAIGNS_VIEW")).toBe(false);
    expect(hasPermission("CHAT_ONLY", "REPORTS_VIEW")).toBe(false);
    expect(hasPermission("CHAT_ONLY", "API_KEYS_MANAGE")).toBe(false);
    expect(hasPermission("CHAT_ONLY", "WHATSAPP_SETTINGS")).toBe(false);
  });
});
