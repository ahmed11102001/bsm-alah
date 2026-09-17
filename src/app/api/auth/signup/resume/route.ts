// GET /api/auth/signup/resume?token=... — لينك الاستكمال من إيميل التذكير
// التوكن الأصلي بتاع Redis بيعيش 15 دقيقة بس، فاللينك بيصدر جلسة جديدة
// طازجة بنفس بيانات جوجل ويودّي اليوزر على خطوة الرقم مكان ما وقف.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { createSignupSession } from "@/lib/signup-session";
import {
  hashResumeToken,
  markSignupLeadConverted,
  SIGNUP_LEAD_STATUS,
  type SignupLeadSource,
} from "@/lib/signup-leads";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";

function startOverUrl(req: Request, source: string, locale: string): string {
  if (source === "PORTAL") return `${DEVELOPERS_BASE_URL}/signup`;
  return new URL(`/auth?mode=signup&lang=${locale === "en" ? "en" : "ar"}`, req.url).toString();
}

export async function GET(req: Request) {
  const ip = getIP(req);
  const rl = await rateLimit(`signup-resume:${ip}`, { limit: 10, windowSecs: 900 });
  const token = new URL(req.url).searchParams.get("token") ?? "";

  const goStart = (source: string, locale: string) =>
    NextResponse.redirect(startOverUrl(req, source, locale));

  if (!rl.success || !/^[a-f0-9]{64}$/.test(token)) {
    return goStart("DASHBOARD", "ar");
  }

  const lead = await prisma.signupLead.findUnique({
    where: { resumeTokenHash: hashResumeToken(token) },
  });
  if (
    !lead ||
    !lead.resumeExpiresAt ||
    lead.resumeExpiresAt.getTime() < Date.now() ||
    lead.status === SIGNUP_LEAD_STATUS.CONVERTED ||
    !lead.googleSub
  ) {
    return goStart(lead?.source ?? "DASHBOARD", lead?.locale ?? "ar");
  }

  const source = lead.source as SignupLeadSource;
  const locale = lead.locale === "en" ? "en" : "ar";

  // لو كمّل في النص (الحساب اتعمل) → اقفل الليد وودّه لتسجيل الدخول
  if (source === "PORTAL") {
    const dev = await prisma.developerUser.findUnique({
      where: { email: lead.email },
      select: { id: true },
    });
    if (dev) {
      await markSignupLeadConverted(lead.email);
      return NextResponse.redirect(`${DEVELOPERS_BASE_URL}/signin`);
    }
  } else {
    const u = await prisma.user.findUnique({
      where: { email: lead.email },
      select: { id: true },
    });
    if (u) {
      await markSignupLeadConverted(lead.email);
      return NextResponse.redirect(
        new URL(`/auth?mode=login&lang=${locale}`, req.url).toString()
      );
    }
  }

  // جلسة جديدة طازجة (15 دقيقة) بنفس بيانات جوجل → خطوة الرقم مباشرة
  let fresh: string;
  try {
    const created = await createSignupSession(source === "PORTAL" ? "portal" : "dashboard", {
      sub: lead.googleSub,
      email: lead.email,
      name: lead.name,
      picture: null,
    });
    fresh = created.token;
  } catch {
    return goStart(source, locale);
  }

  const qs = new URLSearchParams({
    signupToken: fresh,
    signupEmail: lead.email,
    signupName: lead.name ?? "",
    lang: locale,
  });
  if (source === "PORTAL") {
    return NextResponse.redirect(`${DEVELOPERS_BASE_URL}/signup?${qs.toString()}`);
  }
  return NextResponse.redirect(
    new URL(`/auth?mode=signup&${qs.toString()}`, req.url).toString()
  );
}
