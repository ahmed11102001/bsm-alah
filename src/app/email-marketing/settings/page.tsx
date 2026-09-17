"use client";

import { useState } from "react";
import SmtpConnectionForm from "./_components/SmtpConnectionForm";
import EmailConnectionStatusCard from "./_components/EmailConnectionStatusCard";
import { MOCK_SMTP_CONFIG } from "../constants";
import type { SmtpConfigDTO } from "../types";

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<SmtpConfigDTO>(MOCK_SMTP_CONFIG);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white">إعدادات ربط البريد (SMTP Settings)</h1>
        <p className="mt-1 text-sm text-white/60">
          تهيئة خادم الإرسال الخاص بك، واختبار الاتصال لضمان وصول رسائل الحملات بنجاح.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Settings Form */}
        <div className="lg:col-span-2">
          <SmtpConnectionForm
            initialData={config}
            onSaveSuccess={(updated) => setConfig(updated)}
          />
        </div>

        {/* Right: Connection Status and Guide */}
        <div className="lg:col-span-1">
          <EmailConnectionStatusCard config={config} />
        </div>
      </div>
    </div>
  );
}
