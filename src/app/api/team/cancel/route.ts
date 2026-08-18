// src/app/api/team/cancel/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { parseInput, TeamCancelInviteSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_MANAGE");
  if (denied) return denied;

  const ownerId = session!.user.id;
  const parsed = parseInput(TeamCancelInviteSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { invitationId } = parsed.data;

  const invitation = await prisma.teamInvitation.findFirst({
    where: {
      id: invitationId,
      inviterId: ownerId,
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "الدعوة غير موجودة" },
      { status: 404 }
    );
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json(
      { error: "لا يمكن إلغاء هذه الدعوة لأنها غير معلقة" },
      { status: 400 }
    );
  }

  await prisma.teamInvitation.update({
    where: { id: invitationId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    message: "تم إلغاء الدعوة بنجاح",
  });
}
