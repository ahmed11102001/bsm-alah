import { NextRequest, NextResponse } from "next/server";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ id: session.id, email: session.email, name: session.name });
}
