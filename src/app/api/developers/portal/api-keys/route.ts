import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { randomBytes, createHash } from "crypto";

// ── Generate secure API key ─────────────────────────────────────────────────
function generateApiKey(): { prefix: string; fullKey: string; hash: string } {
  const prefix = "wani_live_" + randomBytes(4).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const fullKey = `${prefix}_${secret}`;
  const hash = createHash("sha256").update(fullKey).digest("hex");
  return { prefix, fullKey, hash };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET  — List API Keys
// ═══════════════════════════════════════════════════════════════════════════
export async function GET() {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const keys = await prisma.developerApiKey.findMany({
      where: { developerId: session.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (err) {
    console.error("[dev-api-keys-get]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — Generate new API Key
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { name } = await req.json();

    // Limit: max 5 active keys per developer
    const activeCount = await prisma.developerApiKey.count({
      where: { developerId: session.id, status: "ACTIVE" },
    });

    if (activeCount >= 5) {
      return NextResponse.json(
        { error: "ممكن 5 API Keys بس نشطين في نفس الوقت. احذف واحد الأول." },
        { status: 400 }
      );
    }

    const { prefix, fullKey, hash } = generateApiKey();

    await prisma.developerApiKey.create({
      data: {
        developerId: session.id,
        keyHash: hash,
        keyPrefix: prefix,
        name: name || null,
        status: "ACTIVE",
      },
    });

    // Return the full key ONLY ONCE
    return NextResponse.json({
      ok: true,
      key: {
        prefix,
        fullKey,
        name: name || null,
      },
      warning: "احفظ المفتاح ده — مش هتشوفه تاني!",
    });
  } catch (err) {
    console.error("[dev-api-keys-post]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE — Revoke API Key
// ═══════════════════════════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "API Key ID مطلوب" }, { status: 400 });
    }

    // Verify ownership
    const key = await prisma.developerApiKey.findFirst({
      where: { id: keyId, developerId: session.id },
    });

    if (!key) {
      return NextResponse.json({ error: "API Key مش موجود" }, { status: 404 });
    }

    await prisma.developerApiKey.update({
      where: { id: keyId },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dev-api-keys-delete]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}