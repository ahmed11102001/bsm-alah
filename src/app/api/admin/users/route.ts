import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// guard مشترك — أي حد مش super يشوف 404
async function guardSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// ─── GET /api/admin/users — جيب اليوزرات بـ pagination ──────────────────────
const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined; // آخر id في الصفحة السابقة
  const search = searchParams.get("search")?.trim() ?? "";

  const where = {
    parentId: null, // الـ owners بس مش sub-accounts
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name:  { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // نجيب PAGE_SIZE + 1 عشان نعرف فيه صفحة تانية ولا لأ
  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:        true,
      name:      true,
      email:     true,
      isSuper:   true,
      createdAt: true,
      subscription: {
        select: { plan: true, status: true },
      },
    },
  });

  const hasMore    = rows.length > PAGE_SIZE;
  const users      = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? users[users.length - 1].id : null;

  // total count (بدون cursor عشان يبقى accurate للـ search)
  const total = await prisma.user.count({ where });

  return NextResponse.json({ users, nextCursor, total, pageSize: PAGE_SIZE });
}

// ─── POST /api/admin/users — إنشاء يوزر جديد ────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { name, email, password, plan } = await req.json();

  if (!email || !password || !plan)
    return NextResponse.json({ error: "name / email / password / plan مطلوبين" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "الإيميل ده موجود بالفعل" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name,
        email:   email.toLowerCase(),
        password: hashed,
        role:    "OWNER",
      },
    });

    await tx.subscription.create({
      data: {
        userId:                u.id,
        plan,
        status:                "active",
        periodResetAt:         new Date(),
        campaignsUsedThisMonth: 0,
      },
    });

    return u;
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}