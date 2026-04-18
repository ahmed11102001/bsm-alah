import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "سجل دخولك" }, { status: 401 });

    const userId = session.user.id;

    // جلب بيانات التوكن الخاصة بالمستخدم من الداتابيز
    const account = await prisma.whatsAppAccount.findUnique({ where: { userId } });

    if (!account || !account.accessToken || !account.wabaId) {
      return NextResponse.json({ error: "برجاء حفظ إعدادات API أولاً" }, { status: 400 });
    }

    const metaUrl = `https://graph.facebook.com/v20.0/${account.wabaId}/message_templates?limit=100`;
    const response = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${account.accessToken.trim()}` },
    });

    const body = await response.json();
    if (body.error) return NextResponse.json({ error: body.error.message }, { status: 400 });

    const remoteTemplates = body.data || [];
    let syncedCount = 0;

    for (const temp of remoteTemplates) {
      const bodyComp = temp.components?.find((c: any) => c.type === "BODY");
      await prisma.template.upsert({
        where: { metaId_userId: { metaId: String(temp.id), userId: userId } },
        update: {
          name: String(temp.name),
          status: String(temp.status).toUpperCase(),
          content: bodyComp?.text || "",
        },
        create: {
          metaId: String(temp.id),
          name: String(temp.name),
          status: String(temp.status).toUpperCase(),
          content: bodyComp?.text || "",
          userId: userId,
          language: String(temp.language),
          category: String(temp.category)
        },
      });
      syncedCount++;
    }
    return NextResponse.json({ success: true, count: syncedCount });
  } catch (error) { return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 }); }
}