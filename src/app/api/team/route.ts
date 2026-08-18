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

  const ownerId = session!.user.parentId ?? session!.user.id;
  const role = session!.user.role;
  const isChatOnly = role === "CHAT_ONLY";
  const canViewAllDetails = role === "OWNER" || role === "FULL_ACCESS";

  // Auto-expire old pending invitations. Only the workspace owner manages them.
  if (role === "OWNER") {
    await prisma.teamInvitation.updateMany({
      where: {
        inviterId: ownerId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
  }

  const members = await prisma.user.findMany({
    where: { parentId: ownerId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const memberIds = members.map((member) => member.id);
  const shouldLoadStats = canViewAllDetails || isChatOnly;

  const [assignedCounts, replyCounts, invitations] = await Promise.all([
    shouldLoadStats && memberIds.length > 0
      ? prisma.contact.groupBy({
          by: ["assignedToUserId"],
          where: {
            userId: ownerId,
            assignedToUserId: { in: memberIds },
            deletedAt: null,
            isArchived: false,
          },
          _count: { id: true },
        })
      : Promise.resolve([]),
    shouldLoadStats && memberIds.length > 0
      ? prisma.message.groupBy({
          by: ["userId"],
          where: {
            userId: { in: memberIds },
            direction: "outbound",
            senderType: "human",
            deletedAt: null,
          },
          _count: { id: true },
        })
      : Promise.resolve([]),
    role === "OWNER"
      ? prisma.teamInvitation.findMany({
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
        })
      : Promise.resolve([]),
  ]);

  const assignedMap = new Map(
    assignedCounts.map((row) => [row.assignedToUserId, row._count.id])
  );
  const repliesMap = new Map(
    replyCounts.map((row) => [row.userId, row._count.id])
  );

  const responseMembers = members.map((member) => {
    const isSelf = member.id === session!.user.id;

    // CHAT_ONLY gets details for its own card only.
    if (isChatOnly) {
      return {
        ...member,
        ...(isSelf
          ? {
              conversationCount: assignedMap.get(member.id) ?? 0,
              repliesCount: repliesMap.get(member.id) ?? 0,
            }
          : {}),
        createdAt: isSelf ? member.createdAt : undefined,
      };
    }

    // OWNER/FULL_ACCESS can inspect the operational details of every team member.
    return {
      ...member,
      ...(canViewAllDetails
        ? {
            conversationCount: assignedMap.get(member.id) ?? 0,
            repliesCount: repliesMap.get(member.id) ?? 0,
          }
        : {}),
    };
  });

  return NextResponse.json({
    members: responseMembers,
    invitations,
  });
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
