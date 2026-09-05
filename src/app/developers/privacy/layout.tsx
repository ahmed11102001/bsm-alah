import type { Metadata } from "next";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";

export const metadata: Metadata = {
  title: "سياسة خصوصية بورتال المطورين — Wani Developers Privacy Policy",
  description:
    "سياسة الخصوصية الخاصة ببورتال المطورين من وني (Wani for Developers): كيف نتعامل مع بيانات API، مفاتيح الوصول، وسجلات الاستخدام.",
  alternates: {
    canonical: `${DEVELOPERS_BASE_URL}/privacy`,
  },
};

export default function DevPrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
