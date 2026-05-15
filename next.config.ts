import type { NextConfig } from "next";
import { validateEnv } from "./env-utils";

// التحقق من الـ env vars عند الـ build — لو في حاجة ناقصة يوقف فوراً
validateEnv();

// ─── Security Headers الثابتة ─────────────────────────────────────────────────
// ملاحظة: Content-Security-Policy بيتولد في src/middleware.ts مع nonce لكل request
// الـ headers دي ثابتة وما بتحتاجش nonce
const securityHeaders = [
  { key: "X-Frame-Options",            value: "DENY" },
  { key: "X-Content-Type-Options",     value: "nosniff" },
  { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
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