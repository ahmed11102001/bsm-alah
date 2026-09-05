import type { Metadata } from "next";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";

export const metadata: Metadata = {
  title: "شروط استخدام بورتال المطورين — Wani Developers Terms of Use",
  description:
    "شروط وأحكام استخدام بورتال المطورين و API الخاص بـ Wani for Developers: الصلاحيات، حدود الاستخدام، والمسؤوليات.",
  alternates: {
    canonical: `${DEVELOPERS_BASE_URL}/terms`,
  },
};

export default function DevTermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
