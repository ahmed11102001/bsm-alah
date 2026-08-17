import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سياسة خصوصية بورتال المطورين — Wani Developers Privacy Policy",
  description:
    "سياسة الخصوصية الخاصة ببورتال المطورين من وني (Wani for Developers): كيف نتعامل مع بيانات API، مفاتيح الوصول، وسجلات الاستخدام.",
  alternates: {
    canonical: "https://aiwni.com/developers/privacy",
  },
};

export default function DevPrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
