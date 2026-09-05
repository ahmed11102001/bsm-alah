import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
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
        // ── نفس قواعد قسم المطورين بالمسارات الفعلية على الـ subdomain ──
        // (developers.aiwni.com بيخدم نفس الملف ده، والقواعد أعلاه ببادئة
        // /developers لا تنطبق على مساراته، فالنسخة دي بتغطيها)
        "/portal/",
        "/welcome/",
        "/signin",
        "/signup",
        "/forgot-password",
        "/reset-password",
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
