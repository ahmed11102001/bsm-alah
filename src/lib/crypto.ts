// src/lib/crypto.ts
// ─── تشفير وفك تشفير البيانات الحساسة (AES-256-GCM) ─────────────────────────
//
// الاستخدام:
//   import { encryptToken, decryptToken } from "@/lib/crypto";
//
//   // عند الحفظ في DB:
//   const encrypted = encryptToken(plainAccessToken);
//   await prisma.whatsAppAccount.upsert({ data: { accessToken: encrypted } });
//
//   // عند القراءة من DB:
//   const plain = decryptToken(account.accessToken);
//   headers: { Authorization: `Bearer ${plain}` }
//
// متطلبات:
//   ENCRYPTION_KEY في .env — 64 hex chars (= 32 bytes)
//   مثال: openssl rand -hex 32
//
// الفورمات المحفوظ في DB: "iv:authTag:ciphertext" (كل حاجة base64)

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;       // 96-bit IV — موصى بيه لـ GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

// ── تحميل المفتاح ────────────────────────────────────────────────────────────
function getKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error(
      "[crypto] ENCRYPTION_KEY مش موجودة في .env — شغّل: openssl rand -hex 32"
    );
  }
  if (hexKey.length !== 64) {
    throw new Error(
      `[crypto] ENCRYPTION_KEY لازم تكون 64 hex chars (32 bytes) — طولها الحالي: ${hexKey.length}`
    );
  }
  return Buffer.from(hexKey, "hex");
}

// ── تشفير ────────────────────────────────────────────────────────────────────
/**
 * تشفّر plain text وترجع string مناسب للحفظ في DB.
 * الفورمات: "iv:authTag:ciphertext" (base64)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return plainText;

  const key    = getKey();
  const iv     = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

// ── فك تشفير ─────────────────────────────────────────────────────────────────
/**
 * بتفك تشفير القيمة المخزنة في DB وترجع plain text.
 * لو القيمة مش مشفرة (legacy plain text) بترجعها كما هي مع تسجيل تحذير.
 */
export function decryptToken(stored: string): string {
  if (!stored) return stored;

  // لو مش فيها ":" على الأرجح plain text قديم — نرجّعه مع تحذير
  const parts = stored.split(":");
  if (parts.length !== 3) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[crypto] ⚠️ accessToken في DB يبدو plain text — فكّر في migration");
    }
    return stored; // backward compat مع القيم القديمة
  }

  const [ivB64, authTagB64, cipherB64] = parts;

  try {
    const key      = getKey();
    const iv       = Buffer.from(ivB64,      "base64");
    const authTag  = Buffer.from(authTagB64, "base64");
    const cipher   = Buffer.from(cipherB64,  "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(cipher),
      decipher.final(),
    ]).toString("utf8");
  } catch (err) {
    console.error("[crypto] فشل فك التشفير:", err);
    throw new Error("فشل فك تشفير الـ access token — تحقق من ENCRYPTION_KEY");
  }
}

// ── مساعد: هل القيمة مشفرة فعلاً؟ ───────────────────────────────────────────
export function isEncrypted(value: string): boolean {
  return value.split(":").length === 3;
}
