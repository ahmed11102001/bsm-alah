"use client";

import { PackageCheck, Crown } from "lucide-react";
import BirthdayAutomationCard from "./_components/BirthdayAutomationCard";
import EmailAutomationCard from "./_components/EmailAutomationCard";
import CartAbandonAutomationCard from "./_components/CartAbandonAutomationCard";
import WinbackAutomationCard from "./_components/WinbackAutomationCard";

export default function EmailAutomationsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white">الأتمتة</h1>
        <p className="mt-1 text-sm text-white/60">
          رسائل تلقائية بتتبعت لوحدها حسب قواعد — من غير تدخل منك.
        </p>
      </div>

      <div className="space-y-4">
        <CartAbandonAutomationCard />

        <BirthdayAutomationCard />

        <EmailAutomationCard
          type="VIP_REPEAT"
          icon={<Crown className="h-5 w-5 text-amber-300" />}
          title="عميل مميز (VIP) 👑"
          description="بيتبعت فوراً بمجرد ما العميل يعمل تاني أوردر ليه — عشان تشكره وتكافئه على ولاءه (بيتبعت مرة واحدة بس لكل عميل)."
          accent="amber"
        />

        <EmailAutomationCard
          type="POST_DELIVERY"
          icon={<PackageCheck className="h-5 w-5 text-emerald-300" />}
          title="بعد الاستلام 📦"
          description="بعد شحن الأوردر بـ 7 أيام بيتبعت إيميل بالقالب اللي تختاره — لعملاء Shopify وWooCommerce اللي عندهم إيميل."
          accent="emerald"
        />

        <WinbackAutomationCard />
      </div>
    </div>
  );
}
