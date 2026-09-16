import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { devRateLimited, devError } from "@/lib/dev-errors";
import {
  newDeviceCode,
  newUserCode,
  newBrowserTicket,
  CLI_AUTH_REQUEST_TTL_SECS,
  CLI_AUTH_TICKET_TTL_SECS,
} from "@/lib/dev-cli-auth";

// ─── POST /api/developers/cli/device/code ───────────────────────────────────
// Starts a CLI device authorization (future `wani login` calls this first).
// Public + rate-limited. Returns the device secret (once, in body only) and
// the short user code the developer types at /developers/cli/authorize.
// Stores hashes only — never the raw codes.
export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const rl = await rateLimit(`cli-device-code:${ip}`, { limit: 10, windowSecs: 3600 });
  if (!rl.success) {
    return devRateLimited("كثير من المحاولات، حاول بعد شوية", "RATE_LIMITED", rl.retryAfter);
  }

  let deviceName: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.device_name === "string" && body.device_name.trim()) {
      deviceName = body.device_name.trim().slice(0, 64);
    }
  } catch {
    // Empty/invalid body is fine — device name is optional.
  }

  const device = newDeviceCode();
  const user = newUserCode();
  const ticket = newBrowserTicket();

  try {
    await prisma.developerCliAuthorization.create({
      data: {
        deviceCodeHash: device.hash,
        userCodeHash: user.hash,
        browserTicketHash: ticket.hash,
        browserTicketExpiresAt: new Date(Date.now() + CLI_AUTH_TICKET_TTL_SECS * 1000),
        deviceName: deviceName ?? null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + CLI_AUTH_REQUEST_TTL_SECS * 1000),
      },
    });
  } catch (err) {
    console.error("[cli-device-code]", err);
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }

  return NextResponse.json({
    device_code: device.raw,
    user_code: user.display,
    // Seamless flow: the URI carries a short-lived single-use ticket, so the
    // browser lands straight on the approval screen — no code typing.
    // Manual fallback (typing user_code) keeps working unchanged.
    verification_uri: `/developers/cli/authorize?ticket=${ticket.raw}`,
    expires_in: CLI_AUTH_REQUEST_TTL_SECS,
  });
}
