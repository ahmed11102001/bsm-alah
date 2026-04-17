import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import prisma from "@/lib/prisma";



export async function GET() {

  try {

    const session = await getServerSession(authOptions);



    if (!session || !session.user) {

      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

    }



    const campaigns = await prisma.campaign.findMany({

      where: {

        userId: (session.user as any).id,

      },

      include: {

        template: true,

        messages: {

          take: 5,

          orderBy: { createdAt: "desc" }

        },

        _count: { select: { messages: true } }

      },

      orderBy: { createdAt: "desc" }

    });



    return NextResponse.json(campaigns);

  } catch (error) {

    console.error("❌ Database Error:", error);

    return NextResponse.json({ error: "فشل تحميل الحملات" }, { status: 500 });

  }

}



export async function POST(req: Request) {

  try {

    const session = await getServerSession(authOptions);

    if (!session?.user) return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });



    // استلام البيانات بنفس الأسماء اللي الـ Frontend بيبعتها فعلاً

    const { campaignName, templateName, numbers, scheduled } = await req.json();



    if (!campaignName || !numbers || !Array.isArray(numbers)) {

      return NextResponse.json({ error: "بيانات الحملة غير مكتملة" }, { status: 400 });

    }



    // 1. إنشاء سجل الحملة في قاعدة البيانات (Neon)

    const campaign = await prisma.campaign.create({

      data: {

        name: campaignName,

        status: scheduled ? "scheduled" : "pending",

        userId: (session.user as any).id,

        // ملاحظة: تأكد أن templateId اختيارى في الـ Schema أو اربطه هنا

      }

    });



    // 2. تجهيز سجلات الرسائل في الـ Database

    const messagesData = numbers.map((num: string) => ({

      userId: (session.user as any).id,

      campaignId: campaign.id,

      content: templateName, // تخزين اسم القالب كـ محتوى مبدئي

      contactId: "temporary_id", // يفضل ربطه بجدول الـ Contact لاحقاً

      status: "pending"

    }));



    // ملحوظة: الـ createMany لابد أن تتماشى مع الـ Schema بتاعتك

    // await prisma.message.createMany({ data: messagesData });



    return NextResponse.json({ success: true, campaignId: campaign.id });

  } catch (error: any) {

    console.error("❌ Database Error:", error);

    return NextResponse.json({ error: "فشل إنشاء الحملة في السيرفر" }, { status: 500 });

  }

}