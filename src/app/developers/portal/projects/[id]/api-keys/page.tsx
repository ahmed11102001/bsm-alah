"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";

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

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/developers/projects/${projectId}/api-keys`);
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setError("مش قادر أجيب الـ API Keys");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

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
      if (!res.ok) { setError(data.error || "حصل خطأ"); return; }
      setGeneratedKey(data.key.fullKey);
      setNewKeyName("");
      fetchKeys();
    } catch {
      setError("حصل خطأ في الاتصال");
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("متأكد؟ المفتاح ده مش هيعمل تاني.")) return;
    try {
      const res = await fetch(
        `/api/developers/projects/${projectId}/api-keys?keyId=${id}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchKeys();
      else setError("مش قادر أحذف المفتاح");
    } catch {
      setError("حصل خطأ");
    }
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeKeys = keys.filter((k) => k.status === "ACTIVE");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px", direction: "rtl", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 6 }}>API Keys</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          كل مفتاح خاص بالمشروع ده بس — استخدمه في الـ{" "}
          <code style={{ fontFamily: "Fira Code, monospace", color: "#20d378", fontSize: 12 }}>x-api-key</code>{" "}
          header
        </p>
      </div>

      {/* Generate */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>
          <Plus size={15} style={{ color: "#20d378" }} />
          مفتاح جديد
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="اسم المفتاح (اختياري) — مثلاً: Production Server"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
            onKeyDown={(e) => e.key === "Enter" && generateKey()}
          />
          <button
            onClick={generateKey}
            disabled={activeKeys.length >= 5}
            style={{ padding: "10px 20px", borderRadius: 10, background: "#20d378", color: "#060810", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: activeKeys.length >= 5 ? 0.4 : 1, fontFamily: "inherit" }}
          >
            إنشاء
          </button>
        </div>
        {activeKeys.length >= 5 && (
          <p style={{ color: "#f59e0b", fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} /> وصلت للحد الأقصى (5 مفاتيح نشطة). احذف واحد الأول.
          </p>
        )}
        {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>

      {/* Generated key alert */}
      {generatedKey && (
        <div style={{ background: "rgba(32,211,120,0.08)", border: "1px solid rgba(32,211,120,0.2)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#20d378", fontSize: 14, fontWeight: 600 }}>
            <AlertTriangle size={15} />
            احفظ المفتاح ده — مش هتشوفه تاني!
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <code style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)", fontSize: 12, fontFamily: "Fira Code, monospace", color: "#fff", wordBreak: "break-all" }}>
              {showKey ? generatedKey : generatedKey.slice(0, 22) + "••••••••••••••••"}
            </code>
            <button onClick={() => setShowKey((v) => !v)} style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button onClick={() => copyKey(generatedKey)} style={{ padding: 8, borderRadius: 8, background: "rgba(32,211,120,0.15)", border: "none", cursor: "pointer", color: "#20d378" }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <button onClick={() => setGeneratedKey(null)} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "inherit" }}>
            فهمت، أقفل ✕
          </button>
        </div>
      )}

      {/* Keys list */}
      <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        المفاتيح ({keys.length})
      </div>

      {keys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)" }}>
          <Key size={32} style={{ opacity: 0.3, margin: "0 auto 12px" }} />
          <p>مفيش API Keys لسه — أنشئ واحد من فوق</p>
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
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: key.status === "ACTIVE" ? "#20d378" : "#ef4444", flexShrink: 0 }} />
              <div>
                <code style={{ fontSize: 13, fontFamily: "Fira Code, monospace", color: "#fff" }}>
                  {key.keyPrefix}_••••••••
                </code>
                {key.name && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{key.name}</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                {new Date(key.createdAt).toLocaleDateString("ar-EG")}
              </span>
              {key.status === "ACTIVE" ? (
                <button
                  onClick={() => revokeKey(key.id)}
                  style={{ padding: 7, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}
                  title="إلغاء المفتاح"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  <Trash2 size={15} />
                </button>
              ) : (
                <span style={{ fontSize: 11, color: "rgba(239,68,68,0.6)", padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)" }}>
                  ملغي
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}