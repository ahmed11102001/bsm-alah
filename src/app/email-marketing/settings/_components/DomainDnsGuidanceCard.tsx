"use client";

import { useState } from "react";
import { ShieldCheck, Info, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function DomainDnsGuidanceCard({ fromEmail }: { fromEmail?: string | null }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const domain = fromEmail && fromEmail.includes("@") ? fromEmail.split("@")[1] : "yourdomain.com";

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("تم نسخ القيمة إلى الحافظة");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const records = [
    {
      type: "TXT",
      name: "@ (أو النطاق الرئيسي)",
      label: "SPF Record",
      value: `v=spf1 include:${domain} ~all`,
      description: "يحدد خوادم البريد المصرح لها بإرسال الرسائل نيابة عن نطاقك لحمايتك من التزوير.",
    },
    {
      type: "TXT / CNAME",
      name: `default._domainkey.${domain}`,
      label: "DKIM Signature",
      value: "تُنشأ من لوحة تحكم مزود البريد الخاص بك (cPanel / Google Workspace / Mailgun)",
      description: "توقيع رقمي يثبت أن الرسالة لم يتم التلاعب بمحتواها أثناء النقل.",
    },
    {
      type: "TXT",
      name: `_dmarc.${domain}`,
      label: "DMARC Policy",
      value: "v=DMARC1; p=none; sp=none; aspf=r;",
      description: "سياسة أمان تحمي نطاقك من الهجمات وتوجه خوادم الاستقبال مثل Gmail للتعامل مع الرسائل غير الموثقة.",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-red-600" />
          <h3 className="text-base font-bold text-slate-900">إرشادات توثيق النطاق (SPF, DKIM, DMARC)</h3>
        </div>
        <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[10px] font-semibold text-red-700">
          دليل التكوين (DNS Architecture)
        </span>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
        <Info className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
        <p>
          لتحقيق أعلى نسبة وصول لصناديق الوارد (Inbox) بدلاً من مجلد الرسائل غير المرغوب فيها (Spam)،
          تأكد من إضافة هذه السجلات في لوحة تحكم الـ DNS الخاصة بنطاقك (<span className="text-slate-900 font-mono font-bold">{domain}</span>) لدى مزود الدومين الخاص بك (مثل Cloudflare أو GoDaddy أو Namecheap).
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {records.map((rec, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <span className="rounded bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 text-[10px] font-mono font-bold">
                  {rec.type}
                </span>
                <span>{rec.label}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{rec.name}</span>
            </div>

            <p className="text-[11px] text-slate-500">{rec.description}</p>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-800 shadow-sm">
              <span className="truncate">{rec.value}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(rec.value, `rec_${i}`)}
                className="text-slate-400 hover:text-slate-700 shrink-0 p-1"
                title="نسخ القيمة"
              >
                {copiedKey === `rec_${i}` ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
