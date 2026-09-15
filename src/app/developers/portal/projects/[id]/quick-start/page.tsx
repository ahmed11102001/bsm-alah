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
import {
  generateIntegrationCode,
  getOtpApiContract,
  type IntegrationLanguage,
  type QuickStartOperation,
} from "@/lib/developer-code-generator";

type BuildPath = "manual" | "sdk" | "cli";
// Extra alias: "Node.js" renders the JavaScript generator with a Node label.
type ManualLang = IntegrationLanguage | "node";

type Template = { id: string; name: string; language: string; status: string; metaTemplateId: string | null };

const MANUAL_LANGS: { id: ManualLang; label: string; framework: string }[] = [
  { id: "javascript", label: "JavaScript", framework: "JavaScript (fetch)" },
  { id: "typescript", label: "TypeScript", framework: "TypeScript (fetch)" },
  { id: "node", label: "Node.js", framework: "Node.js" },
  { id: "python", label: "Python", framework: "Python (requests)" },
  { id: "php", label: "PHP", framework: "PHP (cURL)" },
  { id: "curl", label: "cURL", framework: "Server shell" },
];

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

function StepBlock({ n, title, code }: { n: string; title: string; code: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div className="qs-block-label">{n}. {title}</div>
      <CodeBlock code={code} />
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

  // ── Shared project data: the developer picks THEIR data, the page generates ──
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templatesMsg, setTemplatesMsg] = useState("");

  // ── Manual generator state: language + operation + template ──
  const [manualLang, setManualLang] = useState<ManualLang>("javascript");
  const [manualOp, setManualOp] = useState<QuickStartOperation>("send");

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
        if (approved.length > 0) setSelectedTemplateId((prev) => prev || approved[0].id);
      })
      .catch(() => setTemplatesMsg(t("Could not load templates.", "تعذر تحميل القوالب.")));
  }, [id, t]);

  const approved = useMemo(
    () => templates.filter((x) => x.status === "APPROVED" && !!x.metaTemplateId),
    [templates]
  );
  const selected = approved.find((x) => x.id === selectedTemplateId);
  const templateIdDisplay = selected?.id ?? "YOUR_TEMPLATE_ID";
  const needsTemplate = manualOp === "send";

  // ── Single contract source: endpoint + request/response derive from here ──
  const contract = useMemo(
    () => getOtpApiContract(manualOp, selected?.id),
    [manualOp, selected]
  );

  // ── Generated code derives from the SAME contract via the shared generator ──
  const generatedCode = useMemo(() => {
    const langEntry = MANUAL_LANGS.find((l) => l.id === manualLang) ?? MANUAL_LANGS[0];
    const genLang: IntegrationLanguage = manualLang === "node" ? "javascript" : manualLang;
    return generateIntegrationCode({
      operation: manualOp,
      language: genLang,
      framework: langEntry.framework,
      templateId: needsTemplate ? selected?.id : undefined,
      baseUrl: baseUrl || "https://developers.aiwni.com/api/developers/otp",
    });
  }, [manualLang, manualOp, needsTemplate, selected, baseUrl]);

  // ── SDK steps (short, copyable) ──
  const sdkInstall = "npm install @aiwni/sdk";
  const sdkConfigure = `import { Wani } from "@aiwni/sdk";

const wani = new Wani({
  apiKey: process.env.WANI_API_KEY, // WANI_API_KEY="your_project_api_key"
});`;
  const sdkSend = `// Send an OTP (templateId is shown next to each template in the portal)
const sent = await wani.otp.send({
  phone: "201xxxxxxxxx",
  templateId: "${templateIdDisplay}",
});

console.log(sent.token, sent.expiresAt);`;
  const sdkVerify = `// Verify the code the user received
const result = await wani.otp.verify({
  token: sent.token,
  code: "123456",
});

console.log(result.verified); // true`;

  // ── CLI steps ──
  const cliInstall = "npm install -g @aiwni/cli";
  const cliCommands = `# 1. Log in with your Developer Portal account
wani login

# 2. See your projects and pick one
wani project list

# 3. Send a test OTP (templateId is shown on each template card in the portal)
wani otp send --phone 201xxxxxxxxx --template-id ${templateIdDisplay}

# 4. Verify the code and check status
wani otp verify --token <token> --code 123456
wani otp status --token <token>`;

  const paths: { id: BuildPath; icon: any; titleEn: string; titleAr: string; subEn: string; subAr: string }[] = [
    { id: "manual", icon: Globe, titleEn: "Manual API", titleAr: "Manual API", subEn: "HTTP", subAr: "HTTP" },
    { id: "sdk", icon: Package, titleEn: "SDK", titleAr: "SDK", subEn: "Libraries", subAr: "مكتبات" },
    { id: "cli", icon: TerminalSquare, titleEn: "CLI", titleAr: "CLI", subEn: "Dev tools", subAr: "أدوات المطور" },
  ];

  const ops: { id: QuickStartOperation; en: string; ar: string }[] = [
    { id: "send", en: "Send OTP", ar: "إرسال OTP" },
    { id: "verify", en: "Verify OTP", ar: "التحقق من OTP" },
    { id: "status", en: "Check Status", ar: "فحص الحالة" },
  ];

  function templatePicker(hint?: string) {
    return (
      <div className="qs-field">
        <label className="qs-label">{t("Template", "القالب")}</label>
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
        {selected ? (
          <div className="qs-tid-row">
            <span className="qs-tid-label">Template ID</span>
            <code className="qs-tid-value">{selected.id}</code>
            <CopyBtn value={selected.id} />
          </div>
        ) : (
          <div className="qs-hint">{hint ?? templateIdDisplay}</div>
        )}
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
    );
  }

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

        .qs-controls { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 12px; margin-bottom: 4px; }
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

        .qs-tid-row {
          display: flex; align-items: center; gap: 10px; margin-top: 8px;
          background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 8px 10px 8px 12px;
          flex-direction: row;
        }
        .qs-tid-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: .6px; white-space: nowrap; }
        .qs-tid-value { flex: 1; font-family: 'Fira Code', monospace; font-size: 11.5px; color: #20d378; direction: ltr; text-align: left; overflow-x: auto; white-space: nowrap; }

        .qs-endpoint {
          display: flex; align-items: center; gap: 10px; margin: 6px 0 4px;
          font-family: 'Fira Code', monospace; font-size: 12.5px; direction: ltr; text-align: left;
          background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 12px 16px;
          flex-direction: row;
        }
        .qs-method { font-weight: 700; color: ${contract.method === "GET" ? "#38bdf8" : "#f59e0b"}; }
        .qs-url { color: rgba(255,255,255,0.75); word-break: break-all; }

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

        .qs-reqres-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
          .qs-controls { grid-template-columns: 1fr; }
          .qs-reqres-grid { grid-template-columns: 1fr; }
          .qs-key-banner { flex-direction: column; align-items: stretch; }
        }
      `}</style>

      <div className="qs-root">
        {/* Header */}
        <div className="qs-header">
          <div className="qs-eyebrow">Quick Start</div>
          <h1 className="qs-title">{t("Start building with Wani", "ابدأ البناء مع Wani")}</h1>
          <p className="qs-sub">
            {t(
              "Choose how you want to integrate Wani — pick your data and copy ready code into your project.",
              "اختر كيف تريد دمج Wani — اختر بياناتك وانسخ الكود الجاهز إلى مشروعك."
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

        {/* ── 1. Manual API — code generator ── */}
        {activePath === "manual" && (
          <section className="qs-section">
            <div className="qs-section-head">
              <span className="qs-section-title"><Globe size={15} style={{ color: "#20d378" }} /> Manual API</span>
            </div>
            <p className="qs-section-desc">
              {t(
                "Use Wani directly with HTTPS requests. Choose your language and copy the code.",
                "استخدم Wani مباشرة عبر HTTPS. اختر لغتك وانسخ الكود."
              )}
            </p>

            <div className="qs-controls">
              <div className="qs-field">
                <label className="qs-label">{t("Language", "اللغة")}</label>
                <select
                  className="qs-select"
                  value={manualLang}
                  onChange={(e) => setManualLang(e.target.value as ManualLang)}
                >
                  {MANUAL_LANGS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="qs-field">
                <label className="qs-label">{t("Operation", "العملية")}</label>
                <select
                  className="qs-select"
                  value={manualOp}
                  onChange={(e) => setManualOp(e.target.value as QuickStartOperation)}
                >
                  {ops.map((o) => (
                    <option key={o.id} value={o.id}>{isAr ? o.ar : o.en}</option>
                  ))}
                </select>
              </div>
              {needsTemplate ? (
                templatePicker()
              ) : (
                <div className="qs-field">
                  <label className="qs-label">{t("Token", "الرمز")}</label>
                  <div className="qs-hint">TOKEN_FROM_SEND — {t("returned by Send OTP", "يُرجع من Send OTP")}</div>
                </div>
              )}
            </div>

            <div className="qs-endpoint">
              <span className="qs-method">{contract.method}</span>
              <span className="qs-url">/api/developers/otp{contract.path}</span>
            </div>

            <div className="qs-block-label">{t("Your code", "الكود الخاص بك")}</div>
            <CodeBlock code={generatedCode} />

            <div className="qs-reqres-grid">
              <div>
                <div className="qs-block-label">Request</div>
                <CodeBlock
                  code={contract.requestBody ? JSON.stringify(contract.requestBody, null, 2) : t("No body — token goes in the URL path.", "لا يوجد body — الرمز في مسار الرابط.")}
                />
              </div>
              <div>
                <div className="qs-block-label">Response</div>
                <CodeBlock code={JSON.stringify(contract.responseExample, null, 2)} />
              </div>
            </div>

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

        {/* ── 2. SDK — steps ── */}
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

            {templatePicker()}

            <StepBlock n="1" title={t("Install", "التثبيت")} code={sdkInstall} />
            <StepBlock n="2" title={t("Configure", "الإعداد")} code={sdkConfigure} />
            <StepBlock n="3" title={t("Send OTP", "إرسال OTP")} code={sdkSend} />
            <StepBlock n="4" title={t("Verify OTP", "التحقق من OTP")} code={sdkVerify} />

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

        {/* ── 3. CLI — steps ── */}
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

            {templatePicker()}

            <StepBlock n="1" title={t("Install", "التثبيت")} code={cliInstall} />
            <div className="qs-block-label">2. {t("Then", "ثم")}</div>
            <CodeBlock code={cliCommands} />

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
