/**
 * Single source of truth for template visibility across every surface.
 *
 * Two template worlds that must never leak into each other:
 * - Developer (OTP) world: AUTHENTICATION templates only.
 * - Merchant (campaign) world: MARKETING / UTILITY templates only.
 *
 * Every list endpoint, picker, sender and test below derives from these
 * predicates — API/server-side first, UI second. UI-only hiding is not
 * sufficient: each flow re-checks at the enforcement point.
 */

export type TemplateCategory = "AUTHENTICATION" | "MARKETING" | "UTILITY" | string;
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "DISABLED" | string;

export interface TemplateLike {
  category?: TemplateCategory | null;
  status?: TemplateStatus | null;
  /** Linked Meta template id (developer OTP world). */
  metaTemplateId?: string | null;
}

function normCategory(category: TemplateCategory | null | undefined): string {
  return String(category ?? "").trim().toUpperCase();
}

function normStatus(status: TemplateStatus | null | undefined): string {
  return String(status ?? "").trim().toUpperCase();
}

/** Categories that belong to the Developer Portal (OTP only). */
export function isDeveloperTemplateCategory(category: TemplateCategory | null | undefined): boolean {
  return normCategory(category) === "AUTHENTICATION";
}

/** Categories that belong to the Merchant Dashboard (campaigns only). */
export function isMerchantTemplateCategory(category: TemplateCategory | null | undefined): boolean {
  const c = normCategory(category);
  return c === "MARKETING" || c === "UTILITY";
}

/**
 * OTP-sendable: what the Developer Portal list (sendable mode), Live Tester
 * and Wani CLI may offer. Mirrors `validateOtpTemplateContract`'s category +
 * status gates (metadata depth is checked separately by that contract and by
 * the Live Tester's `isOtpCompatibleWithMeta`).
 */
export function isOtpSendable(template: TemplateLike): boolean {
  if (!isDeveloperTemplateCategory(template.category)) return false;
  if (normStatus(template.status) !== "APPROVED") return false;
  if (!template.metaTemplateId) return false;
  return true;
}

/**
 * Campaign-sendable: what the merchant campaign picker and the campaign
 * enqueue path may accept. AUTHENTICATION (OTP) templates and anything not
 * Meta-APPROVED are rejected — server-side, not just hidden in the UI.
 */
export function isCampaignSendable(template: TemplateLike): boolean {
  if (!isMerchantTemplateCategory(template.category)) return false;
  if (normStatus(template.status) !== "APPROVED") return false;
  return true;
}
