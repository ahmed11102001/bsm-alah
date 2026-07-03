import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signDevToken, buildDevSessionCookie } from "@/lib/dev-auth";
import { rateLimit } from "@/lib/rate-limit";
import { isOwnerOnlyAccount, getLatestOwnedProjectId } from "@/lib/dev-role";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "الإيميل وكلمة المرور مطلوبين" }, { status: 400 });
    }

    const key = `dev-login:${email.toLowerCase()}`;
    const rl = await rateLimit(key, { limit: 10, windowSecs: 15 * 60 });
    if (!rl.success) {
      return NextResponse.json(
        { error: `كثير من المحاولات. حاول بعد ${rl.retryAfter} ثانية` },
        { status: 429 }
      );
    }

    const developer = await prisma.developerUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!developer || !(await bcrypt.compare(password, developer.password))) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    if (developer.status === "SUSPENDED") {
      return NextResponse.json({ error: "الحساب موقف، تواصل مع الدعم" }, { status: 403 });
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
    return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}