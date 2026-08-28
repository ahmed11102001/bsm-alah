import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { requirePermission } from "@/lib/permissions";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";

// ─── GET: جلب بيانات بروفايل واتساب من Meta API ──────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "WHATSAPP_SETTINGS");
    if (denied) return denied;

    const ownerId = ((session!.user as any).parentId as string | null) ?? (session!.user as any).id;

    const account = await prisma.whatsAppAccount.findUnique({
      where: { userId: ownerId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        wabaId: true,
      },
    });

    if (!account || !account.accessToken || !account.phoneNumberId) {
      return NextResponse.json(
        { error: "لا يوجد حساب واتساب مرتبط أو بيانات الربط غير مكتملة" },
        { status: 400 }
      );
    }

    const decryptedToken = decryptToken(account.accessToken).trim();

    // 1. جلب بيانات الملف التعريفي للنشاط التجاري
    const profileUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;
    const profileRes = await fetch(profileUrl, {
      headers: { Authorization: `Bearer ${decryptedToken}` },
      cache: "no-store",
    });

    // 2. جلب بيانات رقم الهاتف والاسم المعتمد
    const phoneUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,name_status,code_verification_status`;
    const phoneRes = await fetch(phoneUrl, {
      headers: { Authorization: `Bearer ${decryptedToken}` },
      cache: "no-store",
    });

    let profileData: any = {};
    if (profileRes.ok) {
      const pJson = await profileRes.json();
      profileData = pJson.data?.[0] || {};
    } else {
      const err = await profileRes.json().catch(() => ({}));
      console.warn("[whatsapp/profile] GET profile error:", err);
    }

    let phoneData: any = {};
    if (phoneRes.ok) {
      phoneData = await phoneRes.json();
    }

    return NextResponse.json({
      success: true,
      data: {
        about: profileData.about || "",
        address: profileData.address || "",
        description: profileData.description || "",
        email: profileData.email || "",
        profile_picture_url: profileData.profile_picture_url || "",
        websites: Array.isArray(profileData.websites) ? profileData.websites : [],
        vertical: profileData.vertical || "OTHER",
        verified_name: phoneData.verified_name || "",
        display_phone_number: phoneData.display_phone_number || "",
        quality_rating: phoneData.quality_rating || "",
        name_status: phoneData.name_status || "",
        phoneNumberId: account.phoneNumberId,
        wabaId: account.wabaId,
      },
    });
  } catch (error: any) {
    console.error("[whatsapp/profile] GET error:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ أثناء جلب بيانات البروفايل" }, { status: 500 });
  }
}

// ─── POST: تحديث بيانات وصورة بروفايل واتساب على Meta API ─────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "WHATSAPP_SETTINGS");
    if (denied) return denied;

    const ownerId = ((session!.user as any).parentId as string | null) ?? (session!.user as any).id;

    const account = await prisma.whatsAppAccount.findUnique({
      where: { userId: ownerId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        wabaId: true,
      },
    });

    if (!account || !account.accessToken || !account.phoneNumberId) {
      return NextResponse.json(
        { error: "لا يوجد حساب واتساب مرتبط أو بيانات الربط غير مكتملة" },
        { status: 400 }
      );
    }

    const decryptedToken = decryptToken(account.accessToken).trim();
    const body = await req.json();

    const {
      about,
      address,
      description,
      email,
      vertical,
      websites,
      photoBase64,
      photoMimeType,
    } = body;

    let profilePictureHandle: string | null = null;

    // ── رفع صورة الملف الشخصي لميتا (إذا تم إرسال صورة جديدة) ──
    if (photoBase64 && photoMimeType) {
      try {
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const fileBuffer = Buffer.from(base64Data, "base64");

        // الخطوة 1: إنشاء جلسة رفع Upload Session في Meta Graph API
        const sessionUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/app/uploads?file_length=${fileBuffer.length}&file_type=${encodeURIComponent(photoMimeType)}&access_token=${encodeURIComponent(decryptedToken)}`;
        const sessionRes = await fetch(sessionUrl, { method: "POST" });
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok || !sessionData.id) {
          throw new Error(sessionData.error?.message || "فشل بدء جلسة رفع الصورة إلى ميتا");
        }

        const uploadSessionId = sessionData.id;

        // الخطوة 2: رفع بيانات الملف الثنائية (Binary buffer)
        const uploadRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${uploadSessionId}`, {
          method: "POST",
          headers: {
            Authorization: `OAuth ${decryptedToken}`,
            file_offset: "0",
            "Content-Type": "application/octet-stream",
          },
          body: fileBuffer,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.h) {
          throw new Error(uploadData.error?.message || "فشل تحميل ملف الصورة إلى خوادم ميتا");
        }

        profilePictureHandle = uploadData.h;
      } catch (uploadErr: any) {
        console.error("[whatsapp/profile] Image upload failed:", uploadErr);
        return NextResponse.json(
          { error: `فشل رفع صورة البروفايل لميتا: ${uploadErr.message || uploadErr}` },
          { status: 400 }
        );
      }
    }

    // ── تجهيز الـ Payload وتحديث WhatsApp Business Profile ──
    const metaPayload: Record<string, any> = {
      messaging_product: "whatsapp",
    };

    if (typeof about === "string") metaPayload.about = about.trim().slice(0, 139);
    if (typeof address === "string") metaPayload.address = address.trim().slice(0, 256);
    if (typeof description === "string") metaPayload.description = description.trim().slice(0, 512);
    if (typeof email === "string") metaPayload.email = email.trim();
    if (typeof vertical === "string" && vertical) metaPayload.vertical = vertical;
    
    if (Array.isArray(websites)) {
      metaPayload.websites = websites
        .map((w: any) => String(w || "").trim())
        .filter(Boolean)
        .slice(0, 2);
    }

    if (profilePictureHandle) {
      metaPayload.profile_picture_handle = profilePictureHandle;
    }

    const updateUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.phoneNumberId}/whatsapp_business_profile`;
    const updateRes = await fetch(updateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok || updateData.error) {
      const errorMsg = updateData.error?.error_user_msg || updateData.error?.message || "فشل تحديث بيانات البروفايل على ميتا";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث بروفايل واتساب بنجاح",
      updated: updateData,
    });
  } catch (error: any) {
    console.error("[whatsapp/profile] POST error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تحديث بروفايل واتساب" },
      { status: 500 }
    );
  }
}
