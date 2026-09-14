"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../_components/LanguageProvider";
import { generateIntegrationCode, type IntegrationLanguage, type IntegrationOperation } from "@/lib/developer-code-generator";

type Template = { id: string; name: string; language: string; status: string; metaTemplateId: string | null };
type Framework = { id: string; label: string; languages: IntegrationLanguage[] };

const languages: { id: IntegrationLanguage; label: string }[] = [
  { id: "javascript", label: "JavaScript" }, { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" }, { id: "php", label: "PHP" }, { id: "curl", label: "cURL" },
];
const frameworks: Framework[] = [
  { id: "vanilla", label: "Vanilla JavaScript", languages: ["javascript", "typescript"] },
  { id: "node", label: "Node.js", languages: ["javascript", "typescript"] },
  { id: "next", label: "Next.js server route", languages: ["javascript", "typescript"] },
  { id: "react", label: "React with server endpoint", languages: ["javascript", "typescript"] },
  { id: "django", label: "Django", languages: ["python"] },
  { id: "laravel", label: "Laravel", languages: ["php"] },
  { id: "shell", label: "Server shell", languages: ["curl"] },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <button onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
    style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: copied ? "#20d378" : "rgba(255,255,255,0.55)", borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
    {copied ? "Copied" : "Copy code"}
  </button>;
}

export default function QuickStartPage() {
  const { language, t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [operation, setOperation] = useState<IntegrationOperation>("send-verify");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lang, setLang] = useState<IntegrationLanguage>("javascript");
  const [framework, setFramework] = useState("next");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const approved = templates.filter((item) => item.status === "APPROVED" && !!item.metaTemplateId);
  const needsTemplate = operation !== "verify";
  const selected = approved.find((item) => item.id === selectedTemplateId);
  const availableFrameworks = frameworks.filter((item) => item.languages.includes(lang));

  useEffect(() => {
    fetch(`/api/developers/projects/${id}/otp-templates`)
      .then((res) => res.json())
      .then((data) => {
        const next = Array.isArray(data.templates) ? data.templates : [];
        setTemplates(next);
        const valid = next.filter((item: Template) => item.status === "APPROVED" && !!item.metaTemplateId);
        if (valid.length === 1) setSelectedTemplateId(valid[0].id);
      })
      .catch(() => setError(t("Could not load templates.", "تعذر تحميل القوالب.")));
  }, [id, t]);

  useEffect(() => {
    if (!availableFrameworks.some((item) => item.id === framework)) setFramework(availableFrameworks[0]?.id ?? "");
  }, [lang, framework, availableFrameworks]);

  function generate() {
    setError("");
    if (needsTemplate && !selected) {
      setCode("");
      setError(t("Select an approved OTP template from this project first.", "اختر قالب OTP معتمدًا من هذا المشروع أولًا."));
      return;
    }
    setCode(generateIntegrationCode({
      operation,
      language: lang,
      framework,
      templateId: selected?.id,
      baseUrl: typeof window === "undefined" ? "" : window.location.origin + "/api/developers/otp",
    }));
  }

  return <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 48px", color: "#fff", fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: language === "ar" ? "rtl" : "ltr" }}>
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: "#20d378", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Wani Integration Generator</div>
      <h1 style={{ fontSize: 22, lineHeight: 1.35, fontWeight: 600, margin: "6px 0" }}>{t("Connect Wani to your application", "اربط Wani بتطبيقك")}</h1>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0, maxWidth: 700 }}>{t("Generate deterministic, server-side integration code from the real Wani API contract.", "أنشئ كود ربط deterministic يعمل على الخادم وفق عقد Wani الفعلي.")}</p>
    </div>

    <section style={{ display: "grid", gap: 18, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
      <label>{t("What do you want to build?", "ماذا تريد أن تبني؟")}
        <select value={operation} onChange={(e) => { setOperation(e.target.value as IntegrationOperation); setCode(""); }} style={{ display: "block", width: "100%", marginTop: 8, padding: "11px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 10, fontFamily: "inherit" }}>
          <option value="send">Send OTP</option><option value="verify">Verify OTP</option><option value="send-verify">Send &amp; Verify OTP</option>
        </select>
      </label>

      {needsTemplate && <label>{t("Approved OTP template", "قالب OTP المعتمد")}
        <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} style={{ display: "block", width: "100%", marginTop: 8, padding: "11px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 10, fontFamily: "inherit" }}>
          <option value="">Select a template</option>
          {approved.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.language}</option>)}
        </select>
      </label>}

      {needsTemplate && approved.length === 0 && <div style={{ color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", padding: 14, borderRadius: 10, fontSize: 13 }}>
        {t("No approved OTP template is available for this project. Create or sync an approved template first.", "لا يوجد قالب OTP معتمد لهذا المشروع. أنشئ أو زامن قالبًا معتمدًا أولًا.")}
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <label style={{ fontSize: 13 }}>Language<select value={lang} onChange={(e) => setLang(e.target.value as IntegrationLanguage)} style={{ display: "block", width: "100%", marginTop: 8, padding: "11px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 10, fontFamily: "inherit" }}>{languages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label style={{ fontSize: 13 }}>Framework<select value={framework} onChange={(e) => setFramework(e.target.value)} style={{ display: "block", width: "100%", marginTop: 8, padding: "11px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 10, fontFamily: "inherit" }}>{availableFrameworks.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>

      {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
      <button onClick={generate} disabled={needsTemplate && !selected} style={{ width: "fit-content", padding: "10px 16px", border: "1px solid", borderColor: needsTemplate && !selected ? "rgba(255,255,255,0.08)" : "rgba(32,211,120,0.35)", borderRadius: 10, background: needsTemplate && !selected ? "rgba(255,255,255,0.08)" : "rgba(32,211,120,0.1)", color: needsTemplate && !selected ? "rgba(255,255,255,0.35)" : "#20d378", fontFamily: "inherit", cursor: "pointer" }}>Generate code</button>
    </section>

    {code && <section style={{ marginTop: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}><strong>Generated integration</strong><CopyButton value={code} /></div>
      <pre style={{ margin: 0, padding: 18, overflowX: "auto", lineHeight: 1.6, color: "rgba(255,255,255,0.75)", background: "rgba(0,0,0,0.18)", fontFamily: "'Fira Code', monospace", fontSize: 12 }}><code>{code}</code></pre>
      <div style={{ padding: 18, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontSize: 12 }}>
        <strong style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>Next steps</strong>
        <div>1. Configure <code>WANI_API_KEY</code> in your server environment.</div>
        <div>2. Add the generated server-side code.</div>
        <div>3. Connect it to your phone/login form.</div>
        <div>4. Test Send OTP, then Verify OTP.</div>
        <div style={{ marginTop: 10, color: "#f59e0b" }}>Never expose the Wani API key or Meta credentials in browser code.</div>
      </div>
    </section>}
  </main>;
}
