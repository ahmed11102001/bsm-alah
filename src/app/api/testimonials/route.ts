// src/app/api/testimonials/route.ts
// POST — العميل يسيب رأيه (لازم عنده اشتراك مدفوع)
// GET  — جيب الآراء المعتمدة للـ landing page
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { rateLimit, getIP }          from "@/lib/rate-limit";

// ── GET: آراء معتمدة للـ landing page ────────────────────────────────────────
export async function GET() {
  const testimonials = await prisma.testimonial.findMany({
    where:   { approved: true },
    orderBy: { createdAt: "desc" },
    take:    20,
    select: {
      id:        true,
      name:      true,
      brandName: true,
      rating:    true,
      content:   true,
      createdAt: true,
    },
  });
  return NextResponse.json(testimonials);
}

// ── POST: إرسال رأي جديد ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit: 2 محاولات كل ساعة لنفس الـ IP
  const ip     = getIP(req);
  const rl     = rateLimit(`testimonial:${ip}`, { limit: 2, windowSecs: 60 * 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: `حاول بعد ${rl.retryAfter} ثانية` },
      { status: 429 }
    );
  }

  // التحقق من الجلسة
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول أولاً" },
      { status: 401 }
    );
  }

  // التحقق من الاشتراك المدفوع
  const userId = session.user.id;
  const sub    = await prisma.subscription.findUnique({
    where:  { userId },
    select: { plan: true, status: true },
  });

  const isPaid = sub && sub.status === "active" && sub.plan !== "free";
  if (!isPaid) {
    return NextResponse.json(
      { error: "يجب الاشتراك في خطة مدفوعة لإضافة رأيك" },
      { status: 403 }
    );
  }

  // التحقق من عدم إرسال رأي قبل كده
  const existing = await prisma.testimonial.findFirst({
    where:  { userId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "لقد أرسلت رأيك من قبل" },
      { status: 409 }
    );
  }

  // Validation
  const { name, brandName, phone, rating, content } = await req.json();

  if (!name?.trim())      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  if (!brandName?.trim()) return NextResponse.json({ error: "اسم البراند مطلوب" }, { status: 400 });
  if (!phone?.trim())     return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
  if (!content?.trim())   return NextResponse.json({ error: "الرأي مطلوب" }, { status: 400 });
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "التقييم يجب أن يكون من 1 إلى 5" }, { status: 400 });
  }
  if (content.trim().length < 20) {
    return NextResponse.json({ error: "الرأي يجب أن يكون 20 حرف على الأقل" }, { status: 400 });
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      name:      name.trim(),
      brandName: brandName.trim(),
      phone:     phone.trim(),
      rating:    Number(rating),
      content:   content.trim(),
      userId,
      approved:  false, // بيستنى موافقة الأدمن
    },
  });

  return NextResponse.json(
    { success: true, message: "شكراً! رأيك في انتظار المراجعة", id: testimonial.id },
    { status: 201 }
  );
}