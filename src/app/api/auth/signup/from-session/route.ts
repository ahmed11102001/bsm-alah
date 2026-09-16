import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createSignupSession, type SignupContext } from "@/lib/signup-session";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Google session is required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const context = body?.context as SignupContext;
  if (context !== "dashboard" && context !== "portal") {
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
    return NextResponse.json({ error: "Google account could not be verified" }, { status: 401 });
  }

  if (context === "dashboard" && (user.phone || user.password || user.onboardingCompleted)) {
    return NextResponse.json({ error: "This email is already registered", code: "EMAIL_EXISTS" }, { status: 409 });
  }
  if (context === "portal") {
    const existingDeveloper = await prisma.developerUser.findUnique({ where: { email: user.email } });
    if (existingDeveloper) {
      return NextResponse.json({ error: "This email is already registered", code: "EMAIL_EXISTS" }, { status: 409 });
    }
  }

  const { token } = await createSignupSession(context, {
    sub: account.providerAccountId,
    email: user.email,
    name: user.name,
    picture: user.image,
  });
  return NextResponse.json({ signupToken: token, email: user.email, name: user.name });
}
