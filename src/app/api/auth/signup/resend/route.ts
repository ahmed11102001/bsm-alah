// POST /api/auth/signup/resend — إعادة إرسال الكود (cooldown + سقف)
import { NextResponse } from "next/server";
import { getIP } from "@/lib/rate-limit";
import { getSignupSession } from "@/lib/signup-session";
import { requestSignupOtp } from "@/lib/signup-otp-send";

export async function POST(req: Request) {
  const { signupToken } = await req.json().catch(() => ({}));
  const state = await getSignupSession(String(signupToken ?? ""));
  if (!state || state.finalized || state.context !== "dashboard") {
    return NextResponse.json({ error: "جلسة التسجيل غير صالحة أو منتهية" }, { status: 400 });
  }

  const sent = await requestSignupOtp(String(signupToken), getIP(req));
  if (!sent.ok) {
    const status =
      sent.code === "COOLDOWN" || sent.code === "RATE_LIMITED" ? 429 : 400;
    return NextResponse.json(
      { error: sent.error, code: sent.code, retryAfter: sent.retryAfter },
      { status }
    );
  }
  return NextResponse.json({ sent: true });
}
