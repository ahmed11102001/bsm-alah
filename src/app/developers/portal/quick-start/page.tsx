"use client";

import { useState } from "react";
import { Copy, Check, Terminal, Globe, Server, Smartphone } from "lucide-react";

const TABS = [
  { id: "javascript", label: "JavaScript", icon: Globe },
  { id: "php", label: "PHP", icon: Server },
  { id: "python", label: "Python", icon: Terminal },
  { id: "curl", label: "cURL", icon: Smartphone },
];

const SNIPPETS: Record<string, string> = {
  javascript: `// Send OTP
const res = await fetch("https://yourdomain.com/api/v1/otp/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "wani_live_xxxxxxxxxxxxxxxx"
  },
  body: JSON.stringify({
    phone: "+201234567890",
    expiryMinutes: 10
  })
});

const data = await res.json();
// { ok: true, token: "abc123...", expiresAt: "..." }

// Verify OTP
const verify = await fetch("https://yourdomain.com/api/v1/otp/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "wani_live_xxxxxxxxxxxxxxxx"
  },
  body: JSON.stringify({
    token: data.token,
    code: "123456"
  })
});`,

  php: `<?php
// Send OTP
$ch = curl_init("https://yourdomain.com/api/v1/otp/send");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  "phone" => "+201234567890",
  "expiryMinutes" => 10
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Content-Type: application/json",
  "x-api-key: wani_live_xxxxxxxxxxxxxxxx"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);
// ["ok" => true, "token" => "abc123...", "expiresAt" => "..."]

// Verify OTP
$verify = curl_init("https://yourdomain.com/api/v1/otp/verify");
curl_setopt($verify, CURLOPT_POST, true);
curl_setopt($verify, CURLOPT_POSTFIELDS, json_encode([
  "token" => $data["token"],
  "code" => "123456"
]));
curl_setopt($verify, CURLOPT_HTTPHEADER, [
  "Content-Type: application/json",
  "x-api-key: wani_live_xxxxxxxxxxxxxxxx"
]);
curl_setopt($verify, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($verify);`,

  python: `import requests

# Send OTP
res = requests.post(
    "https://yourdomain.com/api/v1/otp/send",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "wani_live_xxxxxxxxxxxxxxxx"
    },
    json={
        "phone": "+201234567890",
        "expiryMinutes": 10
    }
)

data = res.json()
# {"ok": true, "token": "abc123...", "expiresAt": "..."}

# Verify OTP
verify = requests.post(
    "https://yourdomain.com/api/v1/otp/verify",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "wani_live_xxxxxxxxxxxxxxxx"
    },
    json={
        "token": data["token"],
        "code": "123456"
    }
)

print(verify.json())`,

  curl: `# Send OTP
curl -X POST https://yourdomain.com/api/v1/otp/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: wani_live_xxxxxxxxxxxxxxxx" \
  -d '{
    "phone": "+201234567890",
    "expiryMinutes": 10
  }'

# Response:
# {"ok":true,"token":"abc123...","expiresAt":"2024-..."}

# Verify OTP
curl -X POST https://yourdomain.com/api/v1/otp/verify \
  -H "Content-Type: application/json" \
  -H "x-api-key: wani_live_xxxxxxxxxxxxxxxx" \
  -d '{
    "token": "abc123...",
    "code": "123456"
  }'`,
};

export default function QuickStartPage() {
  const [activeTab, setActiveTab] = useState("javascript");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(SNIPPETS[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Quick Start</h1>
        <p className="text-white/50">
          ابدأ في 5 دقايق — كود جاهز للـ integration
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StepCard number="1" title="API Key" desc="اعمل API Key من تبويب API Keys" />
        <StepCard number="2" title="ارسل OTP" desc="استخدم POST /api/v1/otp/send" />
        <StepCard number="3" title="تحقق" desc="استخدم POST /api/v1/otp/verify" />
      </div>

      {/* Code Tabs */}
      <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-white/10">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "text-[#25D366] border-[#25D366] bg-[#25D366]/5"
                    : "text-white/50 border-transparent hover:text-white/70 hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={copyCode}
            className="px-4 py-2 text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check size={16} className="text-[#25D366]" /> : <Copy size={16} />}
            <span className="text-sm">{copied ? "تم النسخ" : "نسخ"}</span>
          </button>
        </div>

        {/* Code */}
        <div className="p-6 overflow-x-auto">
          <pre className="text-sm font-mono leading-relaxed">
            {SNIPPETS[activeTab].split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="text-white/20 w-8 text-right mr-4 select-none">
                  {i + 1}
                </span>
                <code
                  className={`${
                    line.trim().startsWith("//") || line.trim().startsWith("#")
                      ? "text-white/30"
                      : line.includes("x-api-key")
                      ? "text-[#25D366]"
                      : line.includes("await") || line.includes("fetch") || line.includes("curl")
                      ? "text-[#3b82f6]"
                      : "text-white/80"
                  }`}
                >
                  {line || " "}
                </code>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
        <h3 className="text-white font-semibold mb-4">نقاط الـ API</h3>
        <div className="space-y-2">
          <EndpointRow method="POST" path="/api/v1/otp/send" desc="إرسال OTP" />
          <EndpointRow method="POST" path="/api/v1/otp/verify" desc="التحقق من OTP" />
          <EndpointRow method="GET" path="/api/v1/otp/status/:token" desc="حالة OTP" />
          <EndpointRow method="GET" path="/api/v1/otp/logs" desc="سجل الأحداث" />
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
      <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold text-sm mb-3">
        {number}
      </div>
      <h4 className="text-white font-medium mb-1">{title}</h4>
      <p className="text-white/40 text-sm">{desc}</p>
    </div>
  );
}

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: "#3b82f6",
    POST: "#25D366",
    PUT: "#f59e0b",
    DELETE: "#ef4444",
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
      <span
        className="px-2.5 py-1 rounded-md text-xs font-bold font-mono"
        style={{ backgroundColor: colors[method] + "20", color: colors[method] }}
      >
        {method}
      </span>
      <code className="text-white/80 font-mono text-sm flex-1">{path}</code>
      <span className="text-white/40 text-sm">{desc}</span>
    </div>
  );
}
