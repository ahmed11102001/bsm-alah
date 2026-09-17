"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useLanguage } from "../../../../_components/LanguageProvider";
import PortalLoader from "../../../_components/PortalLoader";

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string | null;
  status: "ACTIVE" | "REVOKED";
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export default function ProjectApiKeysPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { language, t } = useLanguage();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  // نسخ مفتاح موجود بعد تأكيد الباسورد
  const [revealKeyId, setRevealKeyId] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState("");
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/api-keys`);
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setError(t("Unable to fetch API Keys", "مش قادر أجيب الـ API Keys"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function generateKey() {
    setError("");
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("An error occurred", "حصل خطأ")); return; }
      setGeneratedKey(data.key.fullKey);
      setNewKeyName("");
      fetchKeys();
    } catch {
      setError(t("Connection error occurred", "حصل خطأ في الاتصال"));
    }
  }

  async function revokeKey(id: string) {
    if (!confirm(t("Are you sure? This key will no longer function.", "متأكد؟ المفتاح ده مش هيعمل تاني."))) return;
    try {
      const res = await fetch(
        `/api/developers/projects/${projectId}/api-keys?keyId=${id}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchKeys();
      else setError(t("Unable to revoke key", "مش قادر أحذف المفتاح"));
    } catch {
      setError(t("An error occurred", "حصل خطأ"));
    }
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openReveal(keyId: string) {
    setRevealKeyId(keyId);
    setRevealPassword("");
    setRevealError("");
  }

  async function confirmRevealAndCopy() {
    if (!revealKeyId || !revealPassword || revealLoading) return;
    setRevealLoading(true);
    setRevealError("");
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/api-keys/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: revealKeyId, password: revealPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRevealError(data.error || t("An error occurred", "حصل خطأ"));
        return;
      }
      await navigator.clipboard.writeText(data.fullKey);
      setCopiedId(revealKeyId);
      setTimeout(() => setCopiedId(null), 2000);
      setRevealKeyId(null);
      setRevealPassword("");
    } catch {
      setRevealError(t("Connection error occurred", "حصل خطأ في الاتصال"));
    } finally {
      setRevealLoading(false);
    }
  }

  if (loading) {
    return <PortalLoader label={t("Loading...", "جاري التحميل...")} />;
  }

  const activeKeys = keys.filter((k) => k.status === "ACTIVE");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(20px, 5vw, 32px) clamp(16px, 4vw, 24px)", direction: language === 'ar' ? "rtl" : "ltr", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: language === 'ar' ? 'right' : 'left' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 6 }}>API Keys</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {t("Each key is specific to this project only — use it in the", "كل مفتاح خاص بالمشروع ده بس — استخدمه في الـ")}{" "}
          <code style={{ fontFamily: "Fira Code, monospace", color: "#20d378", fontSize: 12 }}>x-api-key</code>{" "}
          {t("header", "header")}
        </p>
      </div>

      {/* Generate */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
          <Plus size={15} style={{ color: "#20d378" }} />
          <span>{t("New Key", "مفتاح جديد")}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder={t("Key name (optional) — e.g. Production Server", "اسم المفتاح (اختياري) — مثلاً: Production Server")}
            style={{ flex: "1 1 160px", minWidth: 0, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", textAlign: language === 'ar' ? 'right' : 'left' }}
            onKeyDown={(e) => e.key === "Enter" && generateKey()}
          />
          <button
            onClick={generateKey}
            disabled={activeKeys.length >= 5}
            style={{ padding: "10px 20px", borderRadius: 10, background: "#20d378", color: "#060810", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: activeKeys.length >= 5 ? 0.4 : 1, fontFamily: "inherit", flexShrink: 0 }}
          >
            {t("Create", "إنشاء")}
          </button>
        </div>
        {activeKeys.length >= 5 && (
          <p style={{ color: "#f59e0b", fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
            <AlertTriangle size={13} /> {t("You have reached the maximum limit (5 active keys). Revoke one first.", "وصلت للحد الأقصى (5 مفاتيح نشطة). احذف واحد الأول.")}
          </p>
        )}
        {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8, textAlign: language === 'ar' ? 'right' : 'left' }}>{error}</p>}
      </div>

      {/* Generated key alert */}
      {generatedKey && (
        <div style={{ background: "rgba(32,211,120,0.08)", border: "1px solid rgba(32,211,120,0.2)", borderRadius: 14, padding: 20, marginBottom: 20, textAlign: language === 'ar' ? 'right' : 'left' }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#20d378", fontSize: 14, fontWeight: 600, flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
            <Key size={15} />
            <span>{t("Your new key is ready", "مفتاحك الجديد جاهز")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
            <code style={{ flex: "1 1 160px", minWidth: 0, padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)", fontSize: 12, fontFamily: "Fira Code, monospace", color: "#fff", wordBreak: "break-all" }}>
              {showKey ? generatedKey : generatedKey.slice(0, 22) + "••••••••••••••••"}
            </code>
            <button onClick={() => setShowKey((v) => !v)} style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button onClick={() => copyKey(generatedKey)} style={{ padding: 8, borderRadius: 8, background: "rgba(32,211,120,0.15)", border: "none", cursor: "pointer", color: "#20d378", flexShrink: 0 }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 12, lineHeight: 1.7 }}>
            {t("You can copy any key anytime from the list below after confirming your password.", "تقدر تنسخ أي مفتاح في أي وقت من القائمة تحت بعد تأكيد الباسورد.")}
          </div>
          <button onClick={() => setGeneratedKey(null)} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "inherit" }}>
            {t("Understood, close ✕", "فهمت، أقفل ✕")}
          </button>
        </div>
      )}

      {/* Keys list */}
      <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: language === 'ar' ? 'right' : 'left' }}>
        {t(`Keys (${keys.length})`, `المفاتيح (${keys.length})`)}
      </div>

      {keys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)" }}>
          <Key size={32} style={{ opacity: 0.3, margin: "0 auto 12px" }} />
          <p>{t("No API Keys yet — create one from above", "مفيش API Keys لسه — أنشئ واحد من فوق")}</p>
        </div>
      ) : (
        keys.map((key) => (
          <div
            key={key.id}
            style={{
              background: key.status === "ACTIVE" ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
              border: `1px solid ${key.status === "ACTIVE" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}`,
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 8,
              opacity: key.status === "REVOKED" ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              rowGap: 10,
              columnGap: 12,
              flexDirection: language === 'ar' ? 'row' : 'row-reverse'
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: key.status === "ACTIVE" ? "#20d378" : "#ef4444", flexShrink: 0 }} />
              <div style={{ textAlign: language === 'ar' ? 'right' : 'left', minWidth: 0 }}>
                <code style={{ fontSize: 13, fontFamily: "Fira Code, monospace", color: "#fff", overflowWrap: "anywhere" }}>
                  {key.keyPrefix}_••••••••
                </code>
                {key.name && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, overflowWrap: "anywhere" }}>{key.name}</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                {new Date(key.createdAt).toLocaleDateString(language === 'ar' ? "ar-EG" : "en-US")}
              </span>
              {key.status === "ACTIVE" ? (
                <>
                  <button
                    onClick={() => openReveal(key.id)}
                    style={{ padding: 7, borderRadius: 8, background: "rgba(32,211,120,0.1)", border: "none", cursor: "pointer", color: "#20d378" }}
                    title={t("Copy full key", "نسخ المفتاح كامل")}
                  >
                    {copiedId === key.id ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <button
                    onClick={() => revokeKey(key.id)}
                    style={{ padding: 7, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}
                    title={t("Revoke key", "إلغاء المفتاح")}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 11, color: "rgba(239,68,68,0.6)", padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)" }}>
                  {t("Revoked", "ملغي")}
                </span>
              )}
            </div>
          </div>
        ))
      )}

      {/* Password confirm modal for copying a key */}
      {revealKeyId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => { if (!revealLoading) setRevealKeyId(null); }}
        >
          <div
            style={{ width: "100%", maxWidth: 400, background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, textAlign: language === 'ar' ? 'right' : 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
              {t("Confirm your password", "أكّد الباسورد")}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16, lineHeight: 1.7 }}>
              {t("Enter your account password to copy the full key.", "أدخل باسورد حسابك لنسخ المفتاح كامل.")}
            </p>
            <input
              type="password"
              value={revealPassword}
              onChange={(e) => { setRevealPassword(e.target.value); setRevealError(""); }}
              onKeyDown={(e) => e.key === "Enter" && confirmRevealAndCopy()}
              placeholder={t("Password", "الباسورد")}
              autoFocus
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            {revealError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{revealError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexDirection: language === 'ar' ? 'row' : 'row-reverse' }}>
              <button
                onClick={confirmRevealAndCopy}
                disabled={!revealPassword || revealLoading}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: "#20d378", color: "#060810", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", opacity: !revealPassword || revealLoading ? 0.5 : 1, fontFamily: "inherit" }}
              >
                {revealLoading ? t("Checking...", "جاري التحقق...") : t("Copy key", "نسخ المفتاح")}
              </button>
              <button
                onClick={() => setRevealKeyId(null)}
                disabled={revealLoading}
                style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                {t("Cancel", "إلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}