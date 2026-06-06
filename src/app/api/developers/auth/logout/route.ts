import { NextResponse } from "next/server";
import { buildDevLogoutCookie } from "@/lib/dev-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildDevLogoutCookie());
  return res;
}
