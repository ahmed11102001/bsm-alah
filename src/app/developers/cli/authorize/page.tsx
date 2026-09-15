"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TerminalSquare, ShieldCheck, X, Check, Loader2 } from "lucide-react";
import { useLanguage } from "../../_components/LanguageProvider";

type Phase = "enter" | "review" | "done";

interface LookupResult {
  status: string;
  device_name: string | null;
  expires_at: string;
  created_at: string;
}

export default function CliAuthorizePage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const isAr = language === "ar";

  const [phase, setPhase] = useState<Phase>("enter");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<LookupResult | null>(null);
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const [lookupRes, meRes] = await Promise.all([
        fetch("/api/developers/cli/authorize/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_code: code }),
        }),
        fetch("/api/developers/auth/me"),
      ]);
      const data = await lookupRes.json();
      if (!lookupRes.ok) {
        setError(data.error || t("Invalid code", "رمز غير صالح"));
        return;
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        setMe({ email: meData.developer?.email ?? "" });
      }
      setInfo(data);
      setPhase("review");
    } catch {
      setError(t("Connection error", "مشكلة في الاتصال"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDecision(decision: "allow" | "deny") {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/developers/cli/authorize/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_code: code, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("Something went wrong", "حصل خطأ"));
        return;
      }
      if (decision === "deny") {
        router.back();
        return;
      }
      setPhase("done");
    } catch {
      setError(t("Connection error", "مشكلة في الاتصال"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{`
        .cliauth-root {
          min-height: 100vh; background: #060810; color: #fff;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${isAr ? "rtl" : "ltr"};
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .cliauth-card {
          width: 100%; max-width: 460px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 32px;
          text-align: ${isAr ? "right" : "left"};
        }
        .cliauth-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(32,211,120,0.1); border: 1px solid rgba(32,211,120,0.2);
          color: #20d378; display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .cliauth-title { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
        .cliauth-desc { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.7; margin-bottom: 20px; }
        .cliauth-label { display: block; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
        .cliauth-input {
          width: 100%; padding: 12px 16px; box-sizing: border-box;
          background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #fff; font-size: 15px; font-family: 'Fira Code', monospace;
          letter-spacing: 2px; text-align: center; direction: ltr; outline: none;
        }
        .cliauth-input:focus { border-color: rgba(32,211,120,0.5); }
        .cliauth-btn {
          width: 100%; padding: 12px; margin-top: 16px; border: none; border-radius: 10px;
          background: #20d378; color: #060810; font-size: 14px; font-weight: 600;
          font-family: inherit; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
        }
        .cliauth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cliauth-btn-ghost {
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.65);
          border: 1px solid rgba(255,255,255,0.1); margin-top: 10px;
        }
        .cliauth-error {
          margin-top: 14px; font-size: 12px; color: #f87171;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px; padding: 9px 12px; line-height: 1.7;
        }
        .cliauth-me {
          margin-bottom: 16px; font-size: 12.5px; color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 10px 14px; direction: ltr; text-align: left;
        }
        .cliauth-perms { list-style: none; margin: 0 0 8px; padding: 0; }
        .cliauth-perms li {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: rgba(255,255,255,0.7); padding: 6px 0;
        }
        .cliauth-perms svg { color: #20d378; flex-shrink: 0; }
        .cliauth-done-icon {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(32,211,120,0.12); border: 1px solid rgba(32,211,120,0.3);
          color: #20d378; display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="cliauth-root">
        <div className="cliauth-card">
          <div className="cliauth-icon"><TerminalSquare size={20} /></div>
          <h1 className="cliauth-title">Wani CLI</h1>
          <p className="cliauth-desc">
            {t("Connect your terminal to your Wani account.", "اربط الطرفية بحساب Wani الخاص بك.")}
          </p>

          {phase === "enter" && (
            <form onSubmit={handleLookup}>
              <label className="cliauth-label">
                {t("Enter the code shown in your terminal", "أدخل الرمز الظاهر في الطرفية")}
              </label>
              <input
                className="cliauth-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="XXXX-XXXX"
                maxLength={9}
                autoComplete="off"
              />
              <button className="cliauth-btn" type="submit" disabled={busy || !code.trim()}>
                {busy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {t("Continue", "متابعة")}
              </button>
              {error && <div className="cliauth-error">{error}</div>}
            </form>
          )}

          {phase === "review" && info && (
            <>
              {me?.email && (
                <div className="cliauth-me">
                  {t("Signed in as:", "مسجل الدخول باسم:")} <strong>{me.email}</strong>
                </div>
              )}
              <p className="cliauth-desc" style={{ marginBottom: 12 }}>
                {t("The Wani CLI will be able to:", "سيتمكن Wani CLI من:")}
              </p>
              <ul className="cliauth-perms">
                <li><Check size={14} />{t("Access your Wani developer account", "الوصول إلى حساب المطور الخاص بك")}</li>
                <li><Check size={14} />{t("List your projects", "عرض مشاريعك")}</li>
                <li><Check size={14} />{t("Select projects available to your account", "اختيار المشاريع المتاحة لحسابك")}</li>
              </ul>
              {info.device_name && (
                <p className="cliauth-desc" style={{ fontSize: 12 }}>
                  {t("Device:", "الجهاز:")} {info.device_name}
                </p>
              )}
              <button className="cliauth-btn" onClick={() => handleDecision("allow")} disabled={busy}>
                <ShieldCheck size={15} /> {t("Allow access", "السماح بالوصول")}
              </button>
              <button className="cliauth-btn cliauth-btn-ghost" onClick={() => handleDecision("deny")} disabled={busy}>
                <X size={15} /> {t("Cancel", "إلغاء")}
              </button>
              {error && <div className="cliauth-error">{error}</div>}
            </>
          )}

          {phase === "done" && (
            <>
              <div className="cliauth-done-icon"><Check size={24} /></div>
              <p className="cliauth-desc">
                {t(
                  "Access granted. You can return to your terminal — it will continue automatically.",
                  "تم منح الوصول. يمكنك العودة إلى الطرفية — ستكمل تلقائيًا."
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
