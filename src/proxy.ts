import { getToken }                from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { hasPermission, type Permission, type UserRole } from "@/lib/permissions-core";

// ─── buildCsp: ينشئ CSP header مع nonce لكل request ─────────────────────────
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = [
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'unsafe-inline'", // Fallback for older browsers, ignored by modern browsers when nonce/strict-dynamic is present
    "'sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='", // Allow Facebook SDK inline script
    "https://connect.facebook.net",
    "https://www.facebook.com",
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
    "https://www.facebook.com",
    "https://connect.facebook.net",
    // Cloudinary
    "https://*.cloudinary.com",
    // Inngest
    "https://api.inngest.com",
    // ElevenLabs
    "https://api.elevenlabs.io",
    // Upstash Redis
    "https://*.upstash.io",
    // Anthropic (Quick Start AI)
    "https://api.anthropic.com",
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
    "frame-src 'self' https://www.facebook.com https://connect.facebook.net",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "X-Content-Type-Options: nosniff",
  ].join("; ");
}

// ─── Helper: forward request with nonce for Next.js inline scripts ───────────
function nextWithNonce(req: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", buildCsp(nonce));
  
  return applyHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
    req
  );
}

// ─── Helper: apply security headers & referral cookie ────────────────────────
function applyHeaders(response: NextResponse, nonce: string, req?: NextRequest): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // First-touch referral cookie attribution (30 days)
  if (req) {
    const refParam = req.nextUrl.searchParams.get("ref");
    if (refParam && !req.cookies.has("wani_ref")) {
      const cleanCode = refParam.trim().toUpperCase();
      if (cleanCode.length >= 3 && cleanCode.length <= 32) {
        response.cookies.set("wani_ref", cleanCode, {
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }
  }

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

// ─── Route ↔ Permission map (مطابق لـ SIDEBAR_IDS في dashboard/_shared.tsx) ──
// أي role (خصوصًا CHAT_ONLY) مالوش الصلاحية دي، ميقدرش يدخل الـ route حتى لو
// كتب الـ URL يدويًا — مش بس إخفاء الرابط من الـ Sidebar.
const ROUTE_PERMISSIONS: Record<string, Permission> = {
  chat: "CHAT_VIEW",
  contacts: "CONTACTS_VIEW",
  campaigns: "CAMPAIGNS_VIEW",
  templates: "TEMPLATES_VIEW",
  automation: "AUTOMATION_VIEW",
  store: "STORE_INTEGRATIONS_MANAGE",
  reports: "REPORTS_VIEW",
  team: "TEAM_VIEW",
  api: "API_KEYS_MANAGE",
};

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
      return nextWithNonce(req, nonce);
    }

    // تحقق من الـ dev session
    const devSession = await getDevSessionFromRequest(req);

    // مفيش session → signin
    if (!devSession) {
      const url = new URL("/developers/signin", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return applyHeaders(NextResponse.redirect(url), nonce, req);
    }

    // SUSPENDED → منع الدخول
    if (devSession.status === "SUSPENDED") {
      const url = new URL("/developers/signin", req.url);
      url.searchParams.set("error", "suspended");
      return applyHeaders(NextResponse.redirect(url), nonce, req);
    }

    // PENDING_META → يروح يربط Meta أول
    if (
      devSession.status === "PENDING_META" &&
      !pathname.startsWith("/developers/connect-meta")
    ) {
      return applyHeaders(
        NextResponse.redirect(new URL("/developers/connect-meta", req.url)),
        nonce,
        req
      );
    }

    // ACTIVE → منع رجوعه لـ connect-meta
    if (
      devSession.status === "ACTIVE" &&
      pathname.startsWith("/developers/connect-meta")
    ) {
      return applyHeaders(
        NextResponse.redirect(new URL("/developers/portal", req.url)),
        nonce,
        req
      );
    }

    // مصادق عليه → كمّل
    return nextWithNonce(req, nonce);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. MARKETING ROUTES — NextAuth (اللي كان موجود، ما اتغيرش)
  // ═══════════════════════════════════════════════════════════════════════
  const isDashboard  = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isCheckout   = pathname.startsWith("/checkout");

  if (isDashboard || isOnboarding || isCheckout) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token && isDashboard) {
      return applyHeaders(NextResponse.redirect(new URL("/", req.url)), nonce, req);
    }

    if (!token && isCheckout) {
      const url = new URL("/", req.url);
      url.searchParams.set("openLogin", "1");
      url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return applyHeaders(NextResponse.redirect(url), nonce, req);
    }

    if (token) {
      if (isDashboard && token.needsOnboarding) {
        return applyHeaders(NextResponse.redirect(new URL("/onboarding", req.url)), nonce, req);
      }
      if (isOnboarding && !token.needsOnboarding) {
        return applyHeaders(NextResponse.redirect(new URL("/dashboard", req.url)), nonce, req);
      }

      // ── Role/Permission guard جوه /dashboard/{section} ──────────────────
      // مثلاً CHAT_ONLY مايقدرش يدخل /dashboard/campaigns حتى لو كتب الرابط
      // يدويًا — بيترد لمساحته الطبيعية (الشات) بدل ما ياخد 404/500.
      if (isDashboard) {
        const section = pathname.split("/")[2]; // "/dashboard/campaigns" → "campaigns"
        const requiredPermission = ROUTE_PERMISSIONS[section];
        const role = token.role as UserRole | undefined;

        if (requiredPermission && !hasPermission(role, requiredPermission)) {
          const fallback = hasPermission(role, "CHAT_VIEW") ? "/dashboard/chat" : "/dashboard";
          if (pathname !== fallback) {
            return applyHeaders(NextResponse.redirect(new URL(fallback, req.url)), nonce, req);
          }
        }
      }
    }

    if (pathname.startsWith("/dashboard/admin") && token && !token.isSuper) {
      return applyHeaders(NextResponse.rewrite(new URL("/not-found", req.url)), nonce, req);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. باقي الـ routes — headers بس
  // ═══════════════════════════════════════════════════════════════════════
  return nextWithNonce(req, nonce);
}

// بنشغل الـ proxy على كل الصفحات ما عدا الـ static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
