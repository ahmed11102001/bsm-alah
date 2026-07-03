import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { getProjectForOwner } from "@/lib/dev-project-auth";
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
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { email, role } = await req.json();
    if (!email || !["OWNER", "DEVELOPER"].includes(role)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    let project;
    if (role === "OWNER") {
      // الطالب لازم يكون developerId
      project = await prisma.developerProject.findFirst({
        where: { id, developerId: session.id, status: "ACTIVE" },
      });
      if (!project) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    } else {
      // الطالب لازم يكون ownerId
      project = await getProjectForOwner(id, session.id);
      if (!project) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
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

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    console.error("[project-transfer-post]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // Only owner can remove developer
    const project = await getProjectForOwner(id, session.id);
    if (!project) return NextResponse.json({ error: "غير مصرح — للمالك فقط" }, { status: 403 });

    await prisma.developerProject.update({
      where: { id },
      data: { developerRemovedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-transfer-delete]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}