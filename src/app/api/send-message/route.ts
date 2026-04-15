import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { to, templateName = "welcome_message" } = await req.json();

    if (!to) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    const response = await fetch("https://graph.facebook.com/v19.0/979565035250717/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "ar" }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "فشل إرسال الرسالة" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Send Message Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال الرسالة" }, { status: 500 });
  }
}