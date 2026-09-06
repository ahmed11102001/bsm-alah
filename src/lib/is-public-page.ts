// ─── Public marketing pages — always render LIGHT ───────────────────────────
// Dashboard dark mode must never leak outside the dashboard. These paths get
// wrapped in <ForceLight> (root layout) and light toasts (sonner).

const PUBLIC_EXACT = new Set([
  "/",
  "/ar",
  "/en",
  "/about",
  "/privacy",
  "/terms",
  "/verify-email",
  "/reset-password",
]);

const PUBLIC_PREFIXES = ["/articles", "/strategies", "/auth"];

export function isPublicPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
