import { checkFeature, guardResponse } from "@/lib/plan-guard";

/**
 * Google Sheets is a paid feature (Go / starter and above).
 * Delegates to the centralised checkFeature() in plan-guard.ts
 * so the plan logic lives in one place (plans.ts + plan-guard.ts).
 */
export async function getGoogleSheetsAccess(ownerId: string) {
  const result = await checkFeature(ownerId, "googleSheets");
  if (result.allowed) {
    return { allowed: true as const, plan: "starter" as const };
  }
  return {
    allowed: false as const,
    plan: result.plan,
    requiredPlan: result.requiredPlan ?? ("starter" as const),
    message: result.message,
  };
}

export async function requireGoogleSheetsAccess(ownerId: string) {
  const result = await checkFeature(ownerId, "googleSheets");
  if (result.allowed) return null;
  return Response.json(
    {
      error: result.message,
      code: "FEATURE_LOCKED",
      feature: "googleSheets",
      plan: result.plan,
      requiredPlan: result.requiredPlan,
    },
    { status: 403 },
  );
}
