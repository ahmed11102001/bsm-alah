// src/app/developers/layout.tsx
// ── Developer Portal Layout ───────────────────────────────────────────────────
// server component — بيعمل auth check بدون أي dependency على NextAuth

import { redirect }     from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";

const PUBLIC_PATHS = ["/developers", "/developers/signin", "/developers/signup"];

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // الصفحة دي server component — بنقرأ الـ cookie مباشرة
  // مفيش useSession، مفيش NextAuth هنا
  return <>{children}</>;
}
