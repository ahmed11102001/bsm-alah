import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { decryptToken } from "@/lib/crypto";

// ── POST /api/developers/projects/[id]/otp-templates/sync ────────────────────
export async function POST(
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

    const connection = await prisma.developerMetaConnection.findUnique({
      where: { projectId: id },
    });

    if (!connection?.isVerified || !connection.accessToken || !connection.wabaId) {
      return NextResponse.json(
        { error: "ربط Meta مطلوب — ادخل على نظرة عامة واربط Meta الأول" },
        { status: 400 }
      );
    }

    // فك تشفير الـ accessToken قبل الاستخدام مع Meta API
    const plainAccessToken = decryptToken(connection.accessToken);

    // Fetch templates from Meta
    const metaUrl = `https://graph.facebook.com/v21.0/${connection.wabaId}/message_templates?limit=100&fields=id,name,status,category,language,rejected_reason`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      return NextResponse.json(
        { error: metaData.error?.message || "فشل الاتصال بـ Meta" },
        { status: 502 }
      );
    }

    const metaTemplates: Array<{
      id: string;
      name: string;
      status: string;
      language: string;
      rejected_reason?: string;
    }> = metaData.data || [];

    const statusMap: Record<string, string> = {
      APPROVED: "APPROVED",
      PENDING:  "PENDING",
      REJECTED: "REJECTED",
      DISABLED: "DISABLED",
      PAUSED:   "DISABLED",
    };

    const localTemplates = await prisma.developerOtpTemplate.findMany({
      where: { projectId: id },
    });

    let updated = 0;

    for (const local of localTemplates) {
      const metaTmpl = local.metaTemplateId
        ? metaTemplates.find((m) => m.id === local.metaTemplateId)
        : metaTemplates.find((m) => m.name === local.name && m.language === local.language);

      if (!metaTmpl) continue;

      const newStatus = statusMap[metaTmpl.status] || local.status;
      const newRejectedReason = metaTmpl.status === "REJECTED"
        ? metaTmpl.rejected_reason || "مرفوض من Meta"
        : null;

      if (
        local.status !== newStatus ||
        local.metaTemplateId !== metaTmpl.id ||
        local.rejectedReason !== newRejectedReason
      ) {
        await prisma.developerOtpTemplate.update({
          where: { id: local.id },
          data: {
            status: newStatus as any,
            metaTemplateId: metaTmpl.id,
            rejectedReason: newRejectedReason,
          },
        });
        updated++;
      }
    }

    return NextResponse.json({ ok: true, updated, total: metaTemplates.length });
  } catch (err) {
    console.error("[sync-templates]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}