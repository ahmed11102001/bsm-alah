import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export const middleware = withAuth(
  function onSuccess(req) {
    // الطلب عنده token، خليه يروح
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // إذا فيه token، معناه مسجل دخول
        return !!token;
      },
    },
    pages: {
      signIn: "/", // لو مش مسجل، روح للـ home
    },
  }
);

// حط الـ middleware على المسارات المحمية بس
export const config = {
  matcher: ["/dashboard/:path*"],
};
