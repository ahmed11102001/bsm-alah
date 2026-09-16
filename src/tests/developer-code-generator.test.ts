import { describe, expect, it } from "vitest";
import {
  frameworksForLanguage,
  generateIntegrationCode,
  getOtpApiContract,
  LANGUAGE_FRAMEWORKS,
  type IntegrationLanguage,
} from "@/lib/developer-code-generator";

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
    expect(code).toContain(".otp.send");
    expect(code).toContain(".otp.verify");
    expect(code).toContain('templateId: "project-template-1"');
    expect(code).toContain("process.env.WANI_API_KEY");
    expect(code).not.toContain("templateName");
  });

  it("JS/TS integrations delegate HTTP to the official SDK (no raw fetch)", () => {
    for (const framework of ["node", "next"] as const) {
      const code = generateIntegrationCode({ ...base, framework, operation: "send-verify" });
      expect(code).toContain('from "@aiwni/sdk"');
      expect(code).not.toContain("waniRequest");
      // No hand-rolled auth headers — the SDK owns HTTP/auth/errors.
      expect(code).not.toContain('"x-api-key"');
      expect(code).not.toContain("fetch(WANI_BASE_URL");
    }
  });

  it("Next.js routes surface typed WaniError failures with status", () => {
    const code = generateIntegrationCode({ ...base, framework: "next", operation: "send" });
    expect(code).toContain("WaniError");
    expect(code).toContain("err.status ?? 502");
    expect(code).toContain("route.ts");
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

describe("framework registry", () => {
  it("exposes only frameworks with a tested generator per language", () => {
    expect(frameworksForLanguage("javascript").map((f) => f.id)).toEqual(["node", "next", "react"]);
    expect(frameworksForLanguage("typescript").map((f) => f.id)).toEqual(["node", "next", "react"]);
    expect(frameworksForLanguage("python").map((f) => f.id)).toEqual(["django", "flask", "fastapi"]);
    expect(frameworksForLanguage("php").map((f) => f.id)).toEqual(["laravel", "symfony"]);
    expect(frameworksForLanguage("curl").map((f) => f.id)).toEqual(["shell"]);
  });

  it("falls back to the language default for unknown frameworks", () => {
    const code = generateIntegrationCode({
      operation: "send",
      language: "python",
      framework: "definitely-not-a-framework",
      templateId: "tmpl_1",
      baseUrl: "https://wani.example/api/developers/otp",
    });
    // Default python framework is Django.
    expect(code).toContain("views.py");
  });
});

describe("every framework generates production-safe code", () => {
  const cases: { language: IntegrationLanguage; framework: string; markers: string[]; sdk?: boolean }[] = [
    { language: "javascript", framework: "node", markers: ["@aiwni/sdk", "getWani().otp.send"], sdk: true },
    { language: "javascript", framework: "next", markers: ["route.js", "export async function POST", "@aiwni/sdk"], sdk: true },
    { language: "javascript", framework: "react", markers: ["useState", "/api/otp/send"] },
    { language: "typescript", framework: "node", markers: ["@aiwni/sdk", ": string"], sdk: true },
    { language: "typescript", framework: "next", markers: ["route.ts", "NextRequest", "WaniError"], sdk: true },
    { language: "typescript", framework: "react", markers: ["useState<string>", "/api/otp/send"] },
    { language: "python", framework: "django", markers: ["JsonResponse", "require_POST"] },
    { language: "python", framework: "flask", markers: ["Flask", "@app.post"] },
    { language: "python", framework: "fastapi", markers: ["FastAPI", "httpx"] },
    { language: "php", framework: "laravel", markers: ["Http::", "services.wani"] },
    { language: "php", framework: "symfony", markers: ["HttpClientInterface", "WANI_API_KEY"] },
    { language: "curl", framework: "shell", markers: ["curl", "x-api-key"] },
  ];

  // Framework markers are asserted on the send output only — verify/status
  // outputs legitimately omit sibling operations (e.g. no POST in a Next.js
  // GET status route, no /api/otp/send in a React status checker).
  const sdkMethodFor = { send: ".otp.send", verify: ".otp.verify", status: ".otp.status" } as const;
  for (const { language, framework, markers, sdk } of cases) {
    it(`${language}/${framework} generates safe code for send, verify and status`, () => {
      const sendCode = generateIntegrationCode({
        operation: "send",
        language,
        framework,
        templateId: "tmpl_123",
        baseUrl: "https://wani.example/api/developers/otp",
      });
      for (const marker of markers) {
        expect(sendCode).toContain(marker);
      }
      if (framework === "react") {
        // The browser client must not see the templateId either — the server
        // endpoint owns it.
        expect(sendCode).not.toContain("tmpl_123");
      } else {
        expect(sendCode).toContain("tmpl_123");
      }

      for (const operation of ["send", "verify", "status"] as const) {
        const contract = getOtpApiContract(operation, "tmpl_123");
        const code = operation === "send"
          ? sendCode
          : generateIntegrationCode({
            operation,
            language,
            framework,
            templateId: "tmpl_123",
            baseUrl: "https://wani.example/api/developers/otp",
          });
        if (sdk) {
          // SDK-owned HTTP: the same operation must surface as an SDK call.
          expect(code).toContain(sdkMethodFor[operation]);
        } else {
          // Same contract path the page displays must appear in the code.
          expect(code).toContain(contract.path.replace("/:token", ""));
        }
        // Key is referenced from the server environment, never embedded.
        expect(code).toContain("WANI_API_KEY");
        expect(code).not.toContain("wani_live_");
        expect(code).not.toMatch(/wani_live_[A-Za-z0-9]+/);
      }
    });
  }

  it("react output never touches the server key", () => {
    for (const language of ["javascript", "typescript"] as const) {
      const code = generateIntegrationCode({
        operation: "send",
        language,
        framework: "react",
        templateId: "tmpl_1",
        baseUrl: "https://wani.example/api/developers/otp",
      });
      expect(code).not.toContain("process.env.WANI_API_KEY");
      expect(code).not.toContain('os.environ["WANI_API_KEY"]');
      expect(code).toContain("Never put WANI_API_KEY here");
    }
  });

  it("covers every registered framework (no registry entry without a test)", () => {
    const tested = new Set(cases.map((c) => `${c.language}/${c.framework}`));
    for (const [language, frameworks] of Object.entries(LANGUAGE_FRAMEWORKS)) {
      for (const fw of frameworks) {
        expect(tested.has(`${language}/${fw.id}`)).toBe(true);
      }
    }
  });
});

