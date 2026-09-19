// src/lib/email-marketing/unsubscribe-token.ts
// ─── Signed unsubscribe tokens ─────────────────────────────────────────────
// المشكلة: رابط `/unsubscribe?c=<contactId>` بيخلّي الـ Contact ID نفسه هو
// الـ token — أي حد معاه ID صحيح يقدر يغيّر حالة الـ Contact.
// الحل: توقيع الـ contactId بـ HMAC-SHA256 (غير قابل للتلاعب)، والرابط الجديد:
//   /unsubscribe?t=<contactId_b64url>.<sig_b64url>
// التحقق: نعيد حساب الـ HMAC ونقارن بـ timingSafeEqual. الـ secret من
// NEXTAUTH_SECRET (موجود إجباريًا في env) مع fallback لـ ENCRYPTION_KEY.

import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const s =
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.ENCRYPTION_KEY;
  if (!s) {
    throw new Error(
      "[unsubscribe-token] لا يوجد secret للتوقيع — اضبط NEXTAUTH_SECRET"
    );
  }
  return s;
}

function b64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/** يوقّع contactId ويرجع token غير قابل للتلاعب. */
export function signUnsubscribeToken(contactId: string): string {
  const cid = b64urlEncode(contactId);
  const sig = createHmac("sha256", getSecret())
    .update(cid, "utf8")
    .digest("base64url");
  return `${cid}.${sig}`;
}

/**
 * يتحقق من الـ token ويرجع الـ contactId لو سليم، أو null لو متلاعَب فيه /
 * فورماته غلط. لا يعمل أي DB lookup — الكولر مسؤول عن التحقق من وجود الـ Contact.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const cid = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!cid || !sig) return null;

  let expected: string;
  try {
    expected = createHmac("sha256", getSecret())
      .update(cid, "utf8")
      .digest("base64url");
  } catch {
    return null;
  }

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const contactId = b64urlDecode(cid);
    if (!contactId) return null;
    return contactId;
  } catch {
    return null;
  }
}

function unsubscribeBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://aiwni.com"
  ).replace(/\/$/, "");
}

/** يبني رابط إلغاء الاشتراك الموقّع الكامل. */
export function buildUnsubscribeUrl(contactId: string): string {
  return `${unsubscribeBaseUrl()}/unsubscribe?t=${encodeURIComponent(
    signUnsubscribeToken(contactId)
  )}`;
}
