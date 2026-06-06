"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/developers/portal/api-keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setError("مش قادر أجيب الـ API Keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function generateKey() {
    setError("");
    try {
      const res = await fetch("/api/developers/portal/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حصل خطأ");
        return;
      }

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
      const res = await fetch(`/api/developers/portal/api-keys?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchKeys();
      } else {
        setError("مش قادر أحذف المفتاح");
      }
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">API Keys</h1>
        <p className="text-white/50">
          إدارة مفاتيح الـ API — كل مفتاح بيديك صلاحية الوصول للـ OTP API
        </p>
      </div>

      {/* Generate New Key */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Plus size={18} className="text-[#25D366]" />
          مفتاح جديد
        </h3>

        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="اسم المفتاح (اختياري) — مثلاً: Production Server"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#25D366]/50"
          />
          <button
            onClick={generateKey}
            disabled={keys.filter((k) => k.status === "ACTIVE").length >= 5}
            className="px-6 py-3 rounded-xl bg-[#25D366] text-black font-semibold hover:bg-[#1ea855] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            إنشاء
          </button>
        </div>

        {keys.filter((k) => k.status === "ACTIVE").length >= 5 && (
          <p className="text-amber-400/70 text-sm mt-2 flex items-center gap-1">
            <AlertTriangle size={14} />
            وصلت للحد الأقصى (5 مفاتيح). احذف واحد الأول.
          </p>
        )}

        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Generated Key Alert */}
      {generatedKey && (
        <div className="p-6 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-[#25D366]" />
            <h4 className="text-[#25D366] font-semibold">احفظ المفتاح ده — مش هتشوفه تاني!</h4>
          </div>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-4 py-3 rounded-xl bg-black/30 font-mono text-sm text-white break-all">
              {showKey ? generatedKey : generatedKey.slice(0, 20) + "••••••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2.5 rounded-xl bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={() => copyKey(generatedKey)}
              className="p-2.5 rounded-xl bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <button
            onClick={() => setGeneratedKey(null)}
            className="mt-3 text-white/50 text-sm hover:text-white transition-colors"
          >
            فهمت، أقفل
          </button>
        </div>
      )}

      {/* Keys List */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold">مفاتيحك ({keys.length})</h3>

        {keys.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <Key size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40">مفيش API Keys لسه</p>
            <p className="text-white/30 text-sm mt-1">اعمل مفتاح جديد من فوق</p>
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className={`p-4 rounded-xl border transition-all ${
                key.status === "ACTIVE"
                  ? "bg-white/[0.03] border-white/10 hover:border-white/20"
                  : "bg-white/[0.01] border-white/5 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      key.status === "ACTIVE" ? "bg-[#25D366]" : "bg-red-400"
                    }`}
                  />
                  <div>
                    <p className="text-white font-mono text-sm">
                      {key.keyPrefix}_••••••••
                    </p>
                    {key.name && (
                      <p className="text-white/40 text-xs mt-0.5">{key.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-white/30 text-xs">
                    {new Date(key.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                  {key.status === "ACTIVE" && (
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                      title="إلغاء المفتاح"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  {key.status === "REVOKED" && (
                    <span className="text-red-400/70 text-xs px-2 py-1 rounded-md bg-red-500/10">
                      ملغي
                    </span>
                  )}
                </div>
              </div>

              {key.lastUsedAt && (
                <p className="text-white/30 text-xs mt-2 mr-5">
                  آخر استخدام: {new Date(key.lastUsedAt).toLocaleString("ar-EG")}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
