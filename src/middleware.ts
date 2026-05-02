import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export const middleware = withAuth(
  function onSuccess(req) {
    const token    = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // حماية صفحة Admin — أي حد غير Super يشوف 404 (حتى ما يعرفش الصفحة موجودة)
    if (pathname.startsWith("/dashboard/admin") && !token?.isSuper) {
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
