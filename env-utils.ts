/**
 * Validate that all required environment variables are set
 * Run this on server startup
 */

const requiredEnvVars = {
  // NextAuth
  NEXTAUTH_SECRET: {
    description: "Secret key for NextAuth",
    optional: false,
  },
  NEXTAUTH_URL: {
    description: "App URL for NextAuth redirects",
    optional: false,
  },

  // Database
  DATABASE_URL: {
    description: "PostgreSQL connection string",
    optional: false,
  },

  // WhatsApp (Optional for now)
  WHATSAPP_API_KEY: {
    description: "WhatsApp API key",
    optional: true,
  },
  WHATSAPP_BUSINESS_ACCOUNT_ID: {
    description: "WhatsApp Business Account ID",
    optional: true,
  },
};

/**
 * Validate environment on startup
 */
export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  Object.entries(requiredEnvVars).forEach(([key, config]) => {
    const value = process.env[key];

    if (!value) {
      if (!config.optional) {
        missing.push(`${key}: ${config.description}`);
      } else {
        warnings.push(`${key} is not set (optional)`);
      }
    }
  });

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((m) => console.error(`   - ${m}`));
    throw new Error("Missing required environment variables");
  }

  if (warnings.length > 0 && process.env.NODE_ENV === "development") {
    console.warn("⚠️  Optional environment variables not set:");
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  console.log("✅ Environment variables validated");
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }

  return value || defaultValue || "";
}

/**
 * Check if in production
 */
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Get app URLs
 */
export function getAppUrl() {
  if (isProduction) {
    return process.env.NEXTAUTH_URL || "https://yourdomain.com";
  }
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

/**
 * Debug: Log non-sensitive env vars
 */
export function debugEnv() {
  console.log("Environment Debug Info:");
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
  console.log(`- Has DATABASE_URL: ${!!process.env.DATABASE_URL}`);
  console.log(`- Has NEXTAUTH_SECRET: ${!!process.env.NEXTAUTH_SECRET}`);
  console.log(`- Has WHATSAPP_API_KEY: ${!!process.env.WHATSAPP_API_KEY}`);
}
