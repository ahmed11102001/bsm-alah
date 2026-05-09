import type { NextConfig } from "next";
import { validateEnv } from "./env-utils";

// التحقق من الـ env vars عند الـ build — لو في حاجة ناقصة يوقف فوراً
validateEnv();

const securityHeaders = [
  { key: "X-Frame-Options",                  value: "DENY" },
  { key: "X-Content-Type-Options",           value: "nosniff" },
  { key: "Referrer-Policy",                  value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy",       value: "same-origin" },
  { key: "Permissions-Policy",               value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
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

export default nextConfig;