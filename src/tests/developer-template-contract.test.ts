import { describe, expect, it } from "vitest";
import {
  buildAuthenticationComponents,
  buildOtpParameters,
  validateVariableDefinitions,
  validateOtpTemplateContract,
  isOtpCompatibleWithMeta,
  normalizeOtpTemplateName,
  isValidOtpTemplateName,
  isSupportedOtpLanguage,
  generatedOtpBody,
  buildMetaCreateComponents,
  buildMetaCreateTemplatePayload,
  placeholderPositions,
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

describe("OTP template contract (PHASE 2/4/6)", () => {
  const base = {
    id: "tpl-1",
    projectId: "proj-A",
    expectedProjectId: "proj-A",
    name: "wani_otp",
    language: "en_US",
    category: "AUTHENTICATION",
    status: "APPROVED",
    metaTemplateId: "meta_1",
    metaComponents: [
      { type: "BODY", text: "{{1}} is your verification code." },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
    ],
  };

  it("accepts a complete AUTHENTICATION contract", () => {
    expect(validateOtpTemplateContract(base)).toEqual({ ok: true });
  });

  it("rejects missing record / wrong project", () => {
    expect(validateOtpTemplateContract({ ...base, id: null }).ok).toBe(false);
    const wrong = validateOtpTemplateContract({ ...base, projectId: "proj-B" });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.code).toBe("TEMPLATE_WRONG_PROJECT");
  });

  it("rejects non-AUTHENTICATION categories (no Utility/Marketing OTP)", () => {
    for (const category of ["UTILITY", "MARKETING", null]) {
      const r = validateOtpTemplateContract({ ...base, category });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("OTP_TEMPLATE_NOT_COMPATIBLE");
    }
  });

  it("rejects non-APPROVED statuses", () => {
    for (const status of ["LOCAL_DRAFT", "PENDING", "REJECTED", "DISABLED"]) {
      const r = validateOtpTemplateContract({ ...base, status });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("TEMPLATE_NOT_APPROVED");
    }
  });

  it("rejects missing Meta ID / missing language", () => {
    expect(validateOtpTemplateContract({ ...base, metaTemplateId: null }).ok).toBe(false);
    const noLang = validateOtpTemplateContract({ ...base, language: null });
    expect(noLang.ok).toBe(false);
    if (!noLang.ok) expect(noLang.code).toBe("OTP_TEMPLATE_METADATA_INVALID");
  });

  it("rejects incomplete metadata without guessing", () => {
    expect(validateOtpTemplateContract({ ...base, metaComponents: null }).ok).toBe(false);
    expect(validateOtpTemplateContract({ ...base, metaComponents: [] }).ok).toBe(false);
    expect(
      validateOtpTemplateContract({ ...base, metaComponents: [{ type: "BODY", text: "static" }] }).ok
    ).toBe(false);
  });

  it("isOtpCompatibleWithMeta mirrors the gate for display", () => {
    expect(isOtpCompatibleWithMeta({ ...base, metaComponents: base.metaComponents }).compatible).toBe(true);
    expect(
      isOtpCompatibleWithMeta({ category: "UTILITY", status: "APPROVED", metaTemplateId: "m", metaComponents: [] }).compatible
    ).toBe(false);
    expect(
      isOtpCompatibleWithMeta({ category: "AUTHENTICATION", status: "PENDING", metaTemplateId: "m", metaComponents: [] }).compatible
    ).toBe(false);
  });

  it("normalizes names and validates languages", () => {
    expect(normalizeOtpTemplateName("  My OTP Test ")).toBe("my_otp_test");
    expect(isValidOtpTemplateName("ab")).toBe(false);
    expect(isValidOtpTemplateName("otp_verification")).toBe(true);
    expect(isSupportedOtpLanguage("en_US")).toBe(true);
    expect(isSupportedOtpLanguage("xx")).toBe(false);
  });

  it("generates a single-{{1}} body per language", () => {
    for (const lang of ["ar", "en_US", "fr"]) {
      expect(placeholderPositions(generatedOtpBody(lang))).toEqual([1]);
    }
  });

  it("buildMetaCreateComponents is the single creation source (BODY + OTP button)", () => {
    const components = buildMetaCreateComponents({ addSecurityRecommendation: true });
    expect(components).toEqual([
      { type: "BODY", add_security_recommendation: true },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
    ]);
  });

  it("buildMetaCreateTemplatePayload returns the COMPLETE deterministic creation payload", () => {
    const result = buildMetaCreateTemplatePayload({
      name: "Opt_Wani ",
      language: "en_US",
      codeExpirationMinutes: 5,
      addSecurityRecommendation: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // الاسم مطبّع، والمدة مربوطة بـ FOOTER — بلا أي ترقيع لاحق
    expect(result.payload).toEqual({
      name: "opt_wani",
      category: "AUTHENTICATION",
      language: "en_US",
      components: [
        { type: "BODY", add_security_recommendation: true },
        { type: "FOOTER", code_expiration_minutes: 5 },
        { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
      ],
    });
    // لا text ولا example مخصصين على BODY — النص القياسي تولّده Meta
    const body = result.payload.components[0] as Record<string, unknown>;
    expect(body).not.toHaveProperty("text");
    expect(body).not.toHaveProperty("example");
  });

  it("buildMetaCreateTemplatePayload fails closed on bad input (before any Meta call)", () => {
    expect(buildMetaCreateTemplatePayload({ name: "ab", language: "en_US", codeExpirationMinutes: 5, addSecurityRecommendation: true }).ok).toBe(false);
    expect(buildMetaCreateTemplatePayload({ name: "otp_x", language: "xx", codeExpirationMinutes: 5, addSecurityRecommendation: true }).ok).toBe(false);
    expect(buildMetaCreateTemplatePayload({ name: "otp_x", language: "ar", codeExpirationMinutes: 500, addSecurityRecommendation: true }).ok).toBe(false);
  });
});
