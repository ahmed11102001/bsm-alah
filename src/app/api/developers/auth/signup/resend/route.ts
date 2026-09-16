// POST /api/developers/auth/signup/resend — إعادة إرسال الكود
import { NextRequest, NextResponse } from "next/server";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { getIP } from "@/lib/rate-limit";
import { getSignupSession } from "@/lib/signup-session";
import { requestSignupOtp } from "@/lib/signup-otp-send";

export async function POST(req: NextRequest) {
  try {
    const { signupToken } = await req.json().catch(() => ({}));
    const state = await getSignupSession(String(signupToken ?? ""));
    if (!state || state.finalized || state.context !== "portal") {
      return devError("جلسة التسجيل غير صالحة أو منتهية", "INVALID_REQUEST", 400);
    }

    const sent = await requestSignupOtp(String(signupToken), getIP(req));
    if (!sent.ok) {
      if (sent.code === "COOLDOWN" || sent.code === "RATE_LIMITED") {
        return devRateLimited(sent.error ?? "انتظر قليلًا", sent.code ?? "RATE_LIMITED", sent.retryAfter);
      }
      return devError(sent.error ?? "تعذر إرسال الكود", sent.code ?? "SEND_FAILED", 400);
    }
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[dev-signup-resend]", err);
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }
}
