import type { Metadata } from "next";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "عن وني | About Wani — منصة واتساب للأعمال",
  description:
    "Wani منصة حلول واتساب للأعمال، CRM، وأتمتة التسويق — مملوكة ومدارة بواسطة أحمد عادل عبد الفتاح إسماعيل. Wani is owned and operated by Ahmed Adel Abdel Fattah Ismail.",
  alternates: {
    canonical: "https://aiwni.com/about",
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
