import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

export async function GET(req: Request) {
  try {
    const session = await getDevSessionFromRequest(req as any);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const developer = await prisma.developerUser.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    if (!developer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ developer });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
