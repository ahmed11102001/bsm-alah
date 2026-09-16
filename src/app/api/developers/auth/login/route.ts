import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signDevToken, buildDevSessionCookie } from "@/lib/dev-auth";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { rateLimit } from "@/lib/rate-limit";
import { isOwnerOnlyAccount, getLatestOwnedProjectId } from "@/lib/dev-role";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return devError("الإيميل أو رقم الهاتف وكلمة المرور مطلوبين", "INVALID_REQUEST", 400);
    }

    // المعرف قد يكون إيميلًا أو رقم واتساب — يُحدد تلقائيًا
    const { parseIdentifier } = await import("@/lib/login-identifier");
    const identifier = parseIdentifier(email);
    if (!identifier) {
      return devError("بيانات الدخول غير صحيحة", "INVALID_CREDENTIALS", 401);
    }

    const key = `dev-login:${identifier.kind}:${identifier.value}`;
    const rl = await rateLimit(key, { limit: 10, windowSecs: 15 * 60 });
    if (!rl.success) {
      return devRateLimited(
        `كثير من المحاولات. حاول بعد ${rl.retryAfter} ثانية`,
        "RATE_LIMITED",
        rl.retryAfter
      );
    }

    const developer =
      identifier.kind === "email"
        ? await prisma.developerUser.findUnique({ where: { email: identifier.value } })
        : // توافق مع الصيغتين القديمة (+20...) والجديدة (20...)
          await prisma.developerUser.findFirst({
            where: {
              OR: [{ phone: identifier.value }, { phone: `+${identifier.value}` }],
            },
          });

    // مقارنة وهمية عند غياب الحساب — لمنع التمييز بالتوقيت (anti-enumeration)
    const { DUMMY_PASSWORD_HASH } = await import("@/lib/login-identifier");
    let isValid = false;
    try {
      isValid = developer
        ? await bcrypt.compare(password, developer.password)
        : await bcrypt.compare(password, DUMMY_PASSWORD_HASH).then(() => false);
    } catch {
      isValid = false;
    }
    if (!developer || !isValid) {
      return devError("بيانات الدخول غير صحيحة", "INVALID_CREDENTIALS", 401);
    }
    if (developer.status === "SUSPENDED") {
      return devError("الحساب موقف، تواصل مع الدعم", "ACCOUNT_SUSPENDED", 403);
    }

    const token = await signDevToken({
      id: developer.id,
      email: developer.email,
      name: `${developer.firstName} ${developer.lastName}`,
      status: developer.status,
    });

    // أونر بس (مالوش أي مشروع هو مطوّره) → يدخل مباشرة لبورتال مشروعه، مش لصفحة القائمة
    let redirect = "/developers/portal";
    if (await isOwnerOnlyAccount(developer.id)) {
      const projectId = await getLatestOwnedProjectId(developer.id);
      if (projectId) redirect = `/developers/portal/projects/${projectId}`;
    }

    const res = NextResponse.json({ ok: true, redirect });
    res.headers.set("Set-Cookie", buildDevSessionCookie(token));
    return res;
  } catch (err) {
    console.error("[dev-login]", err);
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }
}