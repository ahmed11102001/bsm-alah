import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { hasPermission, type Permission, type UserRole } from "@/lib/permissions-core";

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    `'nonce-${nonce}'`, "'strict-dynamic'", "'unsafe-inline'",
    "'sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='",
    "https://connect.facebook.net", "https://www.facebook.com",
    isDev ? "'unsafe-eval'" : "",
  ].filter(Boolean).join(" ");
  const styleSrc = ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"].filter(Boolean).join(" ");
  const connectSrc = [
    "'self'", "https://graph.facebook.com", "https://graph.instagram.com",
    "https://www.facebook.com", "https://connect.facebook.net", "https://*.cloudinary.com",
    "https://api.inngest.com", "https://api.elevenlabs.io", "https://*.upstash.io",
    "https://api.anthropic.com", "https://o4511405530284032.ingest.us.sentry.io", "wss:",
    isDev ? "http://localhost:*" : "",
  ].filter(Boolean).join(" ");
  return [
    "default-src 'self'", `script-src ${scriptSrc}`, `style-src ${styleSrc}`,
    "img-src 'self' data: https: blob:", "media-src 'self' blob:",
    "frame-src 'self' https://www.facebook.com https://connect.facebook.net",
    "font-src 'self' https://fonts.gstatic.com", `connect-src ${connectSrc}`,
    "frame-ancestors 'none'", "X-Content-Type-Options: nosniff",
  ].join("; ");
}

function nextWithNonce(req: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", buildCsp(nonce));
  return applyHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce, req);
}

function applyHeaders(response: NextResponse, nonce: string, req?: NextRequest): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req) {
    const refParam = req.nextUrl.searchParams.get("ref");
    if (refParam && !req.cookies.has("wani_ref")) {
      const cleanCode = refParam.trim().toUpperCase();
      if (cleanCode.length >= 3 && cleanCode.length <= 32) {
        response.cookies.set("wani_ref", cleanCode, {
          path: "/", maxAge: 30 * 24 * 60 * 60, httpOnly: true,
          sameSite: "lax", secure: process.env.NODE_ENV === "production",
        });
      }
    }
  }
  return response;
}

const PUBLIC_DEV_ROUTES = ["/developers", "/developers/signin", "/developers/signup", "/developers/pricing"];
function isPublicDevRoute(pathname: string): boolean {
  return PUBLIC_DEV_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

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
  usage: "USAGE_VIEW",
  "wani-partner": "WANI_PARTNER_MANAGE",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  if (pathname.startsWith("/developers")) {
    if (isPublicDevRoute(pathname)) return nextWithNonce(req, nonce);
    const devSession = await getDevSessionFromRequest(req);
    if (!devSession) {
      const url = new URL("/developers/signin", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return applyHeaders(NextResponse.redirect(url), nonce, req);
    }
    if (devSession.status === "SUSPENDED") {
      const url = new URL("/developers/signin", req.url);
      url.searchParams.set("error", "suspended");
      return applyHeaders(NextResponse.redirect(url), nonce, req);
    }
    if (devSession.status === "PENDING_META" && !pathname.startsWith("/developers/connect-meta")) {
      return applyHeaders(NextResponse.redirect(new URL("/developers/connect-meta", req.url)), nonce, req);
    }
    if (devSession.status === "ACTIVE" && pathname.startsWith("/developers/connect-meta")) {
      return applyHeaders(NextResponse.redirect(new URL("/developers/portal", req.url)), nonce, req);
    }
    return nextWithNonce(req, nonce);
  }

  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isCheckout = pathname.startsWith("/checkout");
  const isStrategies = pathname === "/strategies" || pathname.startsWith("/strategies/");

  if (isDashboard || isOnboarding || isCheckout || isStrategies) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token && (isDashboard || isStrategies)) {
      return applyHeaders(NextResponse.redirect(new URL("/", req.url)), nonce, req);
    }

    if (!token && isCheckout) {
      const url = new URL("/", req.url);
      url.searchParams.set("openLogin", "1");
      url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return applyHeaders(NextResponse.redirect(url), nonce, req);
    }

    if (token) {
      if ((isDashboard || isStrategies) && token.needsOnboarding) {
        return applyHeaders(NextResponse.redirect(new URL("/onboarding", req.url)), nonce, req);
      }
      if (isOnboarding && !token.needsOnboarding) {
        return applyHeaders(NextResponse.redirect(new URL("/dashboard", req.url)), nonce, req);
      }

      const role = token.role as UserRole | undefined;

      if (isStrategies) {
        if (!hasPermission(role, "STRATEGIES_VIEW")) {
          const fallback = hasPermission(role, "CHAT_VIEW") ? "/dashboard/chat" : "/dashboard";
          return applyHeaders(NextResponse.redirect(new URL(fallback, req.url)), nonce, req);
        }
      }

      if (isDashboard) {
        if (role === "CHAT_ONLY") {
          const allowed = pathname === "/dashboard/chat" || pathname === "/dashboard/team";
          if (!allowed) {
            return applyHeaders(NextResponse.redirect(new URL("/dashboard/chat", req.url)), nonce, req);
          }
        }

        const section = pathname.split("/")[2];
        const requiredPermission = ROUTE_PERMISSIONS[section];
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

  return nextWithNonce(req, nonce);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};