import { describe, expect, it } from "vitest";
import {
  buildAuthenticationComponents,
  buildOtpParameters,
  validateVariableDefinitions,
} from "@/lib/developer-template-contract";

describe("developer template variable contract", () => {
  it("uses only actual Meta OTP button metadata and does not invent a BODY parameter", () => {
    const result = buildAuthenticationComponents([
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: 10 },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
    ], "123456");
    expect(result).toEqual({
      ok: true,
      components: [{
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "123456" }],
      }],
    });
  });

  it("adds a BODY parameter only when the stored definition has a placeholder", () => {
    const result = buildAuthenticationComponents([
      { type: "BODY", text: "Your code is {{1}}" },
    ], "123456");
    expect(result).toEqual({
      ok: true,
      components: [{ type: "body", parameters: [{ type: "text", text: "123456" }] }],
    });
  });

  it("rejects missing or malformed authentication metadata", () => {
    expect(buildAuthenticationComponents(null, "123456").ok).toBe(false);
    expect(buildAuthenticationComponents([{ type: "BUTTONS", buttons: [{ type: "OTP" }] }], "123456").ok).toBe(false);
  });

  it("maps semantic variables instead of assuming positions", () => {
    const result = buildOtpParameters([
      { position: 1, key: "serviceName", example: "Wani" },
      { position: 2, key: "otp", example: "583214" },
    ], "123456", 10);
    expect(result.ok).toBe(false);
  });

  it("rejects missing, skipped, or undocumented variables", () => {
    expect(validateVariableDefinitions("Code {{1}} / {{2}}", [
      { position: 1, key: "otp", example: "123456" },
    ]).ok).toBe(false);
    expect(validateVariableDefinitions("Code {{1}} / {{3}}", [
      { position: 1, key: "otp", example: "123456" },
      { position: 3, key: "expiryMinutes", example: "10" },
    ]).ok).toBe(false);
  });

  it("accepts an explicit OTP and expiry mapping", () => {
    const result = validateVariableDefinitions("Code {{1}} / {{2}}", [
      { position: 1, key: "otp", example: "123456" },
      { position: 2, key: "expiryMinutes", example: "10" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(buildOtpParameters(result.variables, "123456", 10)).toEqual({
      ok: true,
      parameters: [{ type: "text", text: "123456" }, { type: "text", text: "10" }],
    });
  });
});
