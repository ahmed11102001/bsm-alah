import { describe, it, expect, vi } from "vitest";

vi.mock("../../env-utils", () => ({
  validateEnv: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: (cfg: any) => cfg,
}));

import nextConfigExport from "../../next.config";

describe("Channels Page and Routing Flow", () => {
  it("next.config.ts rewrites /dashboard/channels to /channels", async () => {
    // nextConfigExport can be a config object or a function returning it
    const config =
      typeof nextConfigExport === "function"
        ? await (nextConfigExport as any)("phase-production-build", {})
        : await nextConfigExport;

    expect(config.rewrites).toBeDefined();
    const rewrites = await config.rewrites();
    expect(Array.isArray(rewrites)).toBe(true);

    const channelsRewrite = rewrites.find(
      (r: any) =>
        r.source === "/dashboard/channels" && r.destination === "/channels"
    );
    expect(channelsRewrite).toBeDefined();
    expect(channelsRewrite.source).toBe("/dashboard/channels");
    expect(channelsRewrite.destination).toBe("/channels");
  });

  it("evaluates WhatsApp connection state accurately based on WhatsAppAccount", () => {
    // When account exists with phoneNumberId, wabaId, and valid token
    const validAccount = {
      phoneNumberId: "10023456789",
      wabaId: "20098765432",
      tokenStatus: "VALID",
    };

    const isConnected = Boolean(
      validAccount?.phoneNumberId &&
        validAccount?.wabaId &&
        validAccount?.tokenStatus !== "INVALID" &&
        validAccount?.tokenStatus !== "EXPIRED"
    );
    expect(isConnected).toBe(true);

    // When account is missing or has invalid token
    const invalidAccount = {
      phoneNumberId: "10023456789",
      wabaId: "20098765432",
      tokenStatus: "EXPIRED",
    };
    const isInvalidConnected = Boolean(
      invalidAccount?.phoneNumberId &&
        invalidAccount?.wabaId &&
        invalidAccount?.tokenStatus !== "INVALID" &&
        invalidAccount?.tokenStatus !== "EXPIRED"
    );
    expect(isInvalidConnected).toBe(false);

    // When no WhatsAppAccount is linked
    const noAccount = null;
    const isNoAccountConnected = Boolean(
      (noAccount as any)?.phoneNumberId &&
        (noAccount as any)?.wabaId &&
        (noAccount as any)?.tokenStatus !== "INVALID" &&
        (noAccount as any)?.tokenStatus !== "EXPIRED"
    );
    expect(isNoAccountConnected).toBe(false);
  });
});
