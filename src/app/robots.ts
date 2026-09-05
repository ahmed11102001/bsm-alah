import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { DEVELOPERS_BASE_URL, isDevHostname } from "@/lib/dev-links";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  // ── Developer subdomain: SEO مستقل تمامًا ──
  // developers.aiwni.com/robots.txt → قواعد بمساراته الفعلية + sitemap الخاص به
  if (isDevHostname(host)) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/portal/",
          "/welcome/",
          "/signin",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
      },
      sitemap: `${DEVELOPERS_BASE_URL}/sitemap.xml`,
    };
  }

  // ── Main domain ──
  // aiwni.com/robots.txt → sitemap الدومين الرئيسي فقط (من غير أي مسار developers)
  const baseUrl = "https://aiwni.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/auth/",
        "/authorize/",
        "/checkout/",
        "/demo/",
        "/developers/portal/",
        "/developers/welcome/",
        "/developers/signin",
        "/developers/signup",
        "/developers/forgot-password",
        "/developers/reset-password",
        "/onboarding/",
        "/payment/",
        "/reset-password/",
        "/sentry-example-page/",
        "/t/",
        "/verify-email/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
