"use client";

import { useLanguage } from "@/lib/language-context";
import AiAgentDashboard from "@/app/dashboard/automation/_components/AiAgentDashboard";

export default function AiAgentPage() {
  const { locale } = useLanguage();
  const lang = locale === "en" ? "en" : "ar";

  return <AiAgentDashboard lang={lang} />;
}
