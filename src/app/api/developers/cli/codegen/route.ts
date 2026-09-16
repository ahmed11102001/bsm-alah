import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { devRateLimited, devError, lmsg } from "@/lib/dev-errors";
import { requireCliSession } from "@/lib/dev-cli-auth";
import {
  generateIntegrationCode,
  getOtpApiContract,
  frameworksForLanguage,
  type IntegrationLanguage,
  type QuickStartOperation,
} from "@/lib/developer-code-generator";

// ─── POST /api/developers/cli/codegen ───────────────────────────────────────
// Official CLI code-generation API (powers `wani init`). Derives from the SAME
// generator the portal Quick Start uses — single source of truth, no drift.
// Bearer CLI session only. Never returns secrets; templateId comes from the
// caller's own project data.
const LANGUAGES: IntegrationLanguage[] = ["javascript", "typescript", "python", "php", "curl"];
const OPERATIONS: QuickStartOperation[] = ["send", "verify", "send-verify", "status"];

export async function POST(req: NextRequest) {
  const cli = await requireCliSession(req);
  if (!cli) return devError("Invalid or expired CLI session", "INVALID_SESSION", 401);

  const ip = getIP(req);
  const rl = await rateLimit(`cli-codegen:${ip}`, { limit: 60, windowSecs: 3600 });
  if (!rl.success) {
    return devRateLimited(lmsg(req, "كثير من المحاولات، حاول بعد شوية", "Too many attempts, try again shortly"), "RATE_LIMITED", rl.retryAfter);
  }

  const body = await req.json().catch(() => ({}));
  const language = body?.language;
  const framework = body?.framework;
  const operation: QuickStartOperation = body?.operation ?? "send";
  const templateId = typeof body?.templateId === "string" && body.templateId ? body.templateId : undefined;

  if (!LANGUAGES.includes(language)) {
    return devError("Unsupported language. Choose one of: javascript, typescript, python, php, curl.", "INVALID_REQUEST", 400);
  }
  if (!OPERATIONS.includes(operation)) {
    return devError("Unsupported operation. Choose one of: send, verify, status.", "INVALID_REQUEST", 400);
  }
  if (typeof framework !== "string" || !frameworksForLanguage(language).some((f) => f.id === framework)) {
    return devError(
      `Unsupported framework for ${language}. Choose one of: ${frameworksForLanguage(language).map((f) => f.id).join(", ")}.`,
      "INVALID_REQUEST",
      400
    );
  }

  const contract = getOtpApiContract(operation, templateId);
  const code = generateIntegrationCode({
    operation,
    language,
    framework,
    templateId,
    baseUrl: "https://developers.aiwni.com/api/developers/otp",
  });

  return NextResponse.json({
    ok: true,
    language,
    framework,
    operation,
    endpoint: `/api/developers/otp${contract.path}`,
    code,
  });
}
