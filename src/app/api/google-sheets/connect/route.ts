import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createGoogleSheetsState, googleAuthUrl } from "@/lib/google-sheets";
import { hasPermission } from "@/lib/permissions";
import { requireGoogleSheetsAccess } from "@/lib/google-sheets-access";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !hasPermission(session.user.role, "CONTACTS_MANAGE"))
    return NextResponse.redirect(new URL("/?error=unauthorized", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));

  const denied = await requireGoogleSheetsAccess(session.user.id);
  if (denied) {
    const url = new URL("/dashboard/contacts", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
    url.searchParams.set("googleSheetsError", "feature_locked");
    return NextResponse.redirect(url);
  }

  const url = new URL(googleAuthUrl());
  url.searchParams.set("state", createGoogleSheetsState(session.user.id));
  return NextResponse.redirect(url);
}
