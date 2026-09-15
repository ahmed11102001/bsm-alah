import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/developers/otp/key-info
//
// Key-introspection helper so clients (e.g. the Wani CLI) can verify that a
// project API key belongs to the project the user selected — BEFORE saving
// or using it. Read-only, additive, no behavior change to existing routes.
//
// Headers:  x-api-key: wani_live_xxxx
// Response: { ok: true, projectId, projectName } | { ok: false, error }
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const rawKey = req.headers.get("x-api-key")?.trim();
  if (!rawKey) {
    return NextResponse.json(
      { ok: false, error: "API Key مطلوب في header: x-api-key", code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  const hash = createHash("sha256").update(rawKey).digest("hex");
  const keyRecord = await prisma.developerApiKey.findUnique({
    where: { keyHash: hash },
    select: {
      status: true,
      project: { select: { id: true, name: true } },
    },
  });

  if (!keyRecord || keyRecord.status !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, error: "API Key غير صحيح أو ملغي", code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    projectId: keyRecord.project.id,
    projectName: keyRecord.project.name,
  });
}
