import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
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
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const project = await getProjectOrFail(session.id, id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

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
    return devError("حصل خطأ", "INTERNAL", 500);
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
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const project = await getProjectOrFail(session.id, id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

    const { name } = await req.json();

    const activeCount = await prisma.developerApiKey.count({
      where: { projectId: id, status: "ACTIVE" },
    });

    if (activeCount >= 5) {
      return devError(
        "ممكن 5 API Keys بس نشطين في نفس الوقت لكل مشروع. احذف واحد الأول.",
        "INVALID_REQUEST",
        400
      );
    }

    const { prefix, fullKey, hash } = generateApiKey();

    // نخزن نسخة مشفرة من المفتاح الكامل — عشان النسخ لاحقًا بعد تأكيد الباسورد
    const { encryptToken } = await import("@/lib/crypto");
    await prisma.developerApiKey.create({
      data: {
        projectId: id,
        keyHash: hash,
        keyPrefix: prefix,
        keyEncrypted: encryptToken(fullKey),
        name: name || null,
        status: "ACTIVE",
      },
    });

    // Start trial timer (30 يوم) on first ever API key (non-blocking)
    prisma.developerProject.findUnique({
      where: { id },
      select: { trialEndsAt: true, trialStartedAt: true },
    }).then(project => {
      if (project && !project.trialEndsAt) {
        const trialStartedAt = project.trialStartedAt ?? new Date();
        const trialEndsAt = new Date(trialStartedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        return prisma.developerProject.update({
          where: { id },
          data: { trialStartedAt, trialEndsAt, trialCreditsTotal: 30 },
        });
      }
    }).catch(() => {});

    // إشعار — fire-and-forget
    void (async () => {
      const { notifyDeveloper } = await import("@/lib/dev-notifications");
      const { DEVELOPERS_BASE_URL } = await import("@/lib/dev-links");
      await notifyDeveloper(session.id, {
        type: "API_KEY",
        title: "مفتاح API جديد",
        message: `اتعمل مفتاح جديد${name ? ` (${name})` : ""} لمشروع "${project.name}".`,
        link: `${DEVELOPERS_BASE_URL}/portal/projects/${id}/api-keys`,
      });
    })();

    return NextResponse.json({
      ok: true,
      key: { prefix, fullKey, name: name || null },
      warning: "احفظ المفتاح ده — مش هتشوفه تاني!",
    });
  } catch (err) {
    console.error("[project-api-keys-post]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
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
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const project = await getProjectOrFail(session.id, id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("keyId");
    if (!keyId) return devError("keyId مطلوب", "INVALID_REQUEST", 400);

    const key = await prisma.developerApiKey.findFirst({
      where: { id: keyId, projectId: id },
    });

    if (!key) return devError("API Key مش موجود", "NOT_FOUND", 404);

    await prisma.developerApiKey.update({
      where: { id: keyId },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    void (async () => {
      const { notifyDeveloper } = await import("@/lib/dev-notifications");
      const { DEVELOPERS_BASE_URL } = await import("@/lib/dev-links");
      await notifyDeveloper(session.id, {
        type: "API_KEY",
        title: "اتلغى مفتاح API",
        message: `اتلغى مفتاح${key.name ? ` (${key.name})` : ""} من مشروع "${project.name}".`,
        link: `${DEVELOPERS_BASE_URL}/portal/projects/${id}/api-keys`,
      });
    })();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-api-keys-delete]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}