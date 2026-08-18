// src/app/api/team/resend/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { generateJoinCode, hashJoinCode, INVITATION_EXPIRY_HOURS } from "@/lib/team-invitations";
import { sendTeamInviteEmail } from "@/lib/email";
import { parseInput, TeamResendInviteSchema } from "@/lib/schemas";

const RESEND_COOLDOWN_SECONDS = 60; // 1 minute cooldown between resends

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_MANAGE");
  if (denied) return denied;

  const ownerId = session!.user.id;
  const parsed = parseInput(TeamResendInviteSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { invitationId } = parsed.data;

  const invitation = await prisma.teamInvitation.findFirst({
    where: {
      id: invitationId,
      inviterId: ownerId,
      status: "PENDING",
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "الدعوة غير موجودة أو تم قبولها بالفعل" },
      { status: 404 }
    );
  }

  // Rate Limiting: Check cooldown
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - invitation.lastSentAt.getTime()) / 1000);
  if (diffSeconds < RESEND_COOLDOWN_SECONDS) {
    const remainingSeconds = RESEND_COOLDOWN_SECONDS - diffSeconds;
    return NextResponse.json(
      { error: `يرجى الانتظار ${remainingSeconds} ثانية قبل إعادة إرسال الدعوة مرة أخرى` },
      { status: 429 }
    );
  }

  // Generate new code, hash it, and extend expiration
  const newJoinCode = generateJoinCode();
  const codeHash = await hashJoinCode(newJoinCode);
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  const updatedInvitation = await prisma.teamInvitation.update({
    where: { id: invitation.id },
    data: {
      codeHash,
      expiresAt,
      lastSentAt: now,
      sendCount: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      expiresAt: true,
      lastSentAt: true,
      sendCount: true,
      createdAt: true,
    },
  });

  // Send Email
  try {
    const inviter = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { name: true, brandName: true },
    });

    await sendTeamInviteEmail({
      to: invitation.email,
      name: invitation.name,
      inviterName: inviter?.name || null,
      workspaceName: inviter?.brandName || null,
      role: invitation.role,
      joinCode: newJoinCode,
      expiresHours: INVITATION_EXPIRY_HOURS,
    });
  } catch (err) {
    console.error("[TEAM_RESEND_EMAIL_ERROR]", err);
  }

  return NextResponse.json({
    success: true,
    message: "تم إعادة إرسال الدعوة بنجاح",
    invitation: updatedInvitation,
  });
}
