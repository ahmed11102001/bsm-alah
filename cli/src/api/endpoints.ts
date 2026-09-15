/**
 * Public Developer API paths used by the CLI (V1).
 * Only endpoints that exist in the current public contract.
 */
export const ENDPOINTS = {
  authMe: "/api/developers/auth/me",
  cliDeviceCode: "/api/developers/cli/device/code",
  cliDeviceToken: "/api/developers/cli/device/token",
  cliRevokeCurrent: "/api/developers/cli/sessions/revoke-current",
  cliCodegen: "/api/developers/cli/codegen",
  projects: "/api/developers/projects",
  otpTemplates: (projectId: string): string => `/api/developers/projects/${encodeURIComponent(projectId)}/otp-templates`,
  otpSend: "/api/developers/otp/send",
  otpVerify: "/api/developers/otp/verify",
  otpStatus: (token: string): string => `/api/developers/otp/status/${encodeURIComponent(token)}`,
} as const;
