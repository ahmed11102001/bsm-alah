import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// ─── buildCsp: ينشئ CSP header مع nonce لكل request ─────────────────────────
//
// الاستراتيجية:
//   • 'nonce-{nonce}' + 'strict-dynamic'
//       → بنحدد أي script تاني مش موثوق
//       → strict-dynamic بيخلي أي script بتلوّدها الـ Next.js chunks تشتغل بدون nonce
//       → 'unsafe-inline' بتتجاهل تلقائياً لما يوجد nonce (CSP Level 3)
//
//   • 'unsafe-eval' في development فقط
//       → Next.js dev server بيستخدم eval في webpack HMR
//       → في production مش محتاجها خالص
//
//   • لو مكتبة تانية محتاجة eval في production:
//       حطّها هنا مع تعليق يوضح ليه، بدل ما تحطها global
//
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = [
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : "", // webpack HMR في dev فقط
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
  ].join("; ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Middleware الرئيسي
// ═══════════════════════════════════════════════════════════════════════════════
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ── Step 1: توليد nonce عشوائي لكل request ──────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // ── Step 2: حماية الـ Dashboard بالـ Auth ───────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // مش مسجل دخول → وجّهه لصفحة الـ Login
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // حماية صفحة Admin — غير Super يشوف 404
    if (pathname.startsWith("/dashboard/admin") && !token.isSuper) {
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }
  }

  // ── Step 3: مرّر الـ nonce للـ layout عبر request header ────────────────────
  // layout.tsx بيقرأه من headers() ويحطه على الـ <Script> tags
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ── Step 4: حط الـ CSP في الـ response ──────────────────────────────────────
  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

// بنشغل الـ middleware على كل الصفحات ما عدا الـ static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};