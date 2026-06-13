"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode     = "choose" | "ai" | "manual";
type Language = "javascript" | "typescript" | "python" | "php" | "curl";

interface ApiKey   { id: string; keyPrefix: string; name: string; status: string; }
interface Template { id: string; name: string; language: string; status: string; }

// ─── Code generation config ───────────────────────────────────────────────────
const LANGS: { id: Language; label: string; icon: string }[] = [
  { id: "javascript", label: "JavaScript",  icon: "🟨" },
  { id: "typescript", label: "TypeScript",  icon: "🟦" },
  { id: "python",     label: "Python",      icon: "🐍" },
  { id: "php",        label: "PHP",         icon: "🐘" },
  { id: "curl",       label: "cURL",        icon: "⚡" },
];

// ─── Static manual snippets ───────────────────────────────────────────────────
function buildSnippet(lang: Language, apiKey: string, template: string, host: string): string {
  const k = apiKey || "wani_live_YOUR_KEY_HERE";
  const t = template || "otp_verification";
  const h = host || "https://your-domain.com";

  const snippets: Record<Language, string> = {
    javascript: `// ① إرسال OTP
const sendOtp = async (phone) => {
  const res = await fetch("${h}/api/developers/otp/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "${k}",
    },
    body: JSON.stringify({
      phone,
      templateName: "${t}",
      expiryMinutes: 10,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return data; // { ok, token, expiresAt }
};

// ② التحقق من الكود
const verifyOtp = async (token, code) => {
  const res = await fetch("${h}/api/developers/otp/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "${k}",
    },
    body: JSON.stringify({ token, code }),
  });
  const data = await res.json();
  return data; // { ok, verified, phone }
};

// ③ فحص الحالة (اختياري)
const checkStatus = async (token) => {
  const res = await fetch(\`${h}/api/developers/otp/status/\${token}\`, {
    headers: { "x-api-key": "${k}" },
  });
  return res.json(); // { status, secondsRemaining, ... }
};`,

    typescript: `import type { OtpSendResponse, OtpVerifyResponse } from "./types";

const API_KEY  = "${k}";
const BASE_URL = "${h}/api/developers/otp";

// ① إرسال OTP
export async function sendOtp(phone: string): Promise<OtpSendResponse> {
  const res = await fetch(\`\${BASE_URL}/send\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      phone,
      templateName: "${t}",
      expiryMinutes: 10,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return data;
}

// ② التحقق من الكود
export async function verifyOtp(
  token: string,
  code: string
): Promise<OtpVerifyResponse> {
  const res = await fetch(\`\${BASE_URL}/verify\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ token, code }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// ─── Types ────────────────────────────────────────────────────────────────────
// types.ts
export interface OtpSendResponse {
  ok: boolean;
  token: string;
  expiresAt: string;
}

export interface OtpVerifyResponse {
  ok: boolean;
  verified: boolean;
  phone?: string;
  message?: string;
}`,

    python: `import httpx
from typing import TypedDict

API_KEY  = "${k}"
BASE_URL = "${h}/api/developers/otp"
HEADERS  = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
}


class OtpClient:
    def __init__(self):
        self.client = httpx.Client(headers=HEADERS, timeout=10.0)

    # ① إرسال OTP
    def send_otp(self, phone: str, expiry_minutes: int = 10) -> dict:
        response = self.client.post(
            f"{BASE_URL}/send",
            json={
                "phone": phone,
                "templateName": "${t}",
                "expiryMinutes": expiry_minutes,
            },
        )
        data = response.json()
        if not data.get("ok"):
            raise ValueError(data.get("error", "Unknown error"))
        return data  # { ok, token, expiresAt }

    # ② التحقق من الكود
    def verify_otp(self, token: str, code: str) -> dict:
        response = self.client.post(
            f"{BASE_URL}/verify",
            json={"token": token, "code": code},
        )
        return response.json()  # { ok, verified, phone }

    # ③ فحص الحالة
    def check_status(self, token: str) -> dict:
        response = self.client.get(
            f"{BASE_URL}/status/{token}",
        )
        return response.json()


# مثال الاستخدام
otp = OtpClient()
result = otp.send_otp("+201234567890")
print(result["token"])  # احفظه في session`,

    php: `<?php
class WaniOtpClient
{
    private string $apiKey  = '${k}';
    private string $baseUrl = '${h}/api/developers/otp';

    private function request(string $method, string $path, array $body = []): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . $this->apiKey,
            ],
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_POSTFIELDS     => $method !== 'GET' ? json_encode($body) : null,
            CURLOPT_TIMEOUT        => 10,
        ]);

        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true);
    }

    // ① إرسال OTP
    public function sendOtp(string $phone, int $expiryMinutes = 10): array
    {
        $data = $this->request('POST', '/send', [
            'phone'          => $phone,
            'templateName'   => '${t}',
            'expiryMinutes'  => $expiryMinutes,
        ]);

        if (!($data['ok'] ?? false)) {
            throw new Exception($data['error'] ?? 'Unknown error');
        }
        return $data; // ['ok', 'token', 'expiresAt']
    }

    // ② التحقق من الكود
    public function verifyOtp(string $token, string $code): array
    {
        return $this->request('POST', '/verify', [
            'token' => $token,
            'code'  => $code,
        ]);
    }

    // ③ فحص الحالة
    public function checkStatus(string $token): array
    {
        return $this->request('GET', "/status/{$token}");
    }
}

// مثال الاستخدام
$wani = new WaniOtpClient();
$result = $wani->sendOtp('+201234567890');
$token  = $result['token']; // احفظه في session`,

    curl: `# ① إرسال OTP
curl -X POST "${h}/api/developers/otp/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${k}" \\
  -d '{
    "phone": "+201234567890",
    "templateName": "${t}",
    "expiryMinutes": 10
  }'

# Response:
# { "ok": true, "token": "abc123...", "expiresAt": "2025-..." }


# ② التحقق من الكود
curl -X POST "${h}/api/developers/otp/verify" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${k}" \\
  -d '{
    "token": "TOKEN_FROM_STEP_1",
    "code": "123456"
  }'

# Response:
# { "ok": true, "verified": true, "phone": "+201234567890" }


# ③ فحص الحالة (اختياري)
curl "${h}/api/developers/otp/status/TOKEN_FROM_STEP_1" \\
  -H "x-api-key: ${k}"

# Response:
# { "ok": true, "status": "verified", "secondsRemaining": 0, ... }`,
  };

  return snippets[lang];
}

// ─── Syntax highlight ─────────────────────────────────────────────────────────
function highlight(code: string, lang: Language): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    let color = "rgba(255,255,255,0.8)";
    if (/^(#|\/\/)/.test(line.trim()))                          color = "#6b7280";
    else if (/^(import|export|from|const|let|var|async|await|function|return|class|def|public|private|string|int|array|throw|new|use)\b/.test(line.trim())) color = "#c084fc";
    else if (/"[^"]*"|'[^']*'|`[^`]*`/.test(line))             color = "#86efac";
    else if (/\b(true|false|null|None|True|False)\b/.test(line)) color = "#f9a8d4";
    else if (/\b\d+\b/.test(line))                              color = "#93c5fd";
    return <div key={i} style={{ color, minHeight: "1.5em" }}>{line || " "}</div>;
  });
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} style={{
      padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
      background: copied ? "rgba(32,211,120,0.12)" : "rgba(255,255,255,0.05)",
      color: copied ? "#20d378" : "rgba(255,255,255,0.5)",
      fontSize: 12, cursor: "pointer", fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: 5, transition: "all .2s",
    }}>
      {copied ? "✓ تم النسخ" : "نسخ"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
export default function QuickStartPage() {
  const [mounted, setMounted]       = useState(false);
  const [mode, setMode]             = useState<Mode>("choose");
  const [lang, setLang]             = useState<Language>("javascript");

  // Config for manual snippets
  const [customApiKey, setCustomApiKey]     = useState("");
  const [customTemplate, setCustomTemplate] = useState("");
  const [customHost, setCustomHost]         = useState("");

  // Data from API
  const [apiKeys, setApiKeys]       = useState<ApiKey[]>([]);
  const [templates, setTemplates]   = useState<Template[]>([]);

  // AI generation state
  const [aiLang, setAiLang]         = useState<Language>("javascript");
  const [aiFramework, setAiFramework] = useState("vanilla");
  const [aiContext, setAiContext]   = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiCode, setAiCode]         = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  async function loadData() {
    try {
      // جيب أول مشروع نشط الأول
      const projRes = await fetch("/api/developers/projects");
      const projData = await projRes.json();
      const activeProjects = (projData.projects || []).filter((p: any) => p.status === "ACTIVE");
      if (!activeProjects.length) return;

      const projectId = activeProjects[0].id;

      const [keysRes, tmplRes] = await Promise.all([
        fetch(`/api/developers/projects/${projectId}/api-keys`),
        fetch(`/api/developers/projects/${projectId}/otp-templates`),
      ]);
      const keysData = await keysRes.json();
      const tmplData = await tmplRes.json();

      const activeKeys = (keysData.keys || []).filter((k: ApiKey) => k.status === "ACTIVE");
      const approvedTmpl = (tmplData.templates || []).filter((t: Template) => t.status === "APPROVED");

      setApiKeys(activeKeys);
      setTemplates(approvedTmpl);

      // Pre-fill manual config
      if (activeKeys[0])   setCustomApiKey(activeKeys[0].keyPrefix + "_••••••••");
      if (approvedTmpl[0]) setCustomTemplate(approvedTmpl[0].name);
      if (typeof window !== "undefined") setCustomHost(window.location.origin);
    } catch {/* silently fail */}
  }

  // ── AI Code Generation via Claude API ─────────────────────────────────────
  async function generateWithAI() {
    setAiLoading(true);
    setAiCode("");
    setAiStreaming(true);

    const activeKey      = apiKeys[0]?.keyPrefix ?? "wani_live_YOUR_KEY";
    const approvedTmpl   = templates[0]?.name ?? "otp_verification";
    const tmplLang       = templates[0]?.language ?? "ar";
    const origin         = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

    const frameworkLabel: Record<string, string> = {
      vanilla: "Vanilla JS",
      react:   "React / Next.js",
      vue:     "Vue.js",
      express: "Node.js / Express",
      laravel: "PHP / Laravel",
      django:  "Python / Django",
    };

    const systemPrompt = `أنت خبير في تكامل WhatsApp OTP API. مهمتك توليد كود احترافي نظيف جاهز للإنتاج.

معلومات النظام:
- API Key: ${activeKey}_[SECRET]  (الـ SECRET يجب تخزينه في environment variable)
- Base URL: ${origin}/api/developers/otp
- Template Name: ${approvedTmpl} (language: ${tmplLang})
- Endpoints:
  POST /send   → { phone, templateName, expiryMinutes } → { ok, token, expiresAt }
  POST /verify → { token, code } → { ok, verified, phone }
  GET  /status/[token] → { ok, status, secondsRemaining, ... }
- Header: x-api-key

القواعد:
1. الكود يجب أن يكون كامل وقابل للتشغيل مباشرة
2. استخدم environment variables للـ API Key
3. أضف error handling مناسب
4. أضف تعليقات بالعربي تشرح كل خطوة
5. لا تضف أي شرح خارج الكود — الكود فقط مع التعليقات داخله
6. استخدم best practices للغة المطلوبة`;

    const userPrompt = `اكتب integration كاملة لـ WhatsApp OTP باستخدام ${LANGS.find(l=>l.id===aiLang)?.label} مع ${frameworkLabel[aiFramework]}.
${aiContext ? `\nمتطلبات إضافية من المبرمج:\n${aiContext}` : ""}

المطلوب:
1. دالة sendOtp(phone) → ترجع token
2. دالة verifyOtp(token, code) → ترجع { verified, phone }
3. مثال استخدام واقعي (login flow أو registration flow)
4. أي setup مطلوب (packages، env vars، إلخ)`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          stream: false,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await res.json();
      const raw = data.content?.[0]?.text ?? "";

      // Strip markdown fences if present
      const cleaned = raw
        .replace(/^```[\w]*\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();

      setAiCode(cleaned);
    } catch (err: any) {
      setAiCode(`// خطأ في توليد الكود: ${err.message}\n// حاول مرة تانية أو استخدم الكود اليدوي`);
    } finally {
      setAiLoading(false);
      setAiStreaming(false);
    }
  }

  // ── Current manual snippet ─────────────────────────────────────────────────
  const manualCode = buildSnippet(lang, customApiKey, customTemplate, customHost);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .qs-root { min-height:100vh; background:#060810; font-family:'IBM Plex Sans Arabic',sans-serif; direction:rtl; color:#fff; }
        .qs-root::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(32,211,120,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(32,211,120,0.025) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; z-index:0; }
        .qs-inner { max-width:1100px; margin:0 auto; padding:40px 32px; position:relative; z-index:1; opacity:0; transform:translateY(10px); transition:opacity .4s,transform .4s; }
        .qs-inner.visible { opacity:1; transform:translateY(0); }

        .qs-header { margin-bottom:36px; }
        .qs-title { font-size:26px; font-weight:600; }
        .qs-subtitle { font-size:14px; color:rgba(255,255,255,0.4); margin-top:4px; }

        /* ── Choice cards ── */
        .choice-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:780px; margin:0 auto; }
        .choice-card {
          background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08);
          border-radius:20px; padding:36px 32px; cursor:pointer; text-align:center;
          transition:all .25s; position:relative; overflow:hidden;
        }
        .choice-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg, transparent 60%, rgba(32,211,120,0.04)); opacity:0; transition:opacity .3s; }
        .choice-card:hover { border-color:rgba(32,211,120,0.25); background:rgba(32,211,120,0.03); transform:translateY(-3px); }
        .choice-card:hover::before { opacity:1; }
        .choice-card.ai-card:hover { border-color:rgba(139,92,246,0.3); background:rgba(139,92,246,0.03); }
        .choice-card.ai-card::before { background:linear-gradient(135deg, transparent 60%, rgba(139,92,246,0.04)); }
        .choice-icon { font-size:44px; margin-bottom:18px; }
        .choice-title { font-size:18px; font-weight:600; margin-bottom:8px; }
        .choice-desc { font-size:13px; color:rgba(255,255,255,0.45); line-height:1.6; }
        .choice-badge {
          display:inline-block; margin-top:14px; padding:4px 12px; border-radius:20px;
          font-size:11px; font-weight:600;
        }
        .badge-ai     { background:rgba(139,92,246,0.15); color:#a78bfa; border:1px solid rgba(139,92,246,0.25); }
        .badge-manual { background:rgba(32,211,120,0.10); color:#20d378;  border:1px solid rgba(32,211,120,0.2); }

        /* ── Back button ── */
        .btn-back { padding:8px 16px; background:none; border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:rgba(255,255,255,0.5); font-size:13px; font-family:inherit; cursor:pointer; transition:all .2s; margin-bottom:28px; display:inline-flex; align-items:center; gap:6px; }
        .btn-back:hover { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.2); }

        /* ── Layout ── */
        .qs-layout { display:grid; grid-template-columns:280px 1fr; gap:24px; align-items:start; }

        /* ── Config panel (left) ── */
        .config-panel { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:18px; padding:22px; position:sticky; top:80px; }
        .config-title { font-size:13px; font-weight:600; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:.6px; margin-bottom:16px; }
        .field { margin-bottom:14px; }
        .field-label { display:block; font-size:12px; color:rgba(255,255,255,0.45); margin-bottom:6px; }
        .f-input,.f-select,.f-textarea {
          width:100%; padding:9px 12px; background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.09); border-radius:10px; color:#fff;
          font-size:13px; font-family:'IBM Plex Sans Arabic',sans-serif;
          outline:none; box-sizing:border-box; transition:border-color .2s,box-shadow .2s;
        }
        .f-input.mono { font-family:'Fira Code',monospace; font-size:11px; direction:ltr; text-align:left; }
        .f-input::placeholder,.f-textarea::placeholder { color:rgba(255,255,255,0.2); }
        .f-input:focus,.f-select:focus,.f-textarea:focus { border-color:rgba(32,211,120,0.35); box-shadow:0 0 0 3px rgba(32,211,120,0.06); }
        .f-select { appearance:none; cursor:pointer; }
        .f-select option { background:#1a2333; }
        .f-textarea { resize:vertical; line-height:1.5; font-size:13px; }

        /* Key/Template status rows */
        .status-row { display:flex; align-items:center; gap:6px; font-size:11px; margin-top:5px; }
        .dot-green { width:6px; height:6px; border-radius:50%; background:#20d378; }
        .dot-amber { width:6px; height:6px; border-radius:50%; background:#f59e0b; }

        /* Lang pills */
        .lang-pills { display:flex; gap:6px; flex-wrap:wrap; }
        .lang-pill { padding:6px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); cursor:pointer; font-size:12px; font-family:inherit; color:rgba(255,255,255,0.5); transition:all .2s; }
        .lang-pill:hover { border-color:rgba(255,255,255,0.18); }
        .lang-pill.active { background:rgba(32,211,120,0.1); border-color:rgba(32,211,120,0.3); color:#20d378; }
        .lang-pill.ai.active { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.3); color:#a78bfa; }

        /* ── Code panel (right) ── */
        .code-panel { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:18px; overflow:hidden; }
        .code-header { padding:12px 18px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.02); }
        .code-dots { display:flex; gap:6px; }
        .code-dot { width:10px; height:10px; border-radius:50%; }
        .code-label { font-size:12px; color:rgba(255,255,255,0.35); font-family:'Fira Code',monospace; }
        .code-body { padding:24px; overflow-x:auto; }
        .code-pre { margin:0; font-family:'Fira Code',monospace; font-size:12.5px; line-height:1.7; }

        /* AI generate button */
        .btn-gen {
          width:100%; padding:12px; margin-top:16px;
          background:linear-gradient(135deg, #7c3aed, #6d28d9);
          color:#fff; border:none; border-radius:12px;
          font-size:14px; font-weight:600; font-family:inherit;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
          transition:all .2s;
        }
        .btn-gen:hover:not(:disabled) { background:linear-gradient(135deg, #8b5cf6, #7c3aed); }
        .btn-gen:disabled { opacity:.5; cursor:not-allowed; }

        /* AI thinking */
        .ai-thinking { display:flex; align-items:center; gap:10px; padding:32px; color:rgba(255,255,255,0.4); font-size:13px; }
        .dots-spin { display:flex; gap:4px; }
        .dots-spin span { width:6px; height:6px; border-radius:50%; background:#a78bfa; animation:pulse 1.2s ease-in-out infinite; }
        .dots-spin span:nth-child(2) { animation-delay:.2s; }
        .dots-spin span:nth-child(3) { animation-delay:.4s; }
        @keyframes pulse { 0%,100% { opacity:.2; transform:scale(.8); } 50% { opacity:1; transform:scale(1.2); } }

        /* AI empty state */
        .ai-empty { padding:48px 32px; text-align:center; }
        .ai-empty-icon { font-size:44px; margin-bottom:16px; }
        .ai-empty-title { font-size:16px; font-weight:600; color:rgba(255,255,255,0.6); margin-bottom:8px; }
        .ai-empty-sub { font-size:13px; color:rgba(255,255,255,0.3); }

        /* divider */
        .divider { height:1px; background:rgba(255,255,255,0.06); margin:14px 0; }

        /* no-meta warning */
        .warning-box { padding:12px 14px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:10px; font-size:12px; color:rgba(245,158,11,0.8); margin-bottom:14px; }

        @media(max-width:900px) {
          .qs-layout { grid-template-columns:1fr; }
          .config-panel { position:static; }
          .choice-grid { grid-template-columns:1fr; max-width:440px; }
        }
        @media(max-width:640px) {
          .qs-inner { padding:20px 16px; }
        }
      `}</style>

      <div className="qs-root">
        <div className={`qs-inner ${mounted ? "visible" : ""}`}>

          <div className="qs-header">
            <h1 className="qs-title">البدء السريع</h1>
            <p className="qs-subtitle">ابدأ تستخدم الـ OTP API في دقائق — اختار الطريقة اللي تناسبك</p>
          </div>

          {/* ═══ CHOOSE MODE ═══════════════════════════════════════════════ */}
          {mode === "choose" && (
            <div className="choice-grid">
              {/* AI option */}
              <div className="choice-card ai-card" onClick={() => setMode("ai")}>
                <div className="choice-icon">✨</div>
                <div className="choice-title">وني يولد الكود</div>
                <div className="choice-desc">
                  بتختار اللغة والـ framework وبتكتب أي متطلبات إضافية — وني بيولد integration كاملة مخصصة لمشروعك بالـ API Key والقوالب الفعلية بتاعتك
                </div>
                <span className="choice-badge badge-ai">AI-Powered ✦</span>
              </div>

              {/* Manual option */}
              <div className="choice-card" onClick={() => setMode("manual")}>
                <div className="choice-icon">📋</div>
                <div className="choice-title">أنا أختار الكود</div>
                <div className="choice-desc">
                  Snippets جاهزة بـ JavaScript / TypeScript / Python / PHP / cURL — نسخ وتشغيل مباشرة مع بياناتك الفعلية
                </div>
                <span className="choice-badge badge-manual">Copy & Paste</span>
              </div>
            </div>
          )}

          {/* ═══ AI MODE ═══════════════════════════════════════════════════ */}
          {mode === "ai" && (
            <>
              <button className="btn-back" onClick={() => { setMode("choose"); setAiCode(""); }}>
                ← رجوع
              </button>

              <div className="qs-layout">
                {/* Left config */}
                <div className="config-panel">
                  <div className="config-title">✨ توليد بـ AI</div>

                  {/* API Key status */}
                  {apiKeys.length > 0 ? (
                    <div className="status-row" style={{ marginBottom: 12 }}>
                      <div className="dot-green" />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                        API Key: {apiKeys[0].keyPrefix}…
                      </span>
                    </div>
                  ) : (
                    <div className="warning-box">⚠️ مفيش API Key نشط — اعمل واحد من صفحة API Keys</div>
                  )}

                  {templates.length > 0 ? (
                    <div className="status-row" style={{ marginBottom: 14 }}>
                      <div className="dot-green" />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                        قالب: {templates[0].name}
                      </span>
                    </div>
                  ) : (
                    <div className="warning-box">⚠️ مفيش قالب Approved — راجع صفحة القوالب</div>
                  )}

                  <div className="divider" />

                  <div className="field">
                    <label className="field-label">لغة البرمجة</label>
                    <div className="lang-pills">
                      {LANGS.map(l => (
                        <button key={l.id} className={`lang-pill ai ${aiLang === l.id ? "active" : ""}`}
                          onClick={() => setAiLang(l.id)}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Framework</label>
                    <select className="f-select" value={aiFramework} onChange={e => setAiFramework(e.target.value)}>
                      <option value="vanilla">Vanilla JS</option>
                      <option value="react">React / Next.js</option>
                      <option value="vue">Vue.js</option>
                      <option value="express">Node.js / Express</option>
                      <option value="laravel">PHP / Laravel</option>
                      <option value="django">Python / Django</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">متطلبات إضافية (اختياري)</label>
                    <textarea className="f-textarea" rows={4}
                      placeholder={"مثال:\n- عاوز login page كاملة\n- استخدم TypeScript strict\n- أضف retry logic"}
                      value={aiContext} onChange={e => setAiContext(e.target.value)} />
                  </div>

                  <button className="btn-gen" onClick={generateWithAI}
                    disabled={aiLoading || apiKeys.length === 0}>
                    {aiLoading
                      ? <><div style={{ width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite" }}/>بيولد الكود...</>
                      : <>✨ ولّد الكود</>
                    }
                  </button>
                </div>

                {/* Right: generated code */}
                <div className="code-panel">
                  <div className="code-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="code-dots">
                        <div className="code-dot" style={{ background: "#ff5f57" }} />
                        <div className="code-dot" style={{ background: "#ffbd2e" }} />
                        <div className="code-dot" style={{ background: "#28c840" }} />
                      </div>
                      <span className="code-label">
                        {LANGS.find(l => l.id === aiLang)?.label ?? aiLang} — AI Generated
                      </span>
                    </div>
                    {aiCode && <CopyBtn text={aiCode} />}
                  </div>

                  {aiLoading ? (
                    <div className="ai-thinking">
                      <div className="dots-spin">
                        <span/><span/><span/>
                      </div>
                      وني بيولد الكود المخصص لمشروعك...
                    </div>
                  ) : aiCode ? (
                    <div className="code-body">
                      <pre className="code-pre" ref={codeRef}>
                        {highlight(aiCode, aiLang)}
                      </pre>
                    </div>
                  ) : (
                    <div className="ai-empty">
                      <div className="ai-empty-icon">✨</div>
                      <div className="ai-empty-title">اختار اللغة والـ Framework</div>
                      <div className="ai-empty-sub">ثم اضغط "ولّد الكود" وهيجيلك integration كاملة بثواني</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══ MANUAL MODE ═══════════════════════════════════════════════ */}
          {mode === "manual" && (
            <>
              <button className="btn-back" onClick={() => setMode("choose")}>
                ← رجوع
              </button>

              <div className="qs-layout">
                {/* Left: config */}
                <div className="config-panel">
                  <div className="config-title">⚙️ إعداد الكود</div>

                  <div className="field">
                    <label className="field-label">لغة البرمجة</label>
                    <div className="lang-pills">
                      {LANGS.map(l => (
                        <button key={l.id} className={`lang-pill ${lang === l.id ? "active" : ""}`}
                          onClick={() => setLang(l.id)}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="field">
                    <label className="field-label">API Key</label>
                    <input className="f-input mono"
                      placeholder="wani_live_YOUR_KEY_HERE"
                      value={customApiKey}
                      onChange={e => setCustomApiKey(e.target.value)} />
                    {apiKeys.length > 0 && (
                      <div className="status-row">
                        <div className="dot-green" />
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>
                          {apiKeys.length} key نشطة — اختار من صفحة API Keys
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <label className="field-label">اسم القالب</label>
                    <input className="f-input mono"
                      placeholder="otp_verification"
                      value={customTemplate}
                      onChange={e => setCustomTemplate(e.target.value)} />
                    {templates.length > 0 ? (
                      <div className="status-row">
                        <div className="dot-green" />
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>
                          {templates[0].name} — Approved ✓
                        </span>
                      </div>
                    ) : (
                      <div className="status-row">
                        <div className="dot-amber" />
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>
                          مفيش قوالب Approved بعد
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <label className="field-label">الـ Domain (Base URL)</label>
                    <input className="f-input mono"
                      placeholder="https://your-domain.com"
                      value={customHost}
                      onChange={e => setCustomHost(e.target.value)} />
                  </div>
                </div>

                {/* Right: code */}
                <div className="code-panel">
                  <div className="code-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="code-dots">
                        <div className="code-dot" style={{ background: "#ff5f57" }} />
                        <div className="code-dot" style={{ background: "#ffbd2e" }} />
                        <div className="code-dot" style={{ background: "#28c840" }} />
                      </div>
                      <span className="code-label">
                        {LANGS.find(l => l.id === lang)?.label ?? lang}
                      </span>
                    </div>
                    <CopyBtn text={manualCode} />
                  </div>
                  <div className="code-body">
                    <pre className="code-pre">
                      {highlight(manualCode, lang)}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}