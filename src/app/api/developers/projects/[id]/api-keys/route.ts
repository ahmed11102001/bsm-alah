import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { randomBytes, createHash } from "crypto";

function generateApiKey(): { prefix: string; fullKey: string; hash: string } {
  const prefix = "wani_live_" + randomBytes(4).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const fullKey = `${prefix}_${secret}`;
  const hash = createHash("sha256").update(fullKey).digest("hex");
  return { prefix, fullKey, hash };
}

import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";

// ── helper: verify project ownership ─────────────────────────────────────────
async function getProjectOrFail(userId: string, projectId: string) {
  return getProjectForOwnerOrDeveloper(projectId, userId);
}

// ── GET — list API keys for project ──────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const project = await getProjectOrFail(session.id, id);
    if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

    const keys = await prisma.developerApiKey.findMany({
      where: { projectId: id },
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
    console.error("[project-api-keys-get]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

// ── POST — generate new API key for project ───────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const project = await getProjectOrFail(session.id, id);
    if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

    const { name } = await req.json();

    const activeCount = await prisma.developerApiKey.count({
      where: { projectId: id, status: "ACTIVE" },
    });

    if (activeCount >= 5) {
      return NextResponse.json(
        { error: "ممكن 5 API Keys بس نشطين في نفس الوقت لكل مشروع. احذف واحد الأول." },
        { status: 400 }
      );
    }

    const { prefix, fullKey, hash } = generateApiKey();

    await prisma.developerApiKey.create({
      data: {
        projectId: id,
        keyHash: hash,
        keyPrefix: prefix,
        name: name || null,
        status: "ACTIVE",
      },
    });

    // Start trial timer on first ever API key (non-blocking)
    prisma.developerUser.findUnique({
      where: { id: session.id },
      select: { plan: true, trialEndsAt: true },
    }).then(dev => {
      if (dev?.plan === "TRIAL" && !dev.trialEndsAt) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        return prisma.developerUser.update({
          where: { id: session.id },
          data: { trialEndsAt },
        });
      }
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      key: { prefix, fullKey, name: name || null },
      warning: "احفظ المفتاح ده — مش هتشوفه تاني!",
    });
  } catch (err) {
    console.error("[project-api-keys-post]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

// ── DELETE — revoke API key ────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const project = await getProjectOrFail(session.id, id);
    if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("keyId");
    if (!keyId) return NextResponse.json({ error: "keyId مطلوب" }, { status: 400 });

    const key = await prisma.developerApiKey.findFirst({
      where: { id: keyId, projectId: id },
    });

    if (!key) return NextResponse.json({ error: "API Key مش موجود" }, { status: 404 });

    await prisma.developerApiKey.update({
      where: { id: keyId },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-api-keys-delete]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}