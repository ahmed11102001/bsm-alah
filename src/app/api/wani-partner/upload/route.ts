// src/app/api/wani-partner/upload/route.ts
// رفع صورة الخلفية (creative) لكارت WANI Partner بتاع اليوزر → Cloudinary
// (أي مستخدم مسجّل دخول، مش الأدمن بس — المحتوى بيتراجع بعد كده من الأدمن)
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { checkEnterpriseAccess } from "@/lib/plan-guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const ownerId = (session.user as { parentId?: string | null }).parentId ?? session.user.id;
  const access = await checkEnterpriseAccess(ownerId);
  if (!access.allowed) return NextResponse.json({ error: access.message, code: access.code, requiredPlan: access.requiredPlan }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: "نوع الملف غير مدعوم، يُسمح بـ JPG/PNG/WebP/GIF فقط" }, { status: 400 });

  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "الحجم الأقصى للصورة هو 5MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToCloudinary(buffer, {
    folder: "wani-partner-cards",
    resource_type: "image",
    filename: file.name,
  });

  return NextResponse.json({ url });
}
