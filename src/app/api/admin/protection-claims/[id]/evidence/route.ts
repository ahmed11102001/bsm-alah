// src/app/api/admin/protection-claims/[id]/evidence/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminAddEvidenceSchema, parseInput } from "@/lib/schemas";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper || !session.user.id) return null;
  return session;
}

// ─── POST /api/admin/protection-claims/[id]/evidence — Add evidence entry ─────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuper();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: claimId } = await params;

  const contentType = req.headers.get("content-type") || "";

  let evidenceEntry: {
    id: string;
    type: string;
    url?: string;
    name?: string;
    note?: string;
    uploadedAt: string;
    uploadedBy: string;
  };

  if (contentType.includes("multipart/form-data")) {
    // File upload via Cloudinary
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = (form.get("type") as string) || "OTHER";
    const note = (form.get("note") as string) || "";
    const name = (form.get("name") as string) || file?.name || "evidence";

    const validTypes = ["BAN_SCREENSHOT", "META_RESTRICTION", "OPT_IN_PROOF", "NO_EXTERNAL_PROVIDER_DECLARATION", "OTHER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid evidence type" }, { status: 400 });
    }

    let url: string | undefined;
    if (file) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
      if (!allowed.includes(file.type)) {
        return NextResponse.json({ error: "File type not supported. Allowed: JPG/PNG/WebP/GIF/PDF" }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Maximum file size is 10MB" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      url = await uploadToCloudinary(buffer, {
        folder: "protection-claims-evidence",
        resource_type: file.type === "application/pdf" ? "raw" : "image",
        filename: file.name,
      });
    }

    evidenceEntry = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      url,
      name,
      note: note || undefined,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user.id,
    };
  } else {
    // JSON-only evidence (checklist/notes without file)
    const body = await req.json();
    const parsed = parseInput(AdminAddEvidenceSchema, body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    evidenceEntry = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: parsed.data.type,
      url: parsed.data.url,
      name: parsed.data.name,
      note: parsed.data.note,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user.id,
    };
  }

  // Get existing evidence files
  const claim = await prisma.protectionClaim.findUnique({
    where: { id: claimId },
    select: { evidenceFiles: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const existingFiles = (claim.evidenceFiles as any[]) || [];
  const updatedFiles = [...existingFiles, evidenceEntry];

  await prisma.protectionClaim.update({
    where: { id: claimId },
    data: { evidenceFiles: updatedFiles as any },
  });

  await prisma.protectionAuditLog.create({
    data: {
      claimId,
      adminUserId: session.user.id,
      action: "ADD_EVIDENCE",
      result: evidenceEntry.type,
      details: {
        evidenceId: evidenceEntry.id,
        type: evidenceEntry.type,
        name: evidenceEntry.name,
        hasFile: !!evidenceEntry.url,
      },
    },
  });

  return NextResponse.json({ evidence: evidenceEntry, totalCount: updatedFiles.length });
}
