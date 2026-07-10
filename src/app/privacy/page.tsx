import type { Metadata } from "next";
import PrivacyContent from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | Wani",
  description:
    "Wani's privacy policy for our WhatsApp marketing campaign platform — سياسة الخصوصية لمنصة Wani لإدارة حملات واتساب التسويقية",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
