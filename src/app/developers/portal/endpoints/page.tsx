"use client";

import { useState } from "react";
import { Copy, Check, FileText, ArrowRight, Lock, Globe } from "lucide-react";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/otp/send",
    desc: "إرسال كود OTP على واتساب",
    auth: "x-api-key header",
    body: `{
  "phone": "+201234567890",
  "templateName": "otp_verification",  // optional
  "code": "123456",                     // optional — Wani generates if omitted
  "expiryMinutes": 10                   // default: 10
}`,
    response: `{
  "ok": true,
  "token": "abc123...",
  "expiresAt": "2024-01-15T12:00:00Z"
}`,
  },
  {
    method: "POST",
    path: "/api/v1/otp/verify",
    desc: "التحقق من كود OTP",
    auth: "x-api-key header",
    body: `{
  "token": "abc123...",
  "code": "123456"
}`,
    response: `{
  "ok": true,
  "verified": true
}`,
  },
  {
    method: "GET",
    path: "/api/v1/otp/status/:token",
    desc: "جيب حالة OTP معين",
    auth: "x-api-key header",
    body: null,
    response: `{
  "token": "abc123...",
  "status": "pending",     // pending | sent | verified | expired | failed
  "phone": "+201234567890",
  "sentAt": "2024-01-15T11:50:00Z",
  "verifiedAt": null,
  "expiresAt": "2024-01-15T12:00:00Z"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/otp/logs",
    desc: "سجل عمليات OTP",
    auth: "x-api-key header",
    body: null,
    response: `{
  "logs": [...],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 128
  }
}`,
  },
];

export default function EndpointsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Endpoints</h1>
        <p className="text-white/50">كل نقاط الـ API المتاحة — REST JSON API</p>
      </div>

      {/* Base URL */}
      <div className="p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center gap-3">
        <Globe size={18} className="text-[#25D366]" />
        <code className="text-[#25D366] font-mono text-sm">https://yourdomain.com/api/v1</code>
      </div>

      {/* Auth Note */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
        <Lock size={18} className="text-white/40 mt-0.5" />
        <div>
          <p className="text-white/70 text-sm font-medium">Authentication</p>
          <p className="text-white/40 text-sm mt-1">
            كل الـ endpoints بتطلب <code className="text-[#25D366] font-mono">x-api-key</code> في الـ HTTP headers.
            الـ API Key بيجي من تبويب API Keys في الـ Portal.
          </p>
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        {ENDPOINTS.map((ep) => {
          const isOpen = expanded === ep.path;
          const methodColors: Record<string, string> = {
            GET: "#3b82f6",
            POST: "#25D366",
            PUT: "#f59e0b",
            DELETE: "#ef4444",
          };

          return (
            <div
              key={ep.path}
              className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpanded(isOpen ? null : ep.path)}
                className="w-full p-5 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span
                  className="px-3 py-1 rounded-lg text-xs font-bold font-mono"
                  style={{ backgroundColor: methodColors[ep.method] + "20", color: methodColors[ep.method] }}
                >
                  {ep.method}
                </span>
                <code className="text-white font-mono text-sm flex-1">{ep.path}</code>
                <span className="text-white/40 text-sm hidden sm:block">{ep.desc}</span>
                <ArrowRight
                  size={16}
                  className={`text-white/30 transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
              </button>

              {/* Details */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-white/5">
                  <div className="pt-4 space-y-4">
                    <div>
                      <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">Auth</p>
                      <p className="text-white/70 text-sm">{ep.auth}</p>
                    </div>

                    {ep.body && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white/40 text-xs uppercase tracking-wider">Request Body</p>
                          <button
                            onClick={() => copy(ep.body!, `${ep.path}-body`)}
                            className="text-white/30 hover:text-white/60 text-xs flex items-center gap-1"
                          >
                            {copied === `${ep.path}-body` ? <Check size={12} /> : <Copy size={12} />}
                            {copied === `${ep.path}-body` ? "تم" : "نسخ"}
                          </button>
                        </div>
                        <pre className="p-4 rounded-xl bg-black/30 font-mono text-sm text-white/80 overflow-x-auto">
                          {ep.body}
                        </pre>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/40 text-xs uppercase tracking-wider">Response</p>
                        <button
                          onClick={() => copy(ep.response, `${ep.path}-res`)}
                          className="text-white/30 hover:text-white/60 text-xs flex items-center gap-1"
                        >
                          {copied === `${ep.path}-res` ? <Check size={12} /> : <Copy size={12} />}
                          {copied === `${ep.path}-res` ? "تم" : "نسخ"}
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-black/30 font-mono text-sm text-white/80 overflow-x-auto">
                        {ep.response}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
