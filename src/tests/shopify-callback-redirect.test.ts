import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  shopifyStore: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

const mockGetValidToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/shopify-auth", () => ({
  getValidShopifyAccessToken: mockGetValidToken,
}));

import { GET } from "@/app/api/shopify/callback/route";
import { NextRequest } from "next/server";

const APP_URL = "https://aiwni.com";
const SHOP_SECRET = "test-shop-secret";
const NEXTAUTH_SECRET = "test-nextauth-secret";

function signState(email: string): string {
  const payloadB64 = Buffer.from(JSON.stringify({ email, nonce: "n", ts: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", NEXTAUTH_SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

function signCallbackHmac(params: Record<string, string>): string {
  const message = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return crypto.createHmac("sha256", SHOP_SECRET).update(message).digest("hex");
}

function callbackReq(params: Record<string, string>): NextRequest {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`${APP_URL}/api/shopify/callback?${qs}`);
}

describe("Shopify OAuth callback — redirects land on /channels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SHOPIFY_APP_CLIENT_ID", "test-client-id");
    vi.stubEnv("SHOPIFY_APP_CLIENT_SECRET", SHOP_SECRET);
    vi.stubEnv("NEXTAUTH_SECRET", NEXTAUTH_SECRET);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_URL);
    vi.stubEnv("ENCRYPTION_KEY", "ab".repeat(32));
    mockPrisma.shopifyStore.findUnique.mockResolvedValue(null);
  });

  it("missing params → /channels?shopify_error=missing_params (not /dashboard/api)", async () => {
    const res = await GET(callbackReq({}));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toBe(`${APP_URL}/channels?shopify_error=missing_params`);
    expect(loc).not.toContain("/dashboard/api");
  });

  it("invalid shop → /channels?shopify_error=invalid_shop", async () => {
    const state = signState("u@test.com");
    const res = await GET(callbackReq({ code: "c", shop: "evil.com", state }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${APP_URL}/channels?shopify_error=invalid_shop`);
  });

  it("invalid hmac → /channels?shopify_error=invalid_hmac", async () => {
    const state = signState("u@test.com");
    const res = await GET(
      callbackReq({ code: "c", shop: "test.myshopify.com", state, hmac: "00".repeat(32) })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${APP_URL}/channels?shopify_error=invalid_hmac`);
  });

  it("success → /channels?shopify_connected=1 + store upserted", async () => {
    const state = signState("u@test.com");
    const params = { code: "authcode", shop: "test.myshopify.com", state };
    const hmac = signCallbackHmac(params);

    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", parentId: null });
    mockPrisma.shopifyStore.findFirst.mockResolvedValue(null);
    mockPrisma.shopifyStore.upsert.mockResolvedValue({ id: "s-1" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: "tok123" }),
      })
    );

    const res = await GET(callbackReq({ ...params, hmac }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${APP_URL}/channels?shopify_connected=1`);
    expect(mockPrisma.shopifyStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-1" } })
    );

    vi.unstubAllGlobals();
  });
});
