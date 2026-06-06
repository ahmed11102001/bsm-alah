import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { accessToken, phoneNumberId, wabaId, displayPhone } = await req.json();

    // Validation
    if (!accessToken || !phoneNumberId || !wabaId) {
      return NextResponse.json(
        { error: "Access Token, Phone Number ID, و WABA ID مطلوبين" },
        { status: 400 }
      );
    }

    // Rate limit
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`dev-meta-connect:${ip}`, {
      limit: 10,
      windowSecs: 3600,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "كثير من المحاولات، حاول بعد شوية" },
        { status: 429 }
      );
    }

    // Verify token with Meta (optional but recommended)
    // For now, we trust the user and store it
    // TODO: Add Meta token verification call

    // Upsert connection
    await prisma.developerMetaConnection.upsert({
      where: { developerId: session.id },
      update: {
        accessToken,
        phoneNumberId,
        wabaId,
        displayPhone: displayPhone || null,
        isVerified: false,
        updatedAt: new Date(),
      },
      create: {
        developerId: session.id,
        accessToken,
        phoneNumberId,
        wabaId,
        displayPhone: displayPhone || null,
        isVerified: false,
      },
    });

    // Update developer status to ACTIVE
    await prisma.developerUser.update({
      where: { id: session.id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dev-meta-connect]", err);
    return NextResponse.json(
      { error: "حصل خطأ، حاول تاني" },
      { status: 500 }
    );
  }
}