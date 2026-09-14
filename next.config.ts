import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { validateEnv } from "./env-utils";

// التحقق من الـ env vars عند الـ build — لو في حاجة ناقصة يوقف فوراً
validateEnv();

// ─── Security Headers الثابتة ─────────────────────────────────────────────────
// ملاحظة: Content-Security-Policy بيتولد في src/proxy.ts (middleware) مع nonce
// لكل request. الهيدرز اللي بتتكرر هناك بالظبط (X-Content-Type-Options,
// X-Frame-Options, Referrer-Policy, Permissions-Policy) اتشالت من هنا —
// كان بيحصل تعريف مزدوج لنفس اسم الهيدر من طبقتين مختلفتين (next.config +
// middleware) في نفس الوقت، وده كان بيسبب دمج/تلف فعلي في شكل الـheader
// اللي بيوصل للمتصفح (لاحظنا الخطأ: المتصفح بيحاول يقرأ 'X-Content-Type-
// Options:' كأنه جزء من قيمة Content-Security-Policy نفسها). سايبين هنا بس
// اللي مش موجود في middleware أصلاً.
const securityHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  typedRoutes: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // تقليل حجم الـ bundle — تجاهل source maps في production
  productionBrowserSourceMaps: false,

  // ضغط الصور تلقائياً
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "aiwhatspro",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});