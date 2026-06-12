import { getToken }                from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

// ─── buildCsp: ينشئ CSP header مع nonce لكل request ─────────────────────────
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = [
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const styleSrc = [
    "'self'",
    "https://fonts.googleapis.com",
    // ✅ inline <style> tags في الـ developers pages و dev tools
    // ملاحظة: لازم نسيب الـ nonce بره الـ directive ده — وجود nonce-source
    // في style-src بيخلي المتصفح يتجاهل 'unsafe-inline' تمامًا (CSP Level 2+)،
    // وده كان السبب في عدم تطبيق <style> tags في صفحات الـ developer portal.
    "'unsafe-inline'",
  ]
    .filter(Boolean)
    .join(" ");

  const connectSrc = [
    "'self'",
    // Meta / WhatsApp API
    "https://graph.facebook.com",
    "https://graph.instagram.com",
    // Cloudinary
    "https://*.cloudinary.com",
    // Resend
    "https://api.resend.com",
    // Inngest
    "https://api.inngest.com",
    // ElevenLabs
    "https://api.elevenlabs.io",
    // Upstash Redis
    "https://*.upstash.io",
    // Sentry
    "https://*.sentry.io",
    "https://o4511405530284032.ingest.us.sentry.io",
    // WebSocket
    "wss:",
    isDev ? "http://localhost:*" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: https: blob:",
    "media-src 'self' blob:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "X-Content-Type-Options: nosniff",
  ].join("; ");
}

// ─── Helper: apply security headers ──────────────────────────────────────────
function applyHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

// ─── Developer public routes — لا تحتاج auth ─────────────────────────────────
const PUBLIC_DEV_ROUTES = [
  "/developers",
  "/developers/signin",
  "/developers/signup",
  "/developers/pricing",
];

function isPublicDevRoute(pathname: string): boolean {
  return PUBLIC_DEV_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROXY — الـ export المطلوب من Next.js 16
// ═══════════════════════════════════════════════════════════════════════════════
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // ═══════════════════════════════════════════════════════════════════════
  // 1. DEVELOPER ROUTES — JWT Cookie (مستقل عن NextAuth)
  // ═══════════════════════════════════════════════════════════════════════
  if (pathname.startsWith("/developers")) {

    // صفحات عامة — تمر بدون auth
    if (isPublicDevRoute(pathname)) {
      return applyHeaders(NextResponse.next(), nonce);
    }

    // تحقق من الـ dev session
    const devSession = await getDevSessionFromRequest(req);

    // مفيش session → signin
    if (!devSession) {
      const url = new URL("/developers/signin", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return applyHeaders(NextResponse.redirect(url), nonce);
    }

    // SUSPENDED → منع الدخول
    if (devSession.status === "SUSPENDED") {
      const url = new URL("/developers/signin", req.url);
      url.searchParams.set("error", "suspended");
      return applyHeaders(NextResponse.redirect(url), nonce);
    }

    // PENDING_META → يروح يربط Meta أول
    if (
      devSession.status === "PENDING_META" &&
      !pathname.startsWith("/developers/connect-meta")
    ) {
      return applyHeaders(
        NextResponse.redirect(new URL("/developers/connect-meta", req.url)),
        nonce
      );
    }

    // ACTIVE → منع رجوعه لـ connect-meta
    if (
      devSession.status === "ACTIVE" &&
      pathname.startsWith("/developers/connect-meta")
    ) {
      return applyHeaders(
        NextResponse.redirect(new URL("/developers/portal", req.url)),
        nonce
      );
    }

    // مصادق عليه → كمّل
    return applyHeaders(NextResponse.next(), nonce);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. MARKETING ROUTES — NextAuth (اللي كان موجود، ما اتغيرش)
  // ═══════════════════════════════════════════════════════════════════════
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return applyHeaders(NextResponse.redirect(new URL("/", req.url)), nonce);
    }

    if (pathname.startsWith("/dashboard/admin") && !token.isSuper) {
      return applyHeaders(NextResponse.rewrite(new URL("/not-found", req.url)), nonce);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. باقي الـ routes — headers بس
  // ═══════════════════════════════════════════════════════════════════════
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyHeaders(response, nonce);
}

// بنشغل الـ proxy على كل الصفحات ما عدا الـ static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};