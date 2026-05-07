// src/app/t/[token]/route.ts
// ─── Tracked Link Redirect ────────────────────────────────────────────────────
// المسار ده بيستقبل الضغطة على رابط الحملة، بيسجلها، وبيحول المستخدم للرابط الأصلي
// الشكل: /t/{token}
// مش محمي بـ middleware لأن الضاغط هو عميل خارجي مش عنده session

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── Attribution Window: 48 ساعة ─────────────────────────────────────────────
const ATTRIBUTION_HOURS = 48;

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // ── 1. جيب الـ TrackedClick من الداتابيز ──────────────────────────────────
  let trackedClick;
  try {
    trackedClick = await prisma.trackedClick.findUnique({
      where: { token },
      select: {
        id:          true,
        campaignId:  true,
        contactId:   true,
        userId:      true,
        targetUrl:   true,
        isClicked:   true,
      },
    });
  } catch (err) {
    console.error("[TRACKED_LINK] DB error:", err);
    // لو في خطأ في الداتابيز — احول للـ home بدل ما تعرض error page
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app"),
      { status: 302 }
    );
  }

  // ── 2. لو الـ token مش موجود — 404 ──────────────────────────────────────────
  if (!trackedClick) {
    console.warn("[TRACKED_LINK] Token not found:", token);
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app"),
      { status: 302 }
    );
  }

  // ── 3. سجل الضغطة لو أول مرة (مش هنعدد ضغطات متعددة من نفس الشخص) ──────────
  if (!trackedClick.isClicked) {
    const now               = new Date();
    const attributionExpiry = new Date(
      now.getTime() + ATTRIBUTION_HOURS * 60 * 60 * 1000
    );

    try {
      await prisma.trackedClick.update({
        where: { id: trackedClick.id },
        data: {
          isClicked:            true,
          clickedAt:            now,
          attributionExpiresAt: attributionExpiry,
        },
      });
    } catch (err) {
      // لو فشل التسجيل — ما نوقفش الـ redirect، نكمل وبس
      console.error("[TRACKED_LINK] Failed to record click:", err);
    }
  }

  // ── 4. احول للرابط الأصلي ────────────────────────────────────────────────────
  // نتحقق إن الـ URL صحيح قبل الـ redirect عشان نمنع open redirect
  let targetUrl: URL;
  try {
    targetUrl = new URL(trackedClick.targetUrl);
  } catch {
    console.error("[TRACKED_LINK] Invalid targetUrl:", trackedClick.targetUrl);
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app"),
      { status: 302 }
    );
  }

  return NextResponse.redirect(targetUrl, { status: 302 });
}