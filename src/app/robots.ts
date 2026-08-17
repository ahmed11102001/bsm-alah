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
