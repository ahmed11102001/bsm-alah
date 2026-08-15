import { describe, expect, it } from "vitest";
import { deriveWhatsAppTokenStatus, WhatsAppTokenStatus } from "@/lib/whatsapp-token";

const now = new Date("2026-08-15T12:00:00.000Z");
const unix = (date: string) => Math.floor(new Date(date).getTime() / 1000);

describe("WhatsApp token status", () => {
  it("marks an invalid debug response as INVALID", () => {
    expect(deriveWhatsAppTokenStatus({ is_valid: false }, now)).toBe(WhatsAppTokenStatus.INVALID);
  });

  it("uses the nearest token/data-access expiry", () => {
    expect(deriveWhatsAppTokenStatus({
      is_valid: true,
      expires_at: unix("2026-08-30T00:00:00.000Z"),
      data_access_expiration_time: unix("2026-08-17T00:00:00.000Z"),
    }, now)).toBe(WhatsAppTokenStatus.EXPIRING_SOON);
  });

  it("distinguishes expired, active, and unknown tokens", () => {
    expect(deriveWhatsAppTokenStatus({ is_valid: true, expires_at: unix("2026-08-15T11:59:00.000Z") }, now))
      .toBe(WhatsAppTokenStatus.EXPIRED);
    expect(deriveWhatsAppTokenStatus({ is_valid: true, expires_at: unix("2026-09-15T00:00:00.000Z") }, now))
      .toBe(WhatsAppTokenStatus.ACTIVE);
    expect(deriveWhatsAppTokenStatus({}, now)).toBe(WhatsAppTokenStatus.UNKNOWN);
  });
});
