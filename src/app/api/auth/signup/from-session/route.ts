import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createSignupSession, type SignupContext } from "@/lib/signup-session";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    console.log("[from-session] outcome=no-session");
    return NextResponse.json({ error: "Google session is required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const context = body?.context as SignupContext;
  if (context !== "dashboard" && context !== "portal") {
    console.log("[from-session] outcome=invalid-context");
    return NextResponse.json({ error: "Invalid signup context" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, image: true, phone: true, password: true, onboardingCompleted: true, signupMethod: true },
  });
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { providerAccountId: true },
  });
  if (!user || !account) {
    console.log("[from-session] outcome=no-account", { context });
    return NextResponse.json({ error: "Google account could not be verified" }, { status: 401 });
  }

  if (context === "dashboard" && (user.phone || user.password || user.onboardingCompleted)) {
    console.log("[from-session] outcome=exists", { context });
    return NextResponse.json({ error: "This email is already registered", code: "EMAIL_EXISTS" }, { status: 409 });
  }
  if (context === "portal") {
    const existingDeveloper = await prisma.developerUser.findUnique({ where: { email: user.email } });
    if (existingDeveloper) {
      console.log("[from-session] outcome=exists", { context });
      return NextResponse.json({ error: "This email is already registered", code: "EMAIL_EXISTS" }, { status: 409 });
    }
  }

  const { token } = await createSignupSession(context, {
    sub: account.providerAccountId,
    email: user.email,
    name: user.name,
    picture: user.image,
  });

  // NextAuth's adapter creates a temporary Google User before OAuth returns.
  // Remove that shell now; the real User is created only after phone OTP verification.
  const isUnfinishedGoogleShell =
    user.signupMethod === "GOOGLE" &&
    !user.phone &&
    !user.password &&
    !user.onboardingCompleted;
  if (isUnfinishedGoogleShell) {
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log("[from-session] outcome=created", { context });
  return NextResponse.json({ signupToken: token, email: user.email, name: user.name });
}
