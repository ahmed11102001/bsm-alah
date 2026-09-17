/** Shared NextAuth cookie names — safe to import from middleware/edge. */
export function getNextAuthSessionCookieName(): string {
  const useSecure = (process.env.NEXTAUTH_URL || "").startsWith("https://");
  return `${useSecure ? "__Secure-" : ""}next-auth.session-token`;
}
