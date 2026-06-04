import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "سجل دخولك" }, { status: 401 });

    const ownerId = (session.user as any).parentId || session.user.id;

    // جلب بيانات التوكن الخاصة بالمستخدم من الداتابيز
    const account = await prisma.whatsAppAccount.findUnique({ where: { userId: ownerId } });

    if (!account || !account.accessToken || !account.wabaId) {
      return NextResponse.json({ error: "برجاء حفظ إعدادات API أولاً" }, { status: 400 });
    }

    const decryptedToken = decryptToken(account.accessToken).trim();

    let remoteTemplates: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v21.0/${account.wabaId}/message_templates?limit=100`;

    // Loop through paginated results
    while (nextUrl) {
      const response: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${decryptedToken}` },
      });

      if (!response.ok) {
        const body: any = await response.json();
        console.error("Meta Sync API Error:", body);
        return NextResponse.json({ error: body.error?.message || "فشل الاتصال بميتا لجلب القوالب" }, { status: 400 });
      }

      const body: any = await response.json();
      if (body.error) return NextResponse.json({ error: body.error.message }, { status: 400 });

      if (body.data) {
        remoteTemplates = [...remoteTemplates, ...body.data];
      }

      nextUrl = (body.paging?.next as string | undefined) || null;
    }

    let syncedCount = 0;

    for (const temp of remoteTemplates) {
      // 1. Extract body content
      const bodyComp = temp.components?.find((c: any) => c.type === "BODY");
      const content = bodyComp?.text || "";

      // 2. Extract header info
      const headerComp = temp.components?.find((c: any) => c.type === "HEADER");
      const headerType = headerComp ? headerComp.format.toLowerCase() : "none";
      const headerText = headerComp?.text || null;

      // 3. Extract footer info
      const footerComp = temp.components?.find((c: any) => c.type === "FOOTER");
      const footer = footerComp?.text || null;

      // 4. Extract buttons info
      const buttonsComp = temp.components?.find((c: any) => c.type === "BUTTONS");
      const buttons = buttonsComp?.buttons || null;

      // 5. Extract rejected reason
      const rejectedReason = temp.rejected_reason || null;

      // Update or insert template in DB
      await prisma.template.upsert({
        where: { metaId_userId: { metaId: String(temp.id), userId: ownerId } },
        update: {
          name: String(temp.name),
          status: String(temp.status).toUpperCase(),
          content: content,
          category: String(temp.category),
          language: String(temp.language),
          headerType,
          headerText,
          footer,
          buttons,
          rejectedReason,
          components: temp.components,
          updatedAt: new Date()
        },
        create: {
          metaId: String(temp.id),
          name: String(temp.name),
          status: String(temp.status).toUpperCase(),
          content: content,
          userId: ownerId,
          language: String(temp.language),
          category: String(temp.category),
          headerType,
          headerText,
          footer,
          buttons,
          rejectedReason,
          components: temp.components
        },
      });
      syncedCount++;
    }

    return NextResponse.json({ success: true, count: syncedCount });
  } catch (error: any) {
    console.error("Template Sync Error:", error);
    return NextResponse.json({ error: error.message || "خطأ داخلي" }, { status: 500 });
  }
}