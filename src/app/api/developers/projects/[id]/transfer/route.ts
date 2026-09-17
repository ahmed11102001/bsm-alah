import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { getProjectForOwner } from "@/lib/dev-project-auth";
import { sendProjectTransferInviteEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/locale-resolver";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

// Generate a secure 8-character code, excluding ambiguous characters (0, O, 1, I)
function generateSecureCode() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < bytes.length; i++) {
    code += charset[bytes[i] % charset.length];
  }
  return code;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const { email, role } = await req.json();
    if (!email || !["OWNER", "DEVELOPER"].includes(role)) {
      return devError("بيانات غير صالحة", "INVALID_REQUEST", 400);
    }

    let project: { id: string; name: string; ownerId?: string | null; developerRemovedAt?: Date | null } | null;
    if (role === "OWNER") {
      // الطالب لازم يكون developerId
      project = await prisma.developerProject.findFirst({
        where: { id, developerId: session.id, status: "ACTIVE" },
        select: { id: true, name: true, ownerId: true },
      });
      if (!project) return devError("غير مصرح", "FORBIDDEN", 403);

      if (project.ownerId) {
        return devError(
          "المشروع عنده مالك بالفعل — لازم يشيل نفسه أو تتواصل مع الدعم قبل تعيين مالك جديد",
          "CONFLICT",
          409
        );
      }
    } else {
      // الطالب لازم يكون ownerId
      const ownerProject = await getProjectForOwner(id, session.id);
      if (!ownerProject) return devError("غير مصرح", "FORBIDDEN", 403);

      if (ownerProject.developerRemovedAt === null) {
        return devError(
          "المشروع عنده مطور نشط بالفعل — لازم تشيله الأول قبل ما تدعو مطور جديد",
          "CONFLICT",
          409
        );
      }
      project = { id: ownerProject.id, name: ownerProject.name, developerRemovedAt: ownerProject.developerRemovedAt };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Revoke previous pending invites for the same role
    await prisma.developerProjectInvite.updateMany({
      where: { projectId: id, role, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const code = generateSecureCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.developerProjectInvite.create({
      data: {
        projectId: id,
        email: normalizedEmail,
        codeHash,
        role,
        createdById: session.id,
        expiresAt,
        status: "PENDING",
      },
    });

    // إرسال الكود تلقائيًا على الإيميل المدخل — بدل النسخ اليدوي
    const locale = getRequestLocale(req);
    try {
      await sendProjectTransferInviteEmail({
        to: normalizedEmail,
        projectName: project.name,
        inviteCode: code,
        role,
        locale,
      });
    } catch (emailErr) {
      console.error("[project-transfer-email-error]", emailErr);
      return devError("تم إنشاء الدعوة لكن فشل إرسال الإيميل — تأكد من الإيميل وحاول مرة تانية", "EMAIL_FAILED", 502);
    }

    // لا نرجع الكود في الرد لأسباب أمنية — الكود وصل للإيميل فقط
    return NextResponse.json({ ok: true, emailed: true, email: normalizedEmail });
  } catch (err) {
    console.error("[project-transfer-post]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    // Only owner can remove developer
    const project = await getProjectForOwner(id, session.id);
    if (!project) return devError("غير مصرح — للمالك فقط", "FORBIDDEN", 403);

    await prisma.developerProject.update({
      where: { id },
      data: { developerRemovedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-transfer-delete]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}