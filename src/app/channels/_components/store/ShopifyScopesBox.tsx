"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// ─── الصلاحيات المطلوبة على تطبيق Shopify (Admin API access scopes) ─────────
// نفس القائمة اللي الباك إند بيتحقق منها (write_orders للطلبات، read_products
// للمنتجات، والباقي للقراءة والـ webhooks).
export const SHOPIFY_REQUIRED_SCOPES = [
  "read_orders",
  "write_orders",
  "read_checkouts",
  "read_customers",
  "read_products",
] as const;

export function ShopifyScopesBox({ locale = "ar" }: { locale?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = SHOPIFY_REQUIRED_SCOPES.join(", ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback للمتصفحات القديمة
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success(locale === "ar" ? "اتنسخت الصلاحيات ✅" : "Scopes copied ✅");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl bg-card border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          {locale === "ar" ? "الصلاحيات المطلوب تفعيلها" : "Required access scopes"}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied
            ? (locale === "ar" ? "اتنسخت" : "Copied")
            : (locale === "ar" ? "نسخ الكل" : "Copy all")}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5" dir="ltr">
        {SHOPIFY_REQUIRED_SCOPES.map(s => (
          <code
            key={s}
            className="px-2 py-1 rounded-lg text-[11px] font-mono bg-muted text-foreground/80 border border-border"
          >
            {s}
          </code>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {locale === "ar"
          ? "علّم عليهم في صفحة التطبيق: Configuration ← Admin API access — وبعد الحفظ اعمل Install/Update عشان يتطبقوا."
          : "Enable them in the app page: Configuration → Admin API access — then Save and Install/Update to apply."}
      </p>
    </div>
  );
}
