/**
 * Account session helpers.
 *
 * Since V2, `wani login` uses the browser device flow — email/password never
 * touch the terminal. The stored credential is a revocable CLI access token
 * (`Authorization: Bearer`), not a password-derived cookie.
 */

/** Masked hint so users know which env var feeds OTP commands. */
export function apiKeyEnvHint(): string {
  return `Set WANI_API_KEY or pass --api-key (or save one via \`wani project use --api-key\`).`;
}
