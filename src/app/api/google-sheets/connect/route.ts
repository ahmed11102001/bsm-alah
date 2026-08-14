import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createGoogleSheetsState, googleAuthUrl } from "@/lib/google-sheets";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(new URL("/?error=unauthorized", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));

  const url = new URL(googleAuthUrl());
  url.searchParams.set("state", createGoogleSheetsState(session.user.id));
  return NextResponse.redirect(url);
}
