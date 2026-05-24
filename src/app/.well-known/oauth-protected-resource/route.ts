// src/app/.well-known/oauth-protected-resource/route.ts
// ── OAuth 2.0 Protected Resource Metadata ────────────────────────────────────
// بيخبر claude.ai إن /api/mcp محمي بـ OAuth من الـ authorization server بتاعنا
// RFC 9728: https://datatracker.ietf.org/doc/html/rfc9728
/// <reference types="node" />

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  const base = (process.env.NEXTAUTH_URL ?? "https://whatsprosystem.vercel.app").replace(/\/$/, "");

  return Response.json(
    {
      resource:              `${base}/api/mcp`,
      authorization_servers: [base],
    },
    { headers: CORS }
  );
}