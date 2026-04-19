import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendMessage } from "@/lib/whatsapp"; // تأكد من المسار الصحيح للدالة اللي عدلناها سوا

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    // @ts-ignore
    const userId = session.user.id;
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: "الرقم والرسالة مطلوبان" }, { status: 400 });
    }

    // استخدام الدالة الديناميكية اللي بتسحب بيانات العميل من الداتا بيز وتسجل الرسالة
    await sendMessage(userId, to, message);

    return NextResponse.json({ success: true, message: "تم إرسال الرسالة بنجاح" });
  } catch (error: any) {
    console.error("❌ Send Message Error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إرسال الرسالة" }, 
      { status: 500 }
    );
  }
}