import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";
import { notifyWhatsAppTokenInvalid } from "@/lib/notifications";

export const WhatsAppTokenStatus = {
  ACTIVE: "ACTIVE",
  EXPIRING_SOON: "EXPIRING_SOON",
  EXPIRED: "EXPIRED",
  INVALID: "INVALID",
  UNKNOWN: "UNKNOWN",
} as const;

export type WhatsAppTokenStatusValue = typeof WhatsAppTokenStatus[keyof typeof WhatsAppTokenStatus];

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 7;

type DebugTokenResponse = {
  data?: {
    is_valid?: boolean;
    expires_at?: number;
    data_access_expiration_time?: number;
    app_id?: string;
    type?: string;
    granular_scopes?: unknown;
  };
  error?: { message?: string; code?: number; error_subcode?: number };
};

export class TokenCheckUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenCheckUnavailableError";
  }
}

function dateFromUnix(value?: number): Date | null {
  return value && Number.isFinite(value) && value > 0 ? new Date(value * 1000) : null;
}

export function deriveWhatsAppTokenStatus(data: DebugTokenResponse["data"], now = new Date()): WhatsAppTokenStatusValue {
  if (!data || data.is_valid === false) return WhatsAppTokenStatus.INVALID;

  const expiryDates = [dateFromUnix(data.expires_at), dateFromUnix(data.data_access_expiration_time)].filter(Boolean) as Date[];
  const nearestExpiry = expiryDates.sort((a, b) => a.getTime() - b.getTime())[0];
  if (nearestExpiry && nearestExpiry.getTime() <= now.getTime()) return WhatsAppTokenStatus.EXPIRED;
  if (nearestExpiry && nearestExpiry.getTime() - now.getTime() <= EXPIRING_SOON_DAYS * DAY_MS) {
    return WhatsAppTokenStatus.EXPIRING_SOON;
  }
  return data.is_valid === true ? WhatsAppTokenStatus.ACTIVE : WhatsAppTokenStatus.UNKNOWN;
}

export async function debugWhatsAppToken(accessToken: string): Promise<DebugTokenResponse["data"]> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new TokenCheckUnavailableError("Meta app credentials are not configured");

  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: `${appId}|${appSecret}`,
  });
  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token?${params}`);
  } catch (error: any) {
    throw new TokenCheckUnavailableError(error?.message ?? "Meta debug_token request failed");
  }

  const payload = await response.json().catch(() => ({})) as DebugTokenResponse;
  if (!response.ok || payload.error || !payload.data) {
    throw new TokenCheckUnavailableError(payload.error?.message ?? `Meta debug_token failed (${response.status})`);
  }
  return payload.data;
}

export async function checkWhatsAppAccountToken(account: {
  id: string;
  accessToken: string;
  tokenStatus?: string;
}) {
  const debugData = await debugWhatsAppToken(decryptToken(account.accessToken));
  const status = deriveWhatsAppTokenStatus(debugData);
  const tokenExpiresAt = dateFromUnix(debugData?.expires_at);
  const tokenDataAccessExpiresAt = dateFromUnix(debugData?.data_access_expiration_time);

  const updated = await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: {
      tokenStatus: status,
      tokenExpiresAt,
      tokenDataAccessExpiresAt,
      lastTokenCheckAt: new Date(),
      ...(status === WhatsAppTokenStatus.ACTIVE ? { tokenExpiredNotifiedAt: null, tokenInvalidNotifiedAt: null } : {}),
    },
    select: { id: true, userId: true, tokenStatus: true, tokenExpiresAt: true, tokenDataAccessExpiresAt: true },
  });
  return { updated, debugData };
}

/** Called after Meta gave a token-specific error during a real send. */
export async function markWhatsAppTokenInvalidByPhoneNumberId(
  phoneNumberId: string,
  reason?: string,
  userId?: string,
) {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId, ...(userId ? { userId } : {}) },
    select: { id: true, userId: true, tokenInvalidNotifiedAt: true },
  });
  if (!account) return;

  const now = new Date();
  const claimed = await prisma.whatsAppAccount.updateMany({
    where: account.tokenInvalidNotifiedAt
      ? { id: account.id }
      : { id: account.id, tokenInvalidNotifiedAt: null },
    data: { tokenStatus: WhatsAppTokenStatus.INVALID, lastTokenCheckAt: now, ...(account.tokenInvalidNotifiedAt ? {} : { tokenInvalidNotifiedAt: now }) },
  });
  if (claimed.count && !account.tokenInvalidNotifiedAt) {
    await notifyWhatsAppTokenInvalid(account.userId, reason);
  }
}
