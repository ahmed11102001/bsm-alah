import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { hasPermission, type Permission, type UserRole } from "@/lib/permissions-core";
import { resolveLocale } from "@/lib/locale-resolver";

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
    "https://www.facebook.com", "https://web.facebook.com", "https://connect.facebook.net", "https://*.cloudinary.com",
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

function nextWithNonce(req: NextRequest, nonce: string, locale: "ar" | "en" = "ar"): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-locale", locale);
  requestHeaders.set("x-dir", locale === "en" ? "ltr" : "rtl");
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  requestHeaders.set("Content-Security-Policy", buildCsp(nonce));
  return applyHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce, req, locale);
}

function applyHeaders(
  response: NextResponse,
  nonce: string,
  req?: NextRequest,
  locale?: "ar" | "en"
): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (locale) {
    const currentCookie = req?.cookies.get("NEXT_LOCALE")?.value;
    if (currentCookie !== locale) {
      response.cookies.set("NEXT_LOCALE", locale, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  if (req) {
    const refParam = req.nextUrl.searchParams.get("ref");
    if (refParam && !req.cookies.has("wani_ref")) {
      const cleanCode = refParam.trim().toUpperCase();
      if (cleanCode.length >= 3 && cleanCode.length <= 32) {
        response.cookies.set("wani_ref", cleanCode, {
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
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

// ── Developer Subdomain host detection ───────────────────────────────────────
const DEV_HOSTS = new Set([
  "developers.aiwni.com",
  "developers.localhost", // للتطوير المحلي بعد شيل البورت
]);

function getRequestHost(req: NextRequest): string {
  // x-forwarded-host بيتفضّل لو موجود (وجود أي طبقة proxy تانية قدام Vercel)،
  // وإلا نرجع لـ host العادي. في الحالتين بنشيل البورت (:3000 مثلاً) قبل المقارنة.
  const raw = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return raw.split(":")[0].toLowerCase();
}

function isDevHost(req: NextRequest): boolean {
  return DEV_HOSTS.has(getRequestHost(req));
}

const ROUTE_PERMISSIONS: Record<string, Permission> = {
  __root__: "REPORTS_VIEW",
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
  const rawPathname = req.nextUrl.pathname;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const onDevHost = isDevHost(req);

  // ── 0. جسر التوافق: /developers/* على الدومين الرئيسي → 301 دائم للـ subdomain ──
  // آمن على الـ APIs: كل APIs المطورين تحت /api/developers/... (مش /developers/...)،
  // فالشرط ده رياضيًا مستحيل يلمس أي API route أو webhook.
  if (!onDevHost && rawPathname.startsWith("/developers")) {
    const logicalPath = rawPathname.slice("/developers".length) || "/";
    return NextResponse.redirect(
      new URL(`https://developers.aiwni.com${logicalPath}${req.nextUrl.search}`),
      301
    );
  }

  // ── الـ pathname "المنطقي" اللي كل الكود التحت (من غير أي تعديل) هيشتغل عليه ──
  // على الـ subdomain: أي مسار غير /api يتحول لمساره الحقيقي تحت /developers.
  // على الدومين الرئيسي: يفضل زي ما هو (rawPathname == pathname دايمًا).
  // استثناء: ملفات الميتا الجذرية (robots.txt / sitemap.xml) بتتخدم من نفس
  // الـ route على أي هوست — ومحتواها بقى dual-host أصلًا — فبتعدي من غير prefix.
  const DEV_HOST_PASSTHROUGH = new Set(["/robots.txt", "/sitemap.xml"]);
  const pathname = (onDevHost && !rawPathname.startsWith("/api") && !DEV_HOST_PASSTHROUGH.has(rawPathname))
    ? `/developers${rawPathname === "/" ? "" : rawPathname}`
    : rawPathname;

  // ── 1. Root Landing Page auto-redirection ──
  if (pathname === "/") {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    const acceptLanguage = req.headers.get("accept-language");
    const targetLocale = resolveLocale({ cookieLocale, acceptLanguage });
    const redirectUrl = new URL(`/${targetLocale}${req.nextUrl.search}`, req.url);
    const redirectRes = NextResponse.redirect(redirectUrl);
    return applyHeaders(redirectRes, nonce, req, targetLocale);
  }

  // ── 2. Explicit /ar or /en landing routes ──
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    return nextWithNonce(req, nonce, "ar");
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return nextWithNonce(req, nonce, "en");
  }

  const currentLocale = resolveLocale({
    cookieLocale: req.cookies.get("NEXT_LOCALE")?.value,
    acceptLanguage: req.headers.get("accept-language"),
  });

  if (pathname.startsWith("/developers")) {
    // helper محلي: يبني redirect target صح حسب الهوست (subdomain-relative أو /developers/...)
    const devRedirectTarget = (logicalPath: string) =>
      new URL(onDevHost ? logicalPath : `/developers${logicalPath}`, req.url);

    // helper محلي: الـ rewrite الفعلي للـ pathname المنطقي (بس لما الفحوصات تعدي).
    // بينقل نفس request headers اللي nextWithNonce بيحطها (x-nonce/x-locale/x-dir/x-pathname)
    // عشان الـ RootLayout و MetaPixel يشتغلوا identically على الـ subdomain.
    const rewriteIfNeeded = () => {
      if (!onDevHost || rawPathname === pathname) return null;
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-nonce", nonce);
      requestHeaders.set("x-locale", currentLocale);
      requestHeaders.set("x-dir", currentLocale === "en" ? "ltr" : "rtl");
      requestHeaders.set("x-pathname", pathname);
      requestHeaders.set("Content-Security-Policy", buildCsp(nonce));
      return NextResponse.rewrite(new URL(`${pathname}${req.nextUrl.search}`, req.url), {
        request: { headers: requestHeaders },
      });
    };

    if (isPublicDevRoute(pathname)) {
      const rewritten = rewriteIfNeeded();
      return rewritten
        ? applyHeaders(rewritten, nonce, req, currentLocale)
        : nextWithNonce(req, nonce, currentLocale);
    }
    const devSession = await getDevSessionFromRequest(req);
    if (!devSession) {
      const url = devRedirectTarget("/signin");
      url.searchParams.set("callbackUrl", onDevHost ? rawPathname : pathname);
      return applyHeaders(NextResponse.redirect(url), nonce, req, currentLocale);
    }
    if (devSession.status === "SUSPENDED") {
      const url = devRedirectTarget("/signin");
      url.searchParams.set("error", "suspended");
      return applyHeaders(NextResponse.redirect(url), nonce, req, currentLocale);
    }
    if (devSession.status === "PENDING_META" && !pathname.startsWith("/developers/connect-meta")) {
      return applyHeaders(NextResponse.redirect(devRedirectTarget("/connect-meta")), nonce, req, currentLocale);
    }
    if (devSession.status === "ACTIVE" && pathname.startsWith("/developers/connect-meta")) {
      return applyHeaders(NextResponse.redirect(devRedirectTarget("/portal")), nonce, req, currentLocale);
    }
    // كل الفحوصات عدّت بنجاح — دلوقتي بس نعمل الـ rewrite الفعلي لو محتاجينه
    const rewritten = rewriteIfNeeded();
    return rewritten
      ? applyHeaders(rewritten, nonce, req, currentLocale)
      : nextWithNonce(req, nonce, currentLocale);
  }

  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isCheckout = pathname.startsWith("/checkout");

  if (isDashboard || isOnboarding || isCheckout) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token && isDashboard) {
      return applyHeaders(NextResponse.redirect(new URL(`/${currentLocale}`, req.url)), nonce, req, currentLocale);
    }

    if (!token && isCheckout) {
      const url = new URL(`/${currentLocale}`, req.url);
      url.searchParams.set("openLogin", "1");
      url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return applyHeaders(NextResponse.redirect(url), nonce, req, currentLocale);
    }

    if (token) {
      if (isDashboard && token.needsOnboarding) {
        return applyHeaders(NextResponse.redirect(new URL("/onboarding", req.url)), nonce, req, currentLocale);
      }
      if (isOnboarding && !token.needsOnboarding) {
        return applyHeaders(NextResponse.redirect(new URL("/dashboard", req.url)), nonce, req, currentLocale);
      }

      const role = token.role as UserRole | undefined;

      if (isDashboard) {
        const section = pathname.split("/")[2] || "__root__";
        const requiredPermission = ROUTE_PERMISSIONS[section];
        if (requiredPermission && !hasPermission(role, requiredPermission)) {
          const fallback = hasPermission(role, "CHAT_VIEW") ? "/dashboard/chat" : "/dashboard";
          if (pathname !== fallback) {
            return applyHeaders(NextResponse.redirect(new URL(fallback, req.url)), nonce, req, currentLocale);
          }
        }
      }
    }

    if (pathname.startsWith("/dashboard/admin") && token && !token.isSuper) {
      return applyHeaders(NextResponse.rewrite(new URL("/not-found", req.url)), nonce, req, currentLocale);
    }
  }

  return nextWithNonce(req, nonce, currentLocale);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};