import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";

export async function GET(req: Request) {
  try {
    const session = await getDevSessionFromRequest(req as any);
    if (!session) {
      return devError("Unauthorized", "AUTH_REQUIRED", 401);
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
      return devError("Not found", "NOT_FOUND", 404);
    }

    const { isOwnerOnlyAccount } = await import("@/lib/dev-role");
    const isOwnerOnly = await isOwnerOnlyAccount(session.id);

    return NextResponse.json({ developer, isOwnerOnly });
  } catch (error) {
    return devError("Server error", "INTERNAL", 500);
  }
}
