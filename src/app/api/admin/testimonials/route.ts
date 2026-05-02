// src/app/api/admin/testimonials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";

async function guardSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// ── GET: كل الآراء (pending + approved) ──────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // "pending" | "approved" | null = all

  const testimonials = await prisma.testimonial.findMany({
    where:   filter === "pending"  ? { approved: false }
           : filter === "approved" ? { approved: true }
           : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(testimonials);
}

// ── PATCH: موافقة أو رفض ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id, action } = await req.json(); // action: "approve" | "reject"

  if (!id || !["approve", "reject"].includes(action))
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  if (action === "reject") {
    await prisma.testimonial.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم الحذف" });
  }

  const updated = await prisma.testimonial.update({
    where: { id },
    data:  { approved: true },
  });

  return NextResponse.json({ success: true, testimonial: updated });
}