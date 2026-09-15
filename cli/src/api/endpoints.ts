/**
 * Public Developer API paths used by the CLI (V1).
 * Only endpoints that exist in the current public contract.
 */
export const ENDPOINTS = {
  authLogin: "/api/developers/auth/login",
  authMe: "/api/developers/auth/me",
  projects: "/api/developers/projects",
  otpSend: "/api/developers/otp/send",
  otpVerify: "/api/developers/otp/verify",
  otpStatus: (token: string): string => `/api/developers/otp/status/${encodeURIComponent(token)}`,
} as const;
