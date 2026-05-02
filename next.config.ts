import type { NextConfig } from "next";
import { validateEnv } from "./env-utils";

// التحقق من الـ env vars عند الـ build — لو في حاجة ناقصة يوقف فوراً
validateEnv();

const nextConfig: NextConfig = {
  typedRoutes: false,
};

export default nextConfig;