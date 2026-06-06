import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

// ═══════════════════════════════════════════════════════════════════════════
// GET — List OTP Templates
// ═══════════════════════════════════════════════════════════════════════════
export async function GET() {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const templates = await prisma.developerOtpTemplate.findMany({
      where: { developerId: session.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[dev-otp-templates-get]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — Create OTP Template
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { name, language, metaTemplateId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "اسم القالب مطلوب" }, { status: 400 });
    }

    const template = await prisma.developerOtpTemplate.create({
      data: {
        developerId: session.id,
        name,
        language: language || "ar",
        metaTemplateId: metaTemplateId || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, template });
  } catch (err) {
    console.error("[dev-otp-templates-post]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}