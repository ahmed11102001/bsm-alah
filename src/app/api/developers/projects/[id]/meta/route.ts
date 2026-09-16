import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";
import { rateLimit } from "@/lib/rate-limit";
import { encryptToken } from "@/lib/crypto";

// ── POST — ربط Meta بمشروع معين ──────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    // Verify project ownership
    const project = await getProjectForOwnerOrDeveloper(id, session.id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

    const { accessToken, phoneNumberId, wabaId, displayPhone } = await req.json();

    const existing = await prisma.developerMetaConnection.findUnique({
      where: { projectId: id },
    });

    // تعديل بيانات الربط بدون توكن جديد → نحتفظ بالتوكن القديم (لما ينتهي غيّره فقط)
    if (!accessToken) {
      if (!existing) {
        return devError(
          "Access Token, Phone Number ID, و WABA ID مطلوبين",
          "INVALID_REQUEST",
          400
        );
      }
      if (!phoneNumberId || !wabaId) {
        return devError("Phone Number ID و WABA ID مطلوبين", "INVALID_REQUEST", 400);
      }
      await prisma.developerMetaConnection.update({
        where: { projectId: id },
        data: {
          phoneNumberId,
          wabaId,
          displayPhone: displayPhone || "",
          isVerified: true,
          updatedAt: new Date(),
        },
      });

      void (async () => {
        const { notifyDeveloper } = await import("@/lib/dev-notifications");
        const { DEVELOPERS_BASE_URL } = await import("@/lib/dev-links");
        await notifyDeveloper(session.id, {
          type: "META_CONNECTION",
          title: "اتحدث ربط Meta",
          message: `اتحدثت بيانات ربط Meta لمشروع "${project.name}" (نفس التوكن).`,
          link: `${DEVELOPERS_BASE_URL}/portal/projects/${id}`,
          dedupHours: 1,
        });
      })();

      return NextResponse.json({ ok: true });
    }

    if (!phoneNumberId || !wabaId) {
      return devError(
        "Access Token, Phone Number ID, و WABA ID مطلوبين",
        "INVALID_REQUEST",
        400
      );
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`dev-meta-connect:${ip}`, { limit: 10, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("كثير من المحاولات، حاول بعد شوية", "RATE_LIMITED", rl.retryAfter);
    }

    // Upsert connection scoped to this project
    // isVerified = true بمجرد ما المطور يحفظ البيانات
    // (التحقق الفعلي من Meta بيحصل لما يحاول يرسل OTP — لو البيانات غلط هيجي خطأ من Meta)
    // تشفير الـ accessToken قبل الحفظ في DB
    const encryptedToken = encryptToken(accessToken);
    const isEdit = !!existing;

    await prisma.developerMetaConnection.upsert({
      where: { projectId: id },
      update: {
        accessToken: encryptedToken,
        phoneNumberId,
        wabaId,
        displayPhone: displayPhone || "",
        isVerified: true,
        updatedAt: new Date(),
      },
      create: {
        projectId: id,
        accessToken: encryptedToken,
        phoneNumberId,
        wabaId,
        displayPhone: displayPhone || "",
        isVerified: true,
      },
    });

    void (async () => {
      const { notifyDeveloper } = await import("@/lib/dev-notifications");
      const { DEVELOPERS_BASE_URL } = await import("@/lib/dev-links");
      await notifyDeveloper(session.id, {
        type: "META_CONNECTION",
        title: isEdit ? "اتحدث ربط Meta" : "تم ربط Meta",
        message: isEdit
          ? `اتحدثت بيانات ربط Meta لمشروع "${project.name}".`
          : `اترابط مشروع "${project.name}" بـ Meta بنجاح.`,
        link: `${DEVELOPERS_BASE_URL}/portal/projects/${id}`,
        dedupHours: isEdit ? 1 : undefined,
      });
    })();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-meta-connect]", err);
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
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
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const project = await getProjectForOwnerOrDeveloper(id, session.id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

    await prisma.developerMetaConnection.deleteMany({
      where: { projectId: id },
    });

    void (async () => {
      const { notifyDeveloper } = await import("@/lib/dev-notifications");
      const { DEVELOPERS_BASE_URL } = await import("@/lib/dev-links");
      await notifyDeveloper(session.id, {
        type: "META_CONNECTION",
        title: "اتقطع ربط Meta",
        message: `اتقطع ربط Meta من مشروع "${project.name}" — مش هيقدر يرسل OTP.`,
        link: `${DEVELOPERS_BASE_URL}/portal/projects/${id}`,
      });
    })();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-meta-disconnect]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}

// ── GET — جلب بيانات ربط Meta لمشروع معين ────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const project = await getProjectForOwnerOrDeveloper(id, session.id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

    const connection = await prisma.developerMetaConnection.findUnique({
      where: { projectId: id },
      select: {
        id: true,
        wabaId: true,
        phoneNumberId: true,
        displayPhone: true,
        isVerified: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ ok: true, connection: null });
    }

    return NextResponse.json({ ok: true, connection });
  } catch (err) {
    console.error("[project-meta-get]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}