import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const shop = searchParams.get("shop");

  if (!shop) {
    return new NextResponse("Missing shop parameter", {
      status: 400,
    });
  }

  const appUrl = process.env.SHOPIFY_APP_URL!;

  return NextResponse.redirect(
    `${appUrl}/dashboard/api?shop=${encodeURIComponent(shop)}`
  );
}