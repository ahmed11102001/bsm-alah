/**
 * At-rest encryption for CLI secrets (session cookie, project API keys).
 *
 * Threat model (honest version):
 * - Secrets are AES-256-GCM encrypted with a key derived (scrypt) from
 *   machine+user-specific factors plus a random per-install salt file.
 * - This defeats casual file leaks: backups, cloud-synced home dirs,
 *   dotfile repos, shoulder-surfing of the config file — the ciphertext
 *   alone is useless off this machine+user.
 * - It does NOT defeat an attacker already running code as the same
 *   OS user (they can derive the same key). That threat is covered by
 *   file permissions (0600) and OS user separation — the same boundary
 *   industry CLIs (gh, aws) rely on. This is NOT an OS-keychain substitute;
 *   see README "Security model".
 *
 * No runtime dependencies (node:crypto + node:fs only).
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { configHome } from "../config/paths.js";

const PREFIX = "enc:v1:";
const SALT_FILE_NAME = ".wani-salt";

function machineFactors(): string {
  let user = "unknown";
  try {
    user = os.userInfo().username || "unknown";
  } catch {
    // best effort — ephemeral environments
  }
  return [os.hostname(), user, process.platform, process.arch].join("|");
}

function loadOrCreateSalt(): Buffer {
  const saltPath = path.join(configHome(), SALT_FILE_NAME);
  try {
    const existing = fs.readFileSync(saltPath);
    if (existing.length >= 16) return existing;
  } catch {
    // missing or unreadable — generate below
  }
  const salt = randomBytes(16);
  fs.mkdirSync(configHome(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(saltPath, salt, { mode: 0o600 });
  try {
    fs.chmodSync(saltPath, 0o600);
  } catch {
    // best effort (filesystems without unix modes)
  }
  return salt;
}

function deriveKey(): Buffer {
  return scryptSync(machineFactors(), loadOrCreateSalt(), 32);
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  if (isEncryptedValue(plain)) return plain; // idempotent — never double-wrap
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const envelope = JSON.stringify({
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
  return PREFIX + Buffer.from(envelope, "utf8").toString("base64");
}

/** Throws when the value is undecryptable (salt lost / copied from elsewhere). */
export function decryptSecret(stored: string): string {
  if (!isEncryptedValue(stored)) return stored; // legacy plaintext — migrated on save
  const key = deriveKey();
  const envelope = JSON.parse(Buffer.from(stored.slice(PREFIX.length), "base64").toString("utf8")) as {
    iv: string;
    tag: string;
    data: string;
  };
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]).toString("utf8");
}
