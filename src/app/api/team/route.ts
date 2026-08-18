// src/app/api/team/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkTeamLimit, guardResponse } from "@/lib/plan-guard";
import { TeamInviteSchema, parseInput } from "@/lib/schemas";
import { requirePermission } from "@/lib/permissions";
import { generateJoinCode, hashJoinCode, INVITATION_EXPIRY_HOURS } from "@/lib/team-invitations";
import { sendTeamInviteEmail } from "@/lib/email";

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_VIEW");
  if (denied) return denied;

  // Team members always operate inside their owner's workspace.
  // For CHAT_ONLY, parentId is the workspace owner; for OWNER it is null.
  const ownerId = session!.user.parentId ?? session!.user.id;
  const isChatOnly = session!.user.role === "CHAT_ONLY";

  // Auto-expire old pending invitations
  await prisma.teamInvitation.updateMany({
    where: {
      inviterId: ownerId,
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const [members, invitations, selfStats] = await Promise.all([
    prisma.user.findMany({
      where: { parentId: ownerId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        // For CHAT_ONLY, the join date is only returned for the current user.
        // Other members still appear in the list, but their private card details
        // are not exposed by this endpoint.
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    isChatOnly
      ? Promise.resolve([])
      : prisma.teamInvitation.findMany({
          where: {
            inviterId: ownerId,
            status: "PENDING",
            expiresAt: { gt: new Date() },
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
          orderBy: { createdAt: "desc" },
        }),
    isChatOnly
      ? Promise.all([
          prisma.contact.count({
            where: {
              userId: ownerId,
              assignedToUserId: session!.user.id,
              deletedAt: null,
              isArchived: false,
              messages: { some: { deletedAt: null } },
            },
          }),
          prisma.message.count({
            where: {
              userId: session!.user.id,
              direction: "outbound",
              senderType: "human",
              deletedAt: null,
            },
          }),
        ]).then(([conversationCount, repliesCount]) => ({ conversationCount, repliesCount }))
      : Promise.resolve(null),
  ]);

  const responseMembers = members.map((member) => {
    const isSelf = member.id === session!.user.id;

    if (isChatOnly) {
      return {
        ...member,
        // Only the current CHAT_ONLY member receives private card details.
        createdAt: isSelf ? member.createdAt : undefined,
        ...(isSelf && selfStats ? selfStats : {}),
      };
    }

    return member;
  });

  return NextResponse.json({ members: responseMembers, invitations, selfStats });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_MANAGE");
  if (denied) return denied;

  const ownerId = session!.user.id;

  const check = await checkTeamLimit(ownerId);
  const block = guardResponse(check);
  if (block) return block;

  const parsed = parseInput(TeamInviteSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { email, name, role } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if email is already the owner or an active team member
  if (normalizedEmail === session!.user.email?.toLowerCase().trim()) {
    return NextResponse.json({ error: "لا يمكنك دعوة نفسك كعضو فريق" }, { status: 400 });
  }

  const existingMember = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      parentId: ownerId,
      deletedAt: null,
    },
  });

  if (existingMember) {
    return NextResponse.json({ error: "هذا البريد عضو بالفعل في الفريق" }, { status: 400 });
  }

  // 2. Check if there is already an active pending invitation for this email
  const existingPending = await prisma.teamInvitation.findFirst({
    where: {
      inviterId: ownerId,
      email: normalizedEmail,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingPending) {
    return NextResponse.json(
      { error: "توجد دعوة معلقة بالفعل لهذا البريد الإلكتروني. يمكنك إعادة إرسالها من قسم الدعوات المعلقة." },
      { status: 400 }
    );
  }

  // 3. Generate secure join code and hash it
  const joinCode = generateJoinCode();
  const codeHash = await hashJoinCode(joinCode);
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  // 4. Create new TeamInvitation
  const invitation = await prisma.teamInvitation.create({
    data: {
      inviterId: ownerId,
      email: normalizedEmail,
      name: name?.trim() || null,
      role,
      codeHash,
      expiresAt,
      status: "PENDING",
      lastSentAt: new Date(),
      sendCount: 1,
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

  // 5. Send invitation email
  try {
    const inviter = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { name: true, brandName: true },
    });

    await sendTeamInviteEmail({
      to: normalizedEmail,
      name: name?.trim() || null,
      inviterName: inviter?.name || null,
      workspaceName: inviter?.brandName || null,
      role,
      joinCode,
      expiresHours: INVITATION_EXPIRY_HOURS,
    });
  } catch (emailErr) {
    console.error("[TEAM_INVITE_EMAIL_ERROR]", emailErr);
    // Even if email fails, invitation record was created, but we inform the user if appropriate
  }

  return NextResponse.json({
    success: true,
    message: "تم إرسال دعوة الانضمام بنجاح",
    invitation,
  });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "TEAM_MANAGE");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("id");
  const invitationId = searchParams.get("invitationId");

  // ── Cancel Invitation ──
  if (invitationId) {
    const invitation = await prisma.teamInvitation.findFirst({
      where: { id: invitationId, inviterId: session!.user.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: "الدعوة غير موجودة" }, { status: 404 });
    }

    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "تم إلغاء الدعوة بنجاح" });
  }

  // ── Delete Team Member ──
  if (!memberId) {
    return NextResponse.json({ error: "id أو invitationId مطلوب" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { id: memberId, parentId: session!.user.id },
  });

  if (!member) {
    return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    }),
    prisma.contact.updateMany({
      where: { assignedToUserId: memberId },
      data: { assignedToUserId: null },
    }),
  ]);

  return NextResponse.json({ success: true, message: "تم حذف العضو بنجاح" });
}
