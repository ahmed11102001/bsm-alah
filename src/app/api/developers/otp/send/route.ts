import { NextRequest, NextResponse } from "next/server";
import { sendProjectOtp } from "@/lib/dev-otp-sender";
import { getIP } from "@/lib/rate-limit";
import { requestLocale } from "@/lib/dev-errors";

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/developers/otp/send
//
// Headers:  x-api-key: wani_live_xxxx  → يحدد المشروع (لا يُقبل projectId من client)
// Body:     { phone, templateId?, templateName?, language?, expiryMinutes? }
//           - templateId: المسار الأساسي (Live Tester) — سجل القالب المحلي
//           - templateName [+ language]: legacy متوافق للـ clients الخارجية
// Response: { ok, token, expiresAt } | { ok: false, error, code }
//
// المنطق كله في @/lib/dev-otp-sender (محرك موحد مع فلو التسجيل والـ CLI).
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const rawKey = req.headers.get("x-api-key")?.trim() || null;

  let body: any = null;
  let bodyParseError = false;
  try {
    body = await req.json();
  } catch {
    bodyParseError = true;
  }

  const result = await sendProjectOtp({
    apiKey: rawKey,
    body,
    bodyParseError,
    ip: getIP(req),
    locale: requestLocale(req),
  });

  return NextResponse.json(result.json, {
    status: result.status,
    headers: result.headers,
  });
}
