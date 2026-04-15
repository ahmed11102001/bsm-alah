import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false, // تعطيل typed routes لتجنب مشاكل TypeScript
  },
};

export default nextConfig;