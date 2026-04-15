import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = "my_secret_token_123";

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse("Verification failed", { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Webhook Event:", JSON.stringify(body, null, 2));

    // يمكن إضافة معالجة الـ webhook هنا

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Error processing webhook", { status: 500 });
  }
}