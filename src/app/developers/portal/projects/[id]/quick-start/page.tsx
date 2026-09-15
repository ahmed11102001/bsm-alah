"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Globe, Package, TerminalSquare, Key, Copy, Check,
  ArrowLeft, ArrowRight, FlaskConical, BookOpen, FileText,
} from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";
import { useDevPath } from "@/lib/dev-links";

type BuildPath = "manual" | "sdk" | "cli";
type ManualOp = "send" | "verify" | "status";

type Template = { id: string; name: string; language: string; status: string; metaTemplateId: string | null };

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="qs-copy-btn"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : (label ?? "Copy")}
    </button>
  );
}

function CodeBlock({ code, copyValue }: { code: string; copyValue?: string }) {
  return (
    <div className="qs-code-wrap">
      <div className="qs-code-head">
        <CopyBtn value={copyValue ?? code} />
      </div>
      <pre className="qs-code"><code>{code}</code></pre>
    </div>
  );
}

export default function QuickStartPage() {
  const { language, t } = useLanguage();
  const devPath = useDevPath();
  const { id } = useParams<{ id: string }>();
  const isAr = language === "ar";
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const [activePath, setActivePath] = useState<BuildPath>("manual");

  // ── Manual API state ──
  const [manualOp, setManualOp] = useState<ManualOp>("send");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templatesMsg, setTemplatesMsg] = useState("");

  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    setBaseUrl(window.location.origin + "/api/developers/otp");
  }, []);

  useEffect(() => {
    fetch(`/api/developers/projects/${id}/otp-templates`)
      .then((res) => res.json())
      .then((data) => {
        const next: Template[] = Array.isArray(data.templates) ? data.templates : [];
        setTemplates(next);
        const approved = next.filter((x) => x.status === "APPROVED" && !!x.metaTemplateId);
        if (approved.length === 1) setSelectedTemplateId(approved[0].id);
        else if (approved.length > 0) setSelectedTemplateId(approved[0].id);
      })
      .catch(() => setTemplatesMsg(t("Could not load templates.", "تعذر تحميل القوالب.")));
  }, [id, t]);

  const approved = useMemo(
    () => templates.filter((x) => x.status === "APPROVED" && !!x.metaTemplateId),
    [templates]
  );
  const selected = approved.find((x) => x.id === selectedTemplateId);
  const templateIdDisplay = selected?.id ?? "YOUR_TEMPLATE_ID";

  const manualSpec = useMemo(() => {
    const endpoint =
      manualOp === "send" ? `${baseUrl || "<origin>/api/developers/otp"}/send`
      : manualOp === "verify" ? `${baseUrl || "<origin>/api/developers/otp"}/verify`
      : `${baseUrl || "<origin>/api/developers/otp"}/status/:token`;
    const method = manualOp === "status" ? "GET" : "POST";
    const requestBody =
      manualOp === "send"
        ? { phone: "+201234567890", templateId: templateIdDisplay, expiryMinutes: 10 }
        : manualOp === "verify"
          ? { token: "TOKEN_FROM_SEND", code: "123456" }
          : null;
    const curl =
      manualOp === "send"
        ? `curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: $WANI_API_KEY" \\\n  -d '${JSON.stringify({ phone: "+201234567890", templateId: templateIdDisplay, expiryMinutes: 10 })}'`
        : manualOp === "verify"
          ? `curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: $WANI_API_KEY" \\\n  -d '{"token":"TOKEN_FROM_SEND","code":"123456"}'`
          : `curl "${endpoint.replace(":token", "TOKEN_FROM_SEND")}" \\\n  -H "x-api-key: $WANI_API_KEY"`;
    const responseExample =
      manualOp === "send"
        ? { ok: true, token: "otp_abc123…", expiresAt: "2026-01-01T00:10:00.000Z" }
        : manualOp === "verify"
          ? { ok: true, verified: true }
          : { ok: true, status: "verified" };
    return { endpoint, method, requestBody, curl, responseExample };
  }, [manualOp, baseUrl, templateIdDisplay]);

  const sdkInstall = "npm install @aiwni/sdk";
  const sdkCode = `import { Wani } from "@aiwni/sdk";

const wani = new Wani({
  apiKey: process.env.WANI_API_KEY,
});

// Send an OTP (templateId is shown next to each template in the portal)
const sent = await wani.otp.send({
  phone: "201xxxxxxxxx",
  templateId: "${templateIdDisplay}",
});

console.log(sent.token, sent.expiresAt);

// Verify the code the user received
const result = await wani.otp.verify({
  token: sent.token,
  code: "123456",
});`;

  const cliInstall = "npm install -g @aiwni/cli";
  const cliCode = `# 1. Log in with your Developer Portal account
wani login

# 2. See your projects and pick one
wani project list

# 3. Send a test OTP (templateId is shown on each template card in the portal)
wani otp send --phone 201xxxxxxxxx --template-id ${templateIdDisplay}

# 4. Verify the code and check status
wani otp verify --token <token> --code 123456
wani otp status --token <token>`;

  const paths: { id: BuildPath; icon: any; titleEn: string; titleAr: string; subEn: string; subAr: string }[] = [
    { id: "manual", icon: Globe, titleEn: "Manual API", titleAr: "Manual API", subEn: "Full control", subAr: "تحكم كامل" },
    { id: "sdk", icon: Package, titleEn: "SDK", titleAr: "SDK", subEn: "Fast integration", subAr: "دمج سريع" },
    { id: "cli", icon: TerminalSquare, titleEn: "CLI", titleAr: "CLI", subEn: "Developer tools", subAr: "أدوات المطور" },
  ];

  const ops: { id: ManualOp; en: string; ar: string }[] = [
    { id: "send", en: "Send OTP", ar: "إرسال OTP" },
    { id: "verify", en: "Verify OTP", ar: "التحقق من OTP" },
    { id: "status", en: "Check Status", ar: "فحص الحالة" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .qs-root {
          max-width: 1000px; margin: 0 auto;
          padding: 36px 28px 48px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${isAr ? "rtl" : "ltr"}; color: #fff;
        }
        .qs-header { margin-bottom: 24px; text-align: ${isAr ? "right" : "left"}; }
        .qs-eyebrow { color: #20d378; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
        .qs-title { font-size: 22px; font-weight: 600; margin: 6px 0; }
        .qs-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; max-width: 700px; line-height: 1.7; }

        .qs-key-banner {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.18);
          border-radius: 14px; padding: 14px 18px; margin-bottom: 20px;
          flex-direction: ${isAr ? "row" : "row-reverse"};
        }
        .qs-key-text { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.7; text-align: ${isAr ? "right" : "left"}; }
        .qs-key-text code { font-family: 'Fira Code', monospace; font-size: 12px; color: #20d378; }
        .qs-key-link {
          display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
          font-size: 12px; font-weight: 600; color: #060810; background: #20d378;
          padding: 8px 14px; border-radius: 9px; text-decoration: none;
        }
        .qs-key-link:hover { background: #1bbf6b; }

        .qs-path-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .qs-path-card {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px; cursor: pointer; text-align: ${isAr ? "right" : "left"};
          transition: border-color .2s, background .2s; font-family: inherit; color: #fff; width: 100%;
        }
        .qs-path-card:hover { border-color: rgba(32,211,120,0.3); background: rgba(255,255,255,0.04); }
        .qs-path-card.active { border-color: rgba(32,211,120,0.45); background: rgba(32,211,120,0.06); }
        .qs-path-icon {
          width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          background: rgba(32,211,120,0.1); border: 1px solid rgba(32,211,120,0.2); color: #20d378; margin-bottom: 12px;
        }
        .qs-path-title { font-size: 15px; font-weight: 600; }
        .qs-path-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 4px 0 12px; }
        .qs-path-cta { font-size: 12px; font-weight: 600; color: #20d378; display: flex; align-items: center; gap: 6px; flex-direction: ${isAr ? "row" : "row-reverse"}; justify-content: flex-end; }

        .qs-section {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 22px; margin-bottom: 16px;
        }
        .qs-section-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; flex-direction: ${isAr ? "row" : "row-reverse"}; }
        .qs-section-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
        .qs-section-desc { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 16px; line-height: 1.7; text-align: ${isAr ? "right" : "left"}; }

        .qs-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; flex-direction: ${isAr ? "row" : "row-reverse"}; }
        .qs-tab {
          padding: 8px 14px; border-radius: 9px; font-size: 12.5px; font-family: inherit; cursor: pointer;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);
        }
        .qs-tab.active { background: rgba(32,211,120,0.12); border-color: rgba(32,211,120,0.35); color: #20d378; font-weight: 600; }

        .qs-field { margin-bottom: 14px; text-align: ${isAr ? "right" : "left"}; }
        .qs-label { display: block; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.5); margin-bottom: 7px; }
        .qs-select, .qs-input {
          width: 100%; padding: 11px 14px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 11px; color: #fff;
          font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box;
        }
        .qs-select option { background: #1a2333; }
        .qs-select:focus, .qs-input:focus { border-color: rgba(32,211,120,0.4); }
        .qs-hint { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 6px; font-family: 'Fira Code', monospace; direction: ltr; text-align: left; }

        .qs-kv {
          display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; font-size: 12.5px;
          background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 14px 16px; margin-bottom: 12px;
        }
        .qs-kv-key { color: rgba(255,255,255,0.35); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
        .qs-kv-val { font-family: 'Fira Code', monospace; font-size: 12px; color: rgba(255,255,255,0.8); word-break: break-all; direction: ltr; text-align: left; }
        .qs-kv-val.green { color: #20d378; }

        .qs-block-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: .6px; margin: 16px 0 8px; text-align: ${isAr ? "right" : "left"}; }

        .qs-code-wrap { background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; margin-bottom: 6px; }
        .qs-code-head { display: flex; justify-content: flex-end; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
        .qs-code { margin: 0; padding: 16px 18px; overflow-x: auto; font-family: 'Fira Code', monospace; font-size: 12px; line-height: 1.7; color: rgba(255,255,255,0.78); direction: ltr; text-align: left; white-space: pre; }
        .qs-copy-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.55); border-radius: 8px; padding: 6px 11px;
          cursor: pointer; font-family: inherit; font-size: 12px;
        }
        .qs-copy-btn:hover { border-color: rgba(32,211,120,0.35); color: #20d378; }

        .qs-install-row { display: flex; gap: 10px; align-items: stretch; margin-bottom: 6px; flex-direction: ${isAr ? "row" : "row-reverse"}; }
        .qs-install-code {
          flex: 1; font-family: 'Fira Code', monospace; font-size: 12.5px; color: #fff;
          background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 11px; padding: 11px 14px; direction: ltr; text-align: left; overflow-x: auto; white-space: nowrap;
        }

        .qs-actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; flex-direction: ${isAr ? "row" : "row-reverse"}; }
        .qs-btn-primary {
          display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 10px;
          background: #20d378; color: #060810; font-weight: 600; font-size: 13px; border: none;
          cursor: pointer; text-decoration: none; font-family: inherit;
        }
        .qs-btn-primary:hover { background: #1bbf6b; }
        .qs-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.65); font-size: 13px; text-decoration: none; font-family: inherit;
        }
        .qs-btn-ghost:hover { background: rgba(255,255,255,0.09); color: #fff; }

        .qs-warn {
          margin-top: 14px; font-size: 12px; color: #f59e0b; background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.18); border-radius: 10px; padding: 10px 14px;
          text-align: ${isAr ? "right" : "left"}; line-height: 1.7;
        }
        .qs-error { font-size: 12px; color: #f87171; margin-top: 8px; text-align: ${isAr ? "right" : "left"}; }

        @media (max-width: 700px) {
          .qs-root { padding: 24px 16px 40px; }
          .qs-path-grid { grid-template-columns: 1fr; }
          .qs-key-banner { flex-direction: column; align-items: stretch; }
          .qs-kv { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="qs-root">
        {/* Header */}
        <div className="qs-header">
          <div className="qs-eyebrow">Quick Start</div>
          <h1 className="qs-title">{t("Start building with Wani", "ابدأ البناء مع Wani")}</h1>
          <p className="qs-sub">
            {t(
              "Choose the right way to integrate Wani into your project.",
              "اختر الطريقة المناسبة لك لدمج Wani في مشروعك."
            )}
          </p>
        </div>

        {/* API Key notice — never render the key itself */}
        <div className="qs-key-banner">
          <div className="qs-key-text">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#f59e0b", fontWeight: 600 }}>
              <Key size={13} /> API Key
            </span>
            <br />
            {t(
              "Your project API key is required for authenticated API requests. It is never shown inside code examples — use ",
              "مفتاح API الخاص بمشروعك مطلوب للطلبات الموثقة. لا يظهر أبدًا داخل أمثلة الكود — استخدم "
            )}
            <code>WANI_API_KEY=&quot;your_project_api_key&quot;</code>
          </div>
          <Link href={devPath(`/portal/projects/${id}/api-keys`)} className="qs-key-link">
            <Key size={13} /> {t("View API Keys", "عرض مفاتيح API")}
          </Link>
        </div>

        {/* Path selector */}
        <div className="qs-path-grid">
          {paths.map((p) => {
            const Icon = p.icon;
            const active = activePath === p.id;
            return (
              <button
                key={p.id}
                className={`qs-path-card ${active ? "active" : ""}`}
                onClick={() => setActivePath(p.id)}
              >
                <div className="qs-path-icon"><Icon size={17} /></div>
                <div className="qs-path-title">{isAr ? p.titleAr : p.titleEn}</div>
                <div className="qs-path-sub">{isAr ? p.subAr : p.subEn}</div>
                <div className="qs-path-cta">
                  {t("Get started", "ابدأ")} <BackIcon size={13} style={{ transform: isAr ? "none" : "rotate(180deg)" }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 1. Manual API ── */}
        {activePath === "manual" && (
          <section className="qs-section">
            <div className="qs-section-head">
              <span className="qs-section-title"><Globe size={15} style={{ color: "#20d378" }} /> Manual API</span>
            </div>
            <p className="qs-section-desc">
              {t(
                "Build with the Wani REST API directly — full control over every request.",
                "ابنِ باستخدام Wani REST API مباشرة — تحكم كامل في كل طلب."
              )}
            </p>

            <div className="qs-tabs">
              {ops.map((o) => (
                <button
                  key={o.id}
                  className={`qs-tab ${manualOp === o.id ? "active" : ""}`}
                  onClick={() => setManualOp(o.id)}
                >
                  {isAr ? o.ar : o.en}
                </button>
              ))}
            </div>

            {manualOp === "send" && (
              <div className="qs-field">
                <label className="qs-label">{t("Approved OTP template", "قالب OTP المعتمد")}</label>
                <select
                  className="qs-select"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">{t("Select a template", "اختر قالبًا")}</option>
                  {approved.map((x) => (
                    <option key={x.id} value={x.id}>{x.name} — {x.language}</option>
                  ))}
                </select>
                {approved.length === 0 && (
                  <div className="qs-warn">
                    {t(
                      "No approved OTP template for this project yet. Create or sync one first.",
                      "لا يوجد قالب OTP معتمد لهذا المشروع بعد. أنشئ أو زامن قالبًا أولًا."
                    )}{" "}
                    <Link href={devPath(`/portal/projects/${id}/otp-templates`)} style={{ color: "#20d378" }}>
                      {t("Go to Templates →", "→ اذهب إلى القوالب")}
                    </Link>
                  </div>
                )}
                {templatesMsg && <div className="qs-error">{templatesMsg}</div>}
              </div>
            )}

            <div className="qs-block-label">Endpoint</div>
            <div className="qs-kv">
              <span className="qs-kv-key">Method</span>
              <span className={`qs-kv-val ${manualSpec.method === "GET" ? "" : "green"}`}>{manualSpec.method}</span>
              <span className="qs-kv-key">URL</span>
              <span className="qs-kv-val">{manualSpec.endpoint}</span>
            </div>

            <div className="qs-block-label">Headers</div>
            <div className="qs-kv">
              <span className="qs-kv-key">Content-Type</span>
              <span className="qs-kv-val">application/json</span>
              <span className="qs-kv-key">x-api-key</span>
              <span className="qs-kv-val green">$WANI_API_KEY</span>
            </div>

            {manualSpec.requestBody && (
              <>
                <div className="qs-block-label">Request body</div>
                <CodeBlock code={JSON.stringify(manualSpec.requestBody, null, 2)} />
              </>
            )}

            <div className="qs-block-label">Response example</div>
            <CodeBlock code={JSON.stringify(manualSpec.responseExample, null, 2)} />

            <div className="qs-block-label">cURL</div>
            <CodeBlock code={manualSpec.curl} />

            <div className="qs-actions">
              <Link href={devPath(`/portal/projects/${id}/live-tester`)} className="qs-btn-primary">
                <FlaskConical size={14} /> {t("Try it in Live Tester", "جرّبه في Live Tester")}
              </Link>
              <Link href={devPath("/developers/docs")} className="qs-btn-ghost">
                <BookOpen size={14} /> {t("API Reference", "مرجع API")}
              </Link>
            </div>
          </section>
        )}

        {/* ── 2. SDK ── */}
        {activePath === "sdk" && (
          <section className="qs-section">
            <div className="qs-section-head">
              <span className="qs-section-title"><Package size={15} style={{ color: "#20d378" }} /> Wani SDK</span>
            </div>
            <p className="qs-section-desc">
              {t(
                "Install the official Wani SDK for the fastest server-side integration.",
                "ثبّت Wani SDK الرسمية لأسرع دمج من جهة الخادم."
              )}
            </p>

            <div className="qs-block-label">{t("Install", "التثبيت")}</div>
            <div className="qs-install-row">
              <div className="qs-install-code">{sdkInstall}</div>
              <CopyBtn value={sdkInstall} label={t("Copy install command", "نسخ أمر التثبيت")} />
            </div>

            <div className="qs-field" style={{ marginTop: 14 }}>
              <label className="qs-label">{t("Approved OTP template", "قالب OTP المعتمد")}</label>
              <select
                className="qs-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">{t("Select a template", "اختر قالبًا")}</option>
                {approved.map((x) => (
                  <option key={x.id} value={x.id}>{x.name} — {x.language}</option>
                ))}
              </select>
              {selected && <div className="qs-hint">{selected.name} · {selected.language}</div>}
            </div>

            <div className="qs-block-label">{t("Usage", "الاستخدام")}</div>
            <CodeBlock code={sdkCode} />

            <div className="qs-warn">
              {t(
                "Server-side only — keep WANI_API_KEY in your server environment. Never expose it in browser code.",
                "للخادم فقط — احتفظ بـ WANI_API_KEY في بيئة الخادم. لا تعرضه أبدًا في كود المتصفح."
              )}
            </div>

            <div className="qs-actions">
              <Link href={devPath("/developers/docs")} className="qs-btn-primary">
                <BookOpen size={14} /> {t("View SDK Docs", "عرض توثيق SDK")}
              </Link>
            </div>
          </section>
        )}

        {/* ── 3. CLI ── */}
        {activePath === "cli" && (
          <section className="qs-section">
            <div className="qs-section-head">
              <span className="qs-section-title"><TerminalSquare size={15} style={{ color: "#20d378" }} /> Wani Developer CLI</span>
            </div>
            <p className="qs-section-desc">
              {t(
                "Build, test and manage your Wani integration from your terminal.",
                "ابنِ واختبر وأدر تكامل Wani الخاص بك من الطرفية."
              )}
            </p>

            <div className="qs-block-label">{t("Install", "التثبيت")}</div>
            <div className="qs-install-row">
              <div className="qs-install-code">{cliInstall}</div>
              <CopyBtn value={cliInstall} label={t("Copy install command", "نسخ أمر التثبيت")} />
            </div>

            <div className="qs-field" style={{ marginTop: 14 }}>
              <label className="qs-label">{t("Approved OTP template (used in the example below)", "قالب OTP المعتمد (مستخدم في المثال بالأسفل)")}</label>
              <select
                className="qs-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">{t("Select a template", "اختر قالبًا")}</option>
                {approved.map((x) => (
                  <option key={x.id} value={x.id}>{x.name} — {x.language}</option>
                ))}
              </select>
            </div>

            <div className="qs-block-label">{t("Quick commands", "أوامر سريعة")}</div>
            <CodeBlock code={cliCode} />

            <div className="qs-warn">
              {t(
                "OTP commands need a project API key: --api-key flag, WANI_API_KEY env, or a key saved with `wani project use --api-key`. Never commit terminal output containing tokens.",
                "أوامر OTP تحتاج مفتاح API للمشروع: عبر --api-key أو متغير WANI_API_KEY أو مفتاح محفوظ بأمر `wani project use --api-key`. لا تحفظ مخرجات الطرفية التي تحتوي على رموز."
              )}
            </div>

            <div className="qs-actions">
              <Link href={devPath("/developers/docs")} className="qs-btn-primary">
                <FileText size={14} /> {t("CLI Documentation", "توثيق CLI")}
              </Link>
              <Link href={devPath(`/portal/projects/${id}/live-tester`)} className="qs-btn-ghost">
                <FlaskConical size={14} /> {t("Or test in browser", "أو اختبر من المتصفح")}
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
