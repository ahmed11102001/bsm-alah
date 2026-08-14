import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  exchangeGoogleCode,
  verifyGoogleSheetsState,
} from "@/lib/google-sheets";
import { encryptToken } from "@/lib/crypto";

const contactsUrl = () => `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/contacts`;

export async function GET(req: NextRequest) {
  const redirectWithError = (code: string) => NextResponse.redirect(`${contactsUrl()}?googleSheetsError=${encodeURIComponent(code)}`);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return redirectWithError("unauthorized");

  const params = new URL(req.url).searchParams;
  if (params.get("error")) return redirectWithError(params.get("error") === "access_denied" ? "access_denied" : "oauth_cancelled");

  const code = params.get("code");
  const state = params.get("state");
  const verified = state ? verifyGoogleSheetsState(state) : null;
  if (!code || !verified || verified.userId !== session.user.id) return redirectWithError("invalid_state");

  try {
    const tokens = await exchangeGoogleCode(code);
    const existing = await prisma.googleSheetsConnection.findFirst({
      where: { userId: session.user.id, audienceId: null },
      orderBy: { createdAt: "desc" },
    });
    if (!tokens.access_token || (!tokens.refresh_token && !existing?.refreshToken)) return redirectWithError("missing_refresh_token");
    const data = {
      accessToken: encryptToken(tokens.access_token),
      refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing?.refreshToken ?? null,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    };
    const connection = existing
      ? await prisma.googleSheetsConnection.update({ where: { id: existing.id }, data })
      : await prisma.googleSheetsConnection.create({ data: { userId: session.user.id, ...data } });

    return NextResponse.redirect(`${contactsUrl()}?googleSheets=connected&connectionId=${encodeURIComponent(connection.id)}`);
  } catch (error) {
    console.error("[GoogleSheets] OAuth callback failed", error);
    return redirectWithError("oauth_failed");
  }
}
