import crypto from "crypto";
import bcrypt from "bcryptjs";

export const INVITATION_EXPIRY_HOURS = 48;

/**
 * Generates a clean, readable, secure Join Code.
 * Format: WANI-XXXX-XXXX (e.g. WANI-7K4P-92XM)
 */
export function generateJoinCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(8);
  let p1 = "";
  let p2 = "";
  for (let i = 0; i < 4; i++) {
    p1 += chars[bytes[i] % chars.length];
  }
  for (let i = 4; i < 8; i++) {
    p2 += chars[bytes[i] % chars.length];
  }
  return `WANI-${p1}-${p2}`;
}

/**
 * Normalize and hash the join code with bcrypt.
 */
export async function hashJoinCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase();
  return bcrypt.hash(normalized, 10);
}

/**
 * Verify input join code against stored hash.
 */
export async function verifyJoinCode(code: string, codeHash: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  return bcrypt.compare(normalized, codeHash);
}
