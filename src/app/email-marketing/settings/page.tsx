"use client";

import { useState, useEffect } from "react";
import SmtpConnectionForm from "./_components/SmtpConnectionForm";
import EmailConnectionStatusCard from "./_components/EmailConnectionStatusCard";
import { MOCK_SMTP_CONFIG } from "../constants";
import type { SmtpConfigDTO } from "../types";
import { Loader2 } from "lucide-react";

import DomainDnsGuidanceCard from "./_components/DomainDnsGuidanceCard";

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<SmtpConfigDTO>(MOCK_SMTP_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email/connection")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isConfigured) {
          setConfig({
            host: data.host,
            port: data.port,
            secure: data.secure,
            user: data.user,
            password: data.password || "",
            fromEmail: data.fromEmail,
            fromName: data.fromName,
            isConfigured: true,
            lastTestedAt: data.lastTestedAt,
            lastTestSuccess: data.lastTestSuccess,
          });
        }
      })
      .catch((err) => {
        console.error("[EmailSettingsPage] Failed to fetch saved connection:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">إعدادات ربط البريد (SMTP Settings)</h1>
        <p className="mt-1 text-sm text-slate-500">
          تهيئة خادم الإرسال الخاص بك، واختبار الاتصال لضمان وصول رسائل الحملات بنجاح.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Settings Form & DNS Guidance */}
        <div className="lg:col-span-2 space-y-6">
          <SmtpConnectionForm
            initialData={config}
            onSaveSuccess={(updated) => setConfig(updated)}
          />

          <DomainDnsGuidanceCard fromEmail={config.fromEmail} />
        </div>

        {/* Right: Connection Status and Guide */}
        <div className="lg:col-span-1">
          <EmailConnectionStatusCard config={config} />
        </div>
      </div>
    </div>
  );
}
