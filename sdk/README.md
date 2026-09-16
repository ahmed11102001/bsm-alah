# @aiwni/sdk

Official **server-side** Node.js SDK for the [Wani Developer API](https://developers.aiwni.com/docs) — send, verify and track WhatsApp OTP codes with a clean typed interface.

> ⚠️ **Server-side only.** Your API key is a secret. Never expose it to browsers, never bundle this package into client-side code, and never log the key.

The SDK talks to **Wani's public HTTP API exclusively**. It does **not** communicate with Meta/WhatsApp directly — credentials, templates, delivery, OTP storage and rate limits all stay on Wani's backend.

- TypeScript-first, ESM, Node.js ≥ 18
- Zero runtime dependencies (native `fetch` only)
- Typed errors with machine-readable `code`s

## Installation

```bash
npm install @aiwni/sdk
```

Requires **Node.js ≥ 18**.

## Quick start

Get your API key from the Developer Portal → your project → **API Keys**.

```ts
import { Wani } from "@aiwni/sdk";

const wani = new Wani({
  apiKey: process.env.WANI_API_KEY!,
});

// 1. Send an OTP (templateId is shown next to each template in the portal)
const sent = await wani.otp.send({
  phone: "2010xxxxxxxx",
  templateId: "YOUR_TEMPLATE_ID",
  expiryMinutes: 10, // optional, default 10
});
console.log(sent.token, sent.expiresAt);

// 2. Verify the code the user received
const verification = await wani.otp.verify({
  token: sent.token,
  code: "123456",
});
console.log(verification.verified); // true

// 3. Check delivery status any time
const st = await wani.otp.status(sent.token);
console.log(st.status); // "sent" | "pending" | "verified" | "expired" | "failed"
```

## Template selection

Prefer **`templateId`** (unambiguous — shown in the Developer Portal). The SDK never picks a template for you: no fallbacks, no "first approved template", no silent repairs.

For backwards compatibility with existing integrations you may pass a **`templateName`** instead (optionally with `language` when several languages share one name):

```ts
await wani.otp.send({
  phone: "2010xxxxxxxx",
  templateName: "otp_verification",
  language: "en_US", // only needed when the name exists in several languages
});
```

If Wani rejects the template (missing, not approved, wrong project…), you get a typed `WaniError` with the backend's `code` — e.g. `TEMPLATE_NOT_APPROVED`.

## Error handling

Every SDK failure is a `WaniError`:

```ts
import { Wani, WaniError } from "@aiwni/sdk";

try {
  await wani.otp.send({ phone, templateId });
} catch (err) {
  if (err instanceof WaniError) {
    console.log(err.status); // HTTP status, e.g. 401 / 429 / 400
    console.log(err.code);   // e.g. "TEMPLATE_NOT_APPROVED", "TIMEOUT"
    if (err.isAuthenticationError) {
      // bad or revoked API key — check x-api-key
    }
    if (err.isRateLimitError) {
      // slow down and retry after err.retryAfter seconds (if present)
      const waitMs = (err.retryAfter ?? 60) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}
```

`WaniError` exposes `status`, `code`, `requestId`, `retryAfter` (seconds, on 429/503 rate-limit bodies) and `details`. Network failures, timeouts and HTTP/API errors are distinguishable via `isNetworkError` / `isTimeoutError` / `isAuthenticationError` / `isRateLimitError`. Error messages never contain your API key.

## Configuration

```ts
const wani = new Wani({
  apiKey: process.env.WANI_API_KEY!,
  baseUrl: "https://developers.aiwni.com", // default; override for tests/self-hosted
  timeoutMs: 15_000,                        // default; per-request timeout
});
```

Per-call `AbortSignal` / timeout overrides are supported:

```ts
await wani.otp.send(params, { signal: AbortSignal.timeout(5_000) });
```

## Public endpoints used

| Method | Endpoint | SDK |
|---|---|---|
| POST | `/api/developers/otp/send` | `wani.otp.send(...)` |
| POST | `/api/developers/otp/verify` | `wani.otp.verify(...)` |
| GET | `/api/developers/otp/status/:token` | `wani.otp.status(token)` |

## Security notes

- Keep the API key in server environment variables (`WANI_API_KEY`).
- Never log the key, never return it from your own APIs, never commit it.
- The SDK sends the key only as the `x-api-key` header to the configured Wani base URL.

## License

MIT — see [LICENSE](./LICENSE).
