import prisma from "@/lib/prisma";
import { PLANS, PLAN_NAMES, type PlanTier } from "@/lib/plans";

/**
 * Google Sheets is a paid feature. Starter and every higher plan can use it.
 * This is intentionally server-side so the restriction cannot be bypassed
 * by calling the API directly from the browser.
 */
export async function getGoogleSheetsAccess(ownerId: string) {
  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { isSuper: true } }),
    prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: true, status: true, currentPeriodEnd: true, isBetaUser: true },
    }),
  ]);

  if (user?.isSuper || subscription?.isBetaUser) {
    return { allowed: true as const, plan: "enterprise" as PlanTier };
  }

  let plan: PlanTier = (subscription?.plan as PlanTier) || "free";
  if (
    !subscription ||
    subscription.status === "expired" ||
    subscription.status === "cancelled" ||
    (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date())
  ) {
    plan = "free";
  }

  const allowed = plan !== "free";
  return {
    allowed,
    plan,
    requiredPlan: "starter" as const,
    message: allowed
      ? ""
      : `استيراد الجمهور من Google Sheets متاح في باقة ${PLAN_NAMES.starter} وما فوقها. قم بالترقية لاستخدام Google Sheets.`,
  };
}

export async function requireGoogleSheetsAccess(ownerId: string) {
  const access = await getGoogleSheetsAccess(ownerId);
  if (access.allowed) return null;
  return Response.json(
    {
      error: access.message,
      code: "FEATURE_LOCKED",
      feature: "googleSheets",
      plan: access.plan,
      requiredPlan: access.requiredPlan,
    },
    { status: 403 },
  );
}
