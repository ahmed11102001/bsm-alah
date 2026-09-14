import { describe, expect, it } from "vitest";
import { generateIntegrationCode } from "@/lib/developer-code-generator";

const base = {
  operation: "send-verify" as const,
  language: "typescript" as const,
  framework: "next",
  templateId: "project-template-1",
  baseUrl: "https://wani.example/api/developers/otp",
};

describe("developer integration generator", () => {
  it("generates the real send and verify contract from templateId", () => {
    const code = generateIntegrationCode(base);
    expect(code).toContain("/send");
    expect(code).toContain("/verify");
    expect(code).toContain('templateId: "project-template-1"');
    expect(code).toContain("process.env.WANI_API_KEY");
    expect(code).not.toContain("templateName");
  });

  it("does not require a template for verify-only code", () => {
    const code = generateIntegrationCode({ ...base, operation: "verify", templateId: undefined, language: "python" });
    expect(code).toContain('"/verify"');
    expect(code).not.toContain("send_otp");
    expect(code).toContain('os.environ["WANI_API_KEY"]');
  });

  it("supports PHP and cURL without embedding a secret", () => {
    for (const language of ["php", "curl"] as const) {
      const code = generateIntegrationCode({ ...base, language });
      expect(code).toContain("WANI_API_KEY");
      expect(code).not.toContain("wani_live_");
    }
  });
});
