import { getToken } from "next-auth/jwt";
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
    `'nonce-${nonce}'`,
    "https://fonts.googleapis.com",
    isDev ? "'unsafe-inline'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const connectSrc = [
    "'self'",
    "https://graph.facebook.com",
    "https://graph.instagram.com",
    "https://*.cloudinary.com",
    "https://api.resend.com",
    "https://api.inngest.com",
    "https://api.elevenlabs.io",
    "https://*.upstash.io",
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

// ─── Public developer routes (no auth needed) ────────────────────────────────
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
// MAIN MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Step 0: توليد nonce عشوائي لكل request ─────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // ═════════════════════════════════════════════════════════════════════════
  // 1. DEVELOPER ROUTES (/developers/*) — JWT Auth (مستقل عن NextAuth)
  // ═════════════════════════════════════════════════════════════════════════
  if (pathname.startsWith("/developers")) {
    // Public dev routes — allow through
    if (isPublicDevRoute(pathname)) {
      return applySecurityHeaders(NextResponse.next(), nonce);
    }

    // Check developer session (JWT + Cookie)
    const devSession = await getDevSessionFromRequest(req);

    // No session → redirect to signin
    if (!devSession) {
      const signinUrl = new URL("/developers/signin", req.url);
      signinUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(signinUrl), nonce);
    }

    // PENDING_META → force connect-meta page
    if (
      devSession.status === "PENDING_META" &&
      !pathname.startsWith("/developers/connect-meta")
    ) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/developers/connect-meta", req.url)),
        nonce
      );
    }

    // ACTIVE/TRANSFERRED → block connect-meta, allow portal
    if (
      devSession.status === "ACTIVE" &&
      pathname.startsWith("/developers/connect-meta")
    ) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/developers/portal", req.url)),
        nonce
      );
    }

    // SUSPENDED → block everything
    if (devSession.status === "SUSPENDED") {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/developers/signin?error=suspended", req.url)),
        nonce
      );
    }

    // Developer authenticated — apply security headers and continue
    return applySecurityHeaders(NextResponse.next(), nonce);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. MARKETING ROUTES — NextAuth (اللي كان موجود)
  // ═════════════════════════════════════════════════════════════════════════

  // ── Dashboard Auth ────────────────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // مش مسجل دخول → وجّهه لصفحة الـ Login
    if (!token) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/", req.url)),
        nonce
      );
    }

    // حماية صفحة Admin — غير Super يشوف 404
    if (pathname.startsWith("/dashboard/admin") && !token.isSuper) {
      return applySecurityHeaders(
        NextResponse.rewrite(new URL("/not-found", req.url)),
        nonce
      );
    }
  }

  // ── Apply security headers to all other routes ────────────────────────────
  return applySecurityHeaders(NextResponse.next(), nonce);
}

// ─── Helper: apply CSP + security headers ────────────────────────────────────
function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return response;
}

// بنشغل الـ middleware على كل الصفحات ما عدا الـ static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
