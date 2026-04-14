import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // تأكد من المسار

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        // نربط الداتا باليوزر عشان ميبقاش "عك" وكل الناس تشوف داتا بعض
        userId: session.user.id 
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل تحميل التقارير" }, { status: 500 });
  }
}