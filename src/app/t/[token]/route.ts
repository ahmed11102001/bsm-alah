// src/app/t/[token]/route.ts
// ─── Tracked Link Redirect ────────────────────────────────────────────────────
// المسار ده بيستقبل الضغطة على رابط الحملة، بيسجلها، وبيحول المستخدم للرابط الأصلي
// الشكل: /t/{token}
// متوافق مع Next.js 16

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── Attribution Window: 48 ساعة ─────────────────────────────────────────────
const ATTRIBUTION_HOURS = 48;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  // Next.js 16: params بقت Promise
  const { token } = await context.params;

  // ── 1. جيب الـ TrackedClick من الداتابيز ──────────────────────────────────
  let trackedClick;

  try {
    trackedClick = await prisma.trackedClick.findUnique({
      where: { token },
      select: {
        id: true,
        campaignId: true,
        contactId: true,
        userId: true,
        targetUrl: true,
        isClicked: true,
      },
    });
  } catch (err) {
    console.error("[TRACKED_LINK] DB error:", err);

    // لو في خطأ في الداتابيز → رجعه للصفحة الرئيسية
    return NextResponse.redirect(
      new URL(
        "/",
        process.env.NEXT_PUBLIC_APP_URL ??
          "https://whatsprosystem.vercel.app"
      ),
      { status: 302 }
    );
  }

  // ── 2. لو الـ token مش موجود ──────────────────────────────────────────────
  if (!trackedClick) {
    console.warn("[TRACKED_LINK] Token not found:", token);

    return NextResponse.redirect(
      new URL(
        "/",
        process.env.NEXT_PUBLIC_APP_URL ??
          "https://whatsprosystem.vercel.app"
      ),
      { status: 302 }
    );
  }

  // ── 3. سجل الضغطة لو أول مرة ──────────────────────────────────────────────
  if (!trackedClick.isClicked) {
    const now = new Date();

    const attributionExpiry = new Date(
      now.getTime() + ATTRIBUTION_HOURS * 60 * 60 * 1000
    );

    try {
      await prisma.trackedClick.update({
        where: { id: trackedClick.id },
        data: {
          isClicked: true,
          clickedAt: now,
          attributionExpiresAt: attributionExpiry,
        },
      });
    } catch (err) {
      // لو التسجيل فشل → كمل redirect عادي
      console.error("[TRACKED_LINK] Failed to record click:", err);
    }
  }

  // ── 4. Validate URL قبل الـ redirect ──────────────────────────────────────
  let targetUrl: URL;

  try {
    targetUrl = new URL(trackedClick.targetUrl);
  } catch {
    console.error(
      "[TRACKED_LINK] Invalid targetUrl:",
      trackedClick.targetUrl
    );

    return NextResponse.redirect(
      new URL(
        "/",
        process.env.NEXT_PUBLIC_APP_URL ??
          "https://whatsprosystem.vercel.app"
      ),
      { status: 302 }
    );
  }

  // ── 5. Redirect للرابط الأصلي ─────────────────────────────────────────────
  return NextResponse.redirect(targetUrl, { status: 302 });
}