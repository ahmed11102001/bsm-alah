import type { Metadata } from "next";
import TermsContent from "./TermsContent";

export const metadata: Metadata = {
  title: "Terms of Use | Wani",
  description:
    "Wani's terms of use for our WhatsApp marketing campaign platform — شروط الاستخدام لمنصة Wani لإدارة حملات واتساب التسويقية",
};

export default function TermsPage() {
  return <TermsContent />;
}
