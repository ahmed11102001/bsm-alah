import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { rateLimit } from "@/lib/rate-limit";

// ── POST — ربط Meta بمشروع معين ──────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // Verify project ownership
    const project = await prisma.developerProject.findFirst({
      where: { id, developerId: session.id, status: "ACTIVE" },
    });
    if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

    const { accessToken, phoneNumberId, wabaId, displayPhone } = await req.json();

    if (!accessToken || !phoneNumberId || !wabaId) {
      return NextResponse.json(
        { error: "Access Token, Phone Number ID, و WABA ID مطلوبين" },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`dev-meta-connect:${ip}`, { limit: 10, windowSecs: 3600 });
    if (!rl.success) {
      return NextResponse.json({ error: "كثير من المحاولات، حاول بعد شوية" }, { status: 429 });
    }

    // Upsert connection scoped to this project
    await prisma.developerMetaConnection.upsert({
      where: { projectId: id },
      update: {
        accessToken,
        phoneNumberId,
        wabaId,
        displayPhone: displayPhone || "",
        isVerified: false,
        updatedAt: new Date(),
      },
      create: {
        projectId: id,
        accessToken,
        phoneNumberId,
        wabaId,
        displayPhone: displayPhone || "",
        isVerified: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-meta-connect]", err);
    return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}

// ── DELETE — إلغاء ربط Meta من مشروع ────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const project = await prisma.developerProject.findFirst({
      where: { id, developerId: session.id },
    });
    if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

    await prisma.developerMetaConnection.deleteMany({
      where: { projectId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-meta-disconnect]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}