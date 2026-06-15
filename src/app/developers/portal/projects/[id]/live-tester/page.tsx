"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../../../_components/LanguageProvider";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "send" | "verify" | "status";
type ReqStatus = "idle" | "loading" | "success" | "error";

interface LogEntry {
  id: string;
  step: Step;
  method: string;
  endpoint: string;
  requestBody: object | null;
  responseBody: object;
  status: number;
  durationMs: number;
  timestamp: Date;
}

// ─── Syntax highlight JSON ────────────────────────────────────────────────────
function JsonView({ data, indent = 2 }: { data: object; indent?: number }) {
  const lines = JSON.stringify(data, null, indent).split("\n");
  return (
    <pre style={{ margin: 0, fontFamily: "'Fira Code', monospace", fontSize: 12, lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        const isKey   = /"[^"]+":/.test(line) && !/":\s*"/.test(line.split(":")[0] + ":");
        const isStr   = /:\s*"/.test(line);
        const isNum   = /:\s*\d/.test(line);
        const isBool  = /:\s*(true|false)/.test(line);
        const isNull  = /:\s*null/.test(line);
        const isGreen = /("ok"|"verified"):\s*true/.test(line);
        const isRed   = /("ok"|"verified"):\s*false/.test(line) || /"error":/.test(line);

        let color = "rgba(255,255,255,0.8)";
        if (isGreen) color = "#20d378";
        else if (isRed) color = "#f87171";
        else if (isStr) color = "#86efac";
        else if (isNum) color = "#93c5fd";
        else if (isBool || isNull) color = "#f9a8d4";

        return (
          <span key={i} style={{ color, display: "block" }}>{line}</span>
        );
      })}
    </pre>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ code }: { code: number }) {
  const color = code >= 200 && code < 300 ? "#20d378" : code === 401 || code === 429 ? "#f59e0b" : "#f87171";
  const bg    = code >= 200 && code < 300 ? "rgba(32,211,120,0.1)" : code === 401 || code === 429 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, background: bg, color, fontSize: 12, fontWeight: 600, fontFamily: "Fira Code, monospace" }}>
      {code}
    </span>
  );
}

// ─── OTP Code Input ───────────────────────────────────────────────────────────
function OtpCodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const digits = value.split("");
    digits[idx] = val.slice(-1);
    const next = digits.join("").padEnd(6, "").slice(0, 6);
    onChange(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", direction: "ltr" }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          value={value[i] || ""}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          maxLength={1}
          inputMode="numeric"
          style={{
            width: 44, height: 52, textAlign: "center",
            background: value[i] ? "rgba(32,211,120,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${value[i] ? "rgba(32,211,120,0.35)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, color: "#fff", fontSize: 20, fontWeight: 700,
            fontFamily: "Fira Code, monospace", outline: "none",
            transition: "all .2s",
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
export default function LiveTesterPage() {
  const { language, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Form state
  const [apiKey, setApiKey]           = useState("");
  const [phone, setPhone]             = useState("");
  const [templateName, setTemplateName] = useState("otp_verification");
  const [expiryMins, setExpiryMins]   = useState(10);
  const [otpCode, setOtpCode]         = useState("");
  const [token, setToken]             = useState("");

  // UI state
  const [step, setStep]       = useState<Step>("send");
  const [reqStatus, setReqStatus] = useState<ReqStatus>("idle");
  const [lastLog, setLastLog] = useState<LogEntry | null>(null);
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const tick = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(secs);
      if (secs === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [expiresAt]);

  // ── API call helper ─────────────────────────────────────────────────────
  async function callApi(opts: {
    method: string;
    endpoint: string;
    body?: object;
    step: Step;
  }): Promise<{ ok: boolean; data: any }> {
    setReqStatus("loading");
    const t0 = performance.now();

    try {
      const res = await fetch(opts.endpoint, {
        method: opts.method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });

      const data = await res.json();
      const duration = Math.round(performance.now() - t0);

      const entry: LogEntry = {
        id:           crypto.randomUUID(),
        step:         opts.step,
        method:       opts.method,
        endpoint:     opts.endpoint,
        requestBody:  opts.body ?? null,
        responseBody: data,
        status:       res.status,
        durationMs:   duration,
        timestamp:    new Date(),
      };

      setLastLog(entry);
      setLogs(prev => [entry, ...prev].slice(0, 10));
      setReqStatus(res.ok ? "success" : "error");
      return { ok: res.ok, data };
    } catch (err: any) {
      const entry: LogEntry = {
        id:           crypto.randomUUID(),
        step:         opts.step,
        method:       opts.method,
        endpoint:     opts.endpoint,
        requestBody:  opts.body ?? null,
        responseBody: { ok: false, error: err.message },
        status:       0,
        durationMs:   Math.round(performance.now() - t0),
        timestamp:    new Date(),
      };
      setLastLog(entry);
      setLogs(prev => [entry, ...prev].slice(0, 10));
      setReqStatus("error");
      return { ok: false, data: { error: err.message } };
    }
  }

  // ── Step 1: Send OTP ────────────────────────────────────────────────────
  async function handleSend() {
    if (!apiKey.trim()) { alert(t("Please enter your API Key first", "أدخل الـ API Key أولاً")); return; }
    if (!phone.trim())  { alert(t("Please enter the phone number", "أدخل رقم الهاتف")); return; }

    const { ok, data } = await callApi({
      step: "send",
      method: "POST",
      endpoint: "/api/developers/otp/send",
      body: { phone: phone.trim(), templateName: templateName.trim(), expiryMinutes: expiryMins },
    });

    if (ok && data.token) {
      setToken(data.token);
      setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null);
      setStep("verify");
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────
  async function handleVerify() {
    if (otpCode.replace(/\s/g, "").length < 6) { alert(t("Please enter the 6-digit code", "أدخل الكود المكون من 6 أرقام")); return; }

    const { ok } = await callApi({
      step: "verify",
      method: "POST",
      endpoint: "/api/developers/otp/verify",
      body: { token, code: otpCode.trim() },
    });

    if (ok) setStep("status");
  }

  // ── Step 3: Check Status ────────────────────────────────────────────────
  async function handleStatus() {
    await callApi({
      step: "status",
      method: "GET",
      endpoint: `/api/developers/otp/status/${token}`,
    });
  }

  // ── Reset ───────────────────────────────────────────────────────────────
  function reset() {
    setStep("send"); setToken(""); setOtpCode("");
    setExpiresAt(null); setCountdown(0);
    setLastLog(null); setReqStatus("idle");
  }

  const stepLabels: Record<Step, string> = {
    send:   t("1. Send OTP", "① إرسال OTP"),
    verify: t("2. Verify Code", "② التحقق من الكود"),
    status: t("3. Check Status", "③ فحص الحالة"),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .lt-root { min-height:100vh; background:#060810; font-family:'IBM Plex Sans Arabic',sans-serif; direction:${language === 'ar' ? 'rtl' : 'ltr'}; color:#fff; }
        .lt-root::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(32,211,120,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(32,211,120,0.025) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; z-index:0; }
        .lt-inner { max-width:1200px; margin:0 auto; padding:40px 32px; position:relative; z-index:1; opacity:0; transform:translateY(10px); transition:opacity .4s,transform .4s; }
        .lt-inner.visible { opacity:1; transform:translateY(0); }

        .lt-header { margin-bottom:32px; }
        .lt-title { font-size:26px; font-weight:600; }
        .lt-subtitle { font-size:14px; color:rgba(255,255,255,0.4); margin-top:4px; }

        /* Steps indicator */
        .steps-row { display:flex; align-items:center; gap:0; margin-bottom:32px; }
        .step-item { display:flex; align-items:center; gap:10px; }
        .step-circle {
          width:32px; height:32px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:700; flex-shrink:0;
          border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.04);
          color:rgba(255,255,255,0.3);
          transition:all .3s;
        }
        .step-circle.active { background:rgba(32,211,120,0.15); border-color:rgba(32,211,120,0.4); color:#20d378; }
        .step-circle.done   { background:#20d378; border-color:#20d378; color:#060810; }
        .step-label { font-size:13px; color:rgba(255,255,255,0.4); transition:color .3s; white-space:nowrap; }
        .step-label.active { color:#fff; }
        .step-line { flex:1; height:1px; background:rgba(255,255,255,0.08); margin:0 16px; min-width:32px; }

        /* Layout */
        .lt-layout { display:grid; grid-template-columns:400px 1fr; gap:24px; align-items:start; }

        /* Left panel — form */
        .form-panel { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:28px; }
        .panel-title { font-size:15px; font-weight:600; margin-bottom:20px; display:flex; align-items:center; gap:8px; }
        .panel-title-dot { width:8px; height:8px; border-radius:50%; background:#20d378; }

        .field { margin-bottom:16px; }
        .field-label { display:block; font-size:12px; font-weight:500; color:rgba(255,255,255,0.5); margin-bottom:7px; }
        .f-input,.f-select {
          width:100%; padding:11px 14px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.09);
          border-radius:11px; color:#fff;
          font-size:13px; font-family:'IBM Plex Sans Arabic',sans-serif;
          outline:none; box-sizing:border-box;
          transition:border-color .2s,box-shadow .2s;
        }
        .f-input.mono { font-family:'Fira Code',monospace; direction:ltr; text-align:left; font-size:12px; }
        .f-input::placeholder { color:rgba(255,255,255,0.2); }
        .f-input:focus,.f-select:focus { border-color:rgba(32,211,120,0.4); box-shadow:0 0 0 3px rgba(32,211,120,0.07); }
        .f-select { appearance:none; cursor:pointer; }
        .f-select option { background:#1a2333; }

        /* Token display */
        .token-box {
          background:rgba(32,211,120,0.05); border:1px solid rgba(32,211,120,0.15);
          border-radius:11px; padding:12px 14px; font-family:'Fira Code',monospace;
          font-size:11px; color:rgba(32,211,120,0.8); word-break:break-all;
          direction:ltr; text-align:left; line-height:1.5;
        }
        .countdown { font-size:12px; color:rgba(255,255,255,0.4); margin-top:8px; text-align:center; }
        .countdown.urgent { color:#f87171; }

        /* Action buttons */
        .btn-send {
          width:100%; padding:13px; background:#20d378; color:#060810;
          border:none; border-radius:12px; font-size:14px; font-weight:600;
          font-family:inherit; cursor:pointer; display:flex; align-items:center;
          justify-content:center; gap:8px; transition:background .2s;
          margin-top:20px;
        }
        .btn-send:hover:not(:disabled) { background:#1bbf6b; }
        .btn-send:disabled { opacity:.5; cursor:not-allowed; }
        .btn-secondary {
          width:100%; padding:11px; background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.1); border-radius:12px;
          font-size:13px; color:rgba(255,255,255,0.6); font-family:inherit;
          cursor:pointer; transition:all .2s; margin-top:10px;
        }
        .btn-secondary:hover { background:rgba(255,255,255,0.08); color:#fff; }

        .spinner { width:16px; height:16px; border:2px solid rgba(6,8,16,0.3); border-top-color:#060810; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* Right panel — response */
        .response-panel { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:20px; overflow:hidden; }

        .response-header {
          padding:14px 20px; border-bottom:1px solid rgba(255,255,255,0.06);
          display:flex; align-items:center; justify-content:space-between;
          background:rgba(255,255,255,0.02);
        }
        .response-method { font-family:'Fira Code',monospace; font-size:12px; font-weight:700; }
        .method-post { color:#f59e0b; }
        .method-get  { color:#38bdf8; }
        .response-url { font-family:'Fira Code',monospace; font-size:12px; color:rgba(255,255,255,0.5); direction:ltr; }
        .response-meta { display:flex; align-items:center; gap:10px; }
        .duration-tag { font-size:11px; color:rgba(255,255,255,0.3); font-family:'Fira Code',monospace; }

        .response-body { padding:20px; min-height:200px; }

        .request-section { padding:0 20px 20px; border-top:1px solid rgba(255,255,255,0.04); }
        .section-label { font-size:10px; font-weight:600; color:rgba(255,255,255,0.25); text-transform:uppercase; letter-spacing:.8px; margin:16px 0 10px; }

        /* Idle placeholder */
        .idle-placeholder {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          min-height:300px; color:rgba(255,255,255,0.2); text-align:center; padding:32px;
        }
        .idle-icon { font-size:48px; margin-bottom:16px; opacity:.4; }

        /* History */
        .history-panel { margin-top:24px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:16px; overflow:hidden; }
        .history-header { padding:14px 20px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px; font-weight:600; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:.5px; }
        .history-item { padding:12px 20px; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; align-items:center; gap:12px; cursor:pointer; transition:background .15s; }
        .history-item:hover { background:rgba(255,255,255,0.03); }
        .history-item:last-child { border-bottom:none; }
        .history-step { font-size:11px; font-family:'Fira Code',monospace; color:rgba(255,255,255,0.5); min-width:60px; }
        .history-endpoint { font-size:12px; font-family:'Fira Code',monospace; color:rgba(255,255,255,0.6); flex:1; direction:ltr; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .history-time { font-size:11px; color:rgba(255,255,255,0.25); }

        /* divider */
        .divider { height:1px; background:rgba(255,255,255,0.06); margin:16px 0; }

        @media(max-width:900px) {
          .lt-layout { grid-template-columns:1fr; }
          .steps-row { flex-wrap:wrap; gap:8px; }
          .step-line { display:none; }
        }
        @media(max-width:640px) {
          .lt-inner { padding:20px 16px; }
          .form-panel,.response-panel { border-radius:14px; padding:20px; }
        }
      `}</style>

      <div className="lt-root">
        <div className={`lt-inner ${mounted ? "visible" : ""}`}>

          <div className="lt-header" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
            <h1 className="lt-title">Live Tester</h1>
            <p className="lt-subtitle">{t("Test the OTP API directly from the portal — without Postman or curl", "جرب الـ OTP API مباشرة من البورتال — بدون Postman أو curl")}</p>
          </div>

          {/* Steps indicator */}
          <div className="steps-row" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
            {(["send", "verify", "status"] as Step[]).map((s, i) => {
              const done   = (step === "verify" && i === 0) || (step === "status" && i <= 1);
              const active = step === s;
              return (
                <div key={s} className="step-item" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                  {i > 0 && <div className="step-line" />}
                  <div className={`step-circle ${done ? "done" : active ? "active" : ""}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`step-label ${active ? "active" : ""}`}>{stepLabels[s]}</span>
                </div>
              );
            })}
          </div>

          <div className="lt-layout">
            {/* ── Left: Form ────────────────────────────────────────────── */}
            <div>
              <div className="form-panel" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                {/* API Key — always visible */}
                <div className="field">
                  <label className="field-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>🔑 API Key</label>
                  <input className="f-input mono" placeholder="wani_live_xxxxxxxxx"
                    value={apiKey} onChange={e => setApiKey(e.target.value)} />
                </div>

                <div className="divider" />

                {/* Step: SEND */}
                {step === "send" && (
                  <>
                    <div className="panel-title" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                      <div className="panel-title-dot" />
                      <span>{t("Send OTP", "إرسال OTP")}</span>
                    </div>
                    <div className="field">
                      <label className="field-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Phone Number", "رقم الهاتف")}</label>
                      <input className="f-input mono" placeholder={t("01xxxxxxxxx or +20xxxxxxxxx", "01xxxxxxxxx أو +20xxxxxxxxx")}
                        value={phone} onChange={e => setPhone(e.target.value)} style={{ textAlign: language === 'ar' ? 'right' : 'left' }} />
                    </div>
                    <div className="field">
                      <label className="field-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Template Name (templateName)", "اسم القالب (templateName)")}</label>
                      <input className="f-input mono" placeholder="otp_verification"
                        value={templateName} onChange={e => setTemplateName(e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Expiry Time (Minutes)", "مدة الصلاحية (دقائق)")}</label>
                      <select className="f-select" value={expiryMins} onChange={e => setExpiryMins(Number(e.target.value))} style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                        {[5, 10, 15, 30].map(m => <option key={m} value={m}>{t(`${m} minutes`, `${m} دقيقة`)}</option>)}
                      </select>
                    </div>
                    <button className="btn-send" onClick={handleSend} disabled={reqStatus === "loading"}>
                      {reqStatus === "loading" ? <><div className="spinner" />{t("Sending...", "جاري الإرسال...")}</> : <>{t("🚀 Send OTP", "🚀 إرسال OTP")}</>}
                    </button>
                  </>
                )}

                {/* Step: VERIFY */}
                {step === "verify" && (
                  <>
                    <div className="panel-title" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                      <div className="panel-title-dot" />
                      <span>{t("Verify Code", "التحقق من الكود")}</span>
                    </div>

                    <div className="field">
                      <label className="field-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Token (from response)", "الـ Token (من الـ response)")}</label>
                      <div className="token-box">{token || "—"}</div>
                      {expiresAt && (
                        <div className={`countdown ${countdown < 60 ? "urgent" : ""}`}>
                          {t("⏱ Expires in: ", "⏱ الصلاحية تنتهي بعد: ")}{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                        </div>
                      )}
                    </div>

                    <div className="field" style={{ marginTop: 20 }}>
                      <label className="field-label" style={{ textAlign: "center", display: "block", marginBottom: 14 }}>{t("Code sent on WhatsApp", "الكود المرسل على WhatsApp")}</label>
                      <OtpCodeInput value={otpCode} onChange={setOtpCode} />
                    </div>

                    <button className="btn-send" style={{ marginTop: 20 }}
                      onClick={handleVerify} disabled={reqStatus === "loading" || otpCode.length < 6}>
                      {reqStatus === "loading" ? <><div className="spinner" />{t("Verifying...", "جاري التحقق...")}</> : <>{t("✅ Verify Code", "✅ تحقق من الكود")}</>}
                    </button>
                    <button className="btn-secondary" onClick={reset}>{t("🔄 Send new code", "🔄 إرسال كود جديد")}</button>
                  </>
                )}

                {/* Step: STATUS */}
                {step === "status" && (
                  <>
                    <div className="panel-title" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                      <div className="panel-title-dot" />
                      <span>{t("Check Status", "فحص الحالة")}</span>
                    </div>
                    <div className="field">
                      <label className="field-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>Token</label>
                      <div className="token-box">{token}</div>
                    </div>
                    <button className="btn-send" onClick={handleStatus} disabled={reqStatus === "loading"}>
                      {reqStatus === "loading" ? <><div className="spinner" />{t("Checking...", "جاري الفحص...")}</> : <>{t("🔍 Check Status", "🔍 فحص الحالة")}</>}
                    </button>
                    <button className="btn-secondary" onClick={reset}>{t("🔄 New Test", "🔄 تجربة جديدة")}</button>
                  </>
                )}
              </div>
            </div>

            {/* ── Right: Response ──────────────────────────────────────── */}
            <div>
              <div className="response-panel" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                {lastLog ? (
                  <>
                    {/* Response header bar */}
                    <div className="response-header" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                        <span className={`response-method ${lastLog.method === "POST" ? "method-post" : "method-get"}`}>
                          {lastLog.method}
                        </span>
                        <span className="response-url">
                          {lastLog.endpoint.replace("/api/developers/otp/status/", "/api/developers/otp/status/[token]")}
                        </span>
                      </div>
                      <div className="response-meta" style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                        <StatusBadge code={lastLog.status} />
                        <span className="duration-tag">{lastLog.durationMs}ms</span>
                      </div>
                    </div>

                    {/* Response body */}
                    <div className="response-body">
                      <div className="section-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>Response Body</div>
                      <JsonView data={lastLog.responseBody} />
                    </div>

                    {/* Request body */}
                    {lastLog.requestBody && (
                      <div className="request-section">
                        <div className="section-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>Request Body</div>
                        <JsonView data={lastLog.requestBody} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="idle-placeholder">
                    <div className="idle-icon">⚡</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                      {t("Response will appear here", "الـ Response هيظهر هنا")}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
                      {t("Enter API Key and click Send OTP", "أدخل الـ API Key واضغط إرسال OTP")}
                    </div>
                  </div>
                )}
              </div>

              {/* Request history */}
              {logs.length > 0 && (
                <div className="history-panel" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                  <div className="history-header">{t(`Request History (${logs.length})`, `سجل الطلبات (${logs.length})`)}</div>
                  {logs.map(log => (
                    <div key={log.id} className="history-item" onClick={() => setLastLog(log)} style={{ flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
                      <span className={`response-method history-step ${log.method === "POST" ? "method-post" : "method-get"}`}>
                        {log.method}
                      </span>
                      <span className="history-endpoint">
                        {log.endpoint.replace("/api/developers/otp/status/", "/otp/status/")}
                      </span>
                      <StatusBadge code={log.status} />
                      <span className="duration-tag">{log.durationMs}ms</span>
                      <span className="history-time">
                        {log.timestamp.toLocaleTimeString(language === 'ar' ? "ar-EG" : "en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}