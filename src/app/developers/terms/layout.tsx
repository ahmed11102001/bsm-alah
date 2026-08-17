import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "شروط استخدام بورتال المطورين — Wani Developers Terms of Use",
  description:
    "شروط وأحكام استخدام بورتال المطورين و API الخاص بـ Wani for Developers: الصلاحيات، حدود الاستخدام، والمسؤوليات.",
  alternates: {
    canonical: "https://aiwni.com/developers/terms",
  },
};

export default function DevTermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
