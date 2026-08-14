import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

export const GOOGLE_SHEETS_MAX_ROWS = 10_000;

export function googleSheetsRedirectUri(): string {
  return process.env.GOOGLE_SHEETS_REDIRECT_URI
    ?? `${process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV === "production" ? "https://aiwni.com" : "http://localhost:3000")}/api/google-sheets/callback`;
}

function oauthClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth غير مُعدّ: GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET مطلوبان");
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    googleSheetsRedirectUri(),
  );
}

function stateSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET مطلوب لتأمين Google OAuth state");
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createGoogleSheetsState(userId: string): string {
  const payload = encode(JSON.stringify({
    userId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  }));
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyGoogleSheetsState(state: string): { userId: string } | null {
  try {
    const [payload, signature] = state.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(decode(payload)) as { userId?: string; exp?: number };
    if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export function googleAuthUrl(): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SHEETS_SCOPES,
    include_granted_scopes: true,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function getAuthorizedOAuthClient(connection: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}) {
  const client = oauthClient();
  const refreshToken = connection.refreshToken ? decryptToken(connection.refreshToken) : undefined;
  const accessToken = connection.accessToken ? decryptToken(connection.accessToken) : undefined;

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiresAt?.getTime(),
  });

  if (!refreshToken) throw new Error("انتهت جلسة Google. أعد ربط Google Sheets.");

  if (!connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() <= Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken();
    await prisma.googleSheetsConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: credentials.access_token ? encryptToken(credentials.access_token) : connection.accessToken,
        refreshToken: credentials.refresh_token ? encryptToken(credentials.refresh_token) : connection.refreshToken,
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : connection.tokenExpiresAt,
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

export async function getGoogleSheetsClient(connection: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}) {
  return google.sheets({ version: "v4", auth: await getAuthorizedOAuthClient(connection) });
}

export async function getGoogleDriveClient(connection: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}) {
  return google.drive({ version: "v3", auth: await getAuthorizedOAuthClient(connection) });
}

export async function ownedConnection(userId: string, connectionId?: string | null) {
  const connection = await prisma.googleSheetsConnection.findFirst({
    where: { userId, ...(connectionId ? { id: connectionId } : {}) },
  });
  if (!connection) throw new Error("اتصال Google Sheets غير موجود");
  return connection;
}

export function columnIndexToA1(index: number): string {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function parseColumnIndex(value: unknown, headers: string[]): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  const text = String(value ?? "").trim();
  const byHeader = headers.findIndex((header) => header.trim() === text);
  if (byHeader >= 0) return byHeader;
  if (/^[A-Za-z]+$/.test(text)) {
    return text.toUpperCase().split("").reduce((n, char) => n * 26 + char.charCodeAt(0) - 64, 0) - 1;
  }
  const numeric = Number(text);
  return Number.isInteger(numeric) ? numeric : -1;
}
