// src/app/api/admin/protection-claims/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  AdminCreateProtectionClaimSchema,
  parseInput,
} from "@/lib/schemas";
import { runProtectionAudit } from "@/lib/protection/audit-engine";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper || !session.user.id) return null;
  return session;
}

// ─── GET /api/admin/protection-claims ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim();
  const search = searchParams.get("search")?.trim() || "";
  const sort = searchParams.get("sort") || "newest";

  const where: any = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search, mode: "insensitive" } },
      { whatsappAccountId: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sort === "highest_refund") {
    orderBy = { refundAmount: "desc" };
  }

  const [claims, total, needsReviewCount] = await Promise.all([
    prisma.protectionClaim.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, brandName: true },
        },
        whatsappAccount: {
          select: { id: true, phoneNumberId: true, wabaId: true, tokenStatus: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.protectionClaim.count({ where }),
    prisma.protectionClaim.count({ where: { status: "NEEDS_REVIEW" } }),
  ]);

  return NextResponse.json({
    claims,
    total,
    needsReviewCount,
  });
}

// ─── POST /api/admin/protection-claims ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireSuper();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = parseInput(AdminCreateProtectionClaimSchema, await req.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { whatsappAccountId, banDetectedAt, customerNotes, adminNotes, evidenceFiles } =
    parsed.data;

  // Verify that the WhatsApp Account exists in the database
  const whatsappAccount = await prisma.whatsAppAccount.findUnique({
    where: { id: whatsappAccountId },
    include: {
      user: {
        select: { id: true, email: true, phone: true, name: true },
      },
    },
  });

  if (!whatsappAccount) {
    return NextResponse.json(
      { error: "حساب واتساب المحدد غير موجود في النظام" },
      { status: 404 }
    );
  }

  const banDate = new Date(banDetectedAt);
  if (isNaN(banDate.getTime())) {
    return NextResponse.json(
      { error: "تاريخ الحظر غير صالح" },
      { status: 400 }
    );
  }

  // Derive phone number: from user phone or whatsappAccount ID
  const phoneNumber = whatsappAccount.user.phone || whatsappAccount.phoneNumberId;

  // Create the claim
  const claim = await prisma.protectionClaim.create({
    data: {
      userId: whatsappAccount.userId,
      whatsappAccountId: whatsappAccount.id,
      phoneNumber,
      banDetectedAt: banDate,
      status: "NEEDS_REVIEW",
      customerNotes: customerNotes || null,
      adminNotes: adminNotes || null,
      evidenceFiles: evidenceFiles ? (evidenceFiles as any) : undefined,
    },
  });

  // Log creation in ProtectionAuditLog
  await prisma.protectionAuditLog.create({
    data: {
      claimId: claim.id,
      adminUserId: session.user.id,
      action: "CREATE_CLAIM",
      result: "NEEDS_REVIEW",
      details: {
        whatsappAccountId: whatsappAccount.id,
        banDetectedAt: banDate.toISOString(),
        customerNotes,
      },
    },
  });

  // Automatically run the audit engine to generate evidence snapshot
  let finalClaim: any = claim;
  try {
    const auditRes = await runProtectionAudit(claim.id, session.user.id);
    finalClaim = auditRes.claim;
  } catch (err: any) {
    console.error("Auto audit failed upon claim creation:", err);
  }

  return NextResponse.json(finalClaim, { status: 201 });
}
