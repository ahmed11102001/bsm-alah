// src/app/api/auth/join-team/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { parseInput, JoinTeamSchema } from "@/lib/schemas";
import { verifyJoinCode } from "@/lib/team-invitations";
import { notifyTeamMemberJoined } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    // 1. Rate limiting on join attempts (10 attempts per 15 minutes per IP)
    const ip = getIP(req);
    const rl = await rateLimit(`join-team:${ip}`, { limit: 10, windowSecs: 900 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "محاولات كثيرة خاطئة، يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = parseInput(JoinTeamSchema, body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, inviteCode, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = inviteCode.trim().toUpperCase();

    // 2. Search for valid PENDING invitation for this email
    const invitation = await prisma.teamInvitation.findFirst({
      where: {
        email: normalizedEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      // Check if there was an expired or cancelled invitation for better log
      const anyInv = await prisma.teamInvitation.findFirst({
        where: { email: normalizedEmail },
        orderBy: { createdAt: "desc" },
      });

      if (anyInv && anyInv.status === "CANCELLED") {
        return NextResponse.json(
          { error: "تم إلغاء هذه الدعوة من قبل مدير الفريق" },
          { status: 400 }
        );
      }
      if (anyInv && (anyInv.status === "EXPIRED" || anyInv.expiresAt < new Date())) {
        return NextResponse.json(
          { error: "انتهت صلاحية كود الانضمام. يرجى طلب إعادة إرسال الدعوة من مدير الفريق." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "كود الانضمام أو البريد الإلكتروني غير صحيح، أو تم استخدام الدعوة مسبقاً" },
        { status: 404 }
      );
    }

    // 3. Verify Join Code Hash
    const isCodeValid = await verifyJoinCode(normalizedCode, invitation.codeHash);
    if (!isCodeValid) {
      return NextResponse.json(
        { error: "كود الانضمام أو البريد الإلكتروني غير صحيح" },
        { status: 400 }
      );
    }

    // 4. Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const memberName = invitation.name || name?.trim() || normalizedEmail.split("@")[0];

    // 5. Transaction: Create or Link User, Update Invitation, and Notify Owner
    let joinedUserId: string;

    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        // User already exists, link them to the team
        if (existingUser.parentId === invitation.inviterId && !existingUser.deletedAt) {
          throw new Error("ALREADY_ACTIVE_MEMBER");
        }

        const updated = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            parentId: invitation.inviterId,
            role: invitation.role,
            deletedAt: null,
            password: hashedPassword,
            name: existingUser.name || memberName,
          },
        });
        joinedUserId = updated.id;
      } else {
        // Create new team member user
        const created = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: memberName,
            password: hashedPassword,
            role: invitation.role,
            parentId: invitation.inviterId,
            emailVerified: new Date(),
            onboardingCompleted: true,
          },
        });
        joinedUserId = created.id;
      }

      // Mark invitation as ACCEPTED
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
    });

    // 6. Notify Owner
    try {
      await notifyTeamMemberJoined(
        invitation.inviterId,
        memberName,
        normalizedEmail
      );
    } catch (notifErr) {
      console.error("[NOTIFY_OWNER_ERROR]", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "🎉 تم الانضمام إلى الفريق بنجاح! أهلاً بك في فريق Wani.",
    });

  } catch (error: any) {
    if (error?.message === "ALREADY_ACTIVE_MEMBER") {
      return NextResponse.json(
        { error: "أنت عضو مفعّل بالفعل في هذا الفريق" },
        { status: 400 }
      );
    }

    console.error("JOIN_TEAM_ERROR:", error);
    return NextResponse.json(
      { error: "فشل تفعيل الحساب والانضمام، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}