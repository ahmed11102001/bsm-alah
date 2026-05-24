// src/app/.well-known/oauth-authorization-server/route.ts
// ── OAuth 2.0 Authorization Server Metadata ──────────────────────────────────
// مطلوب لـ claude.ai web MCP connector — بيكتشف endpoints التوثيق من هنا
// RFC 8414: https://datatracker.ietf.org/doc/html/rfc8414
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
      issuer:                                base,
      authorization_endpoint:                `${base}/authorize`,
      token_endpoint:                        `${base}/api/mcp/token`,
      response_types_supported:              ["code"],
      grant_types_supported:                 ["authorization_code"],
      code_challenge_methods_supported:      ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    },
    { headers: CORS }
  );
}