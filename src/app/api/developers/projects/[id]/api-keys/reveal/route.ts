import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { decryptToken } from "@/lib/crypto";
import bcrypt from "bcryptjs";

// ── POST — كشف المفتاح الكامل بعد تأكيد الباسورد ────────────────────────────
// Body: { keyId, password }
// المفتاح الكامل متخزن مشفر (keyEncrypted) — لا يُعرض أبدًا بدون باسورد الحساب.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const project = await getProjectForOwnerOrDeveloper(id, session.id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

    const { keyId, password } = await req.json().catch(() => ({}));
    if (!keyId || !password) {
      return devError("keyId والباسورد مطلوبين", "INVALID_REQUEST", 400);
    }

    const ip = getIP(req);
    const rl = await rateLimit(`dev-key-reveal:${ip}`, { limit: 10, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("كثير من المحاولات — حاول بعد شوية", "RATE_LIMITED", rl.retryAfter);
    }

    const developer = await prisma.developerUser.findUnique({
      where: { id: session.id },
      select: { password: true },
    });
    if (!developer || !(await bcrypt.compare(String(password), developer.password))) {
      return devError("الباسورد غير صحيح", "INVALID_CREDENTIALS", 401);
    }

    const key = await prisma.developerApiKey.findFirst({
      where: { id: String(keyId), projectId: id, status: "ACTIVE" },
      select: { keyEncrypted: true },
    });
    if (!key) return devError("API Key مش موجود أو ملغي", "NOT_FOUND", 404);
    if (!key.keyEncrypted) {
      return devError(
        "المفتاح ده قديم وغير قابل للاسترجاع — أنشئ مفتاحًا جديدًا",
        "INVALID_REQUEST",
        400
      );
    }

    return NextResponse.json({ ok: true, fullKey: decryptToken(key.keyEncrypted) });
  } catch (err) {
    console.error("[project-api-keys-reveal]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}
