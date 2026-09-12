"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Copy, CheckCircle2, RefreshCw, Shield, Link as LinkIcon, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CopyInput } from "./CopyInput";

export interface ClaudeIntegrationProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  locale?: string;
}

export function ClaudeIntegration({
  apiKey,
  onApiKeyChange,
  locale = "ar",
}: ClaudeIntegrationProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"key" | "config" | null>(null);

  const handleGenerateApiKey = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/me/api-key", { method: "POST" });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error ?? (locale === "ar" ? "فشل إنشاء المفتاح" : "Failed to generate key"));
        return;
      }
      onApiKeyChange(d.apiKey);
      toast.success(locale === "ar" ? "تم إنشاء API Key جديد بنجاح" : "New API Key generated successfully");
    } catch {
      toast.error(locale === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const copyClaudeText = (type: "key" | "config") => {
    const host = typeof window !== "undefined" ? window.location.host : "aiwni.com";
    const text =
      type === "key"
        ? `Bearer ${apiKey}`
        : JSON.stringify(
            {
              mcpServers: {
                wani: {
                  command: "npx",
                  args: ["-y", "@modelcontextprotocol/server-fetch", `https://${host}/api/mcp`],
                  env: { AUTHORIZATION: `Bearer ${apiKey}` },
                },
              },
            },
            null,
            2
          );
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5 pt-1">
      {/* API Key — shows "Bearer bsm_..." for easy copy-paste */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <Key className="w-3 h-3" /> {locale === "ar" ? "API Key الخاص بك" : "Your API Key"}
        </label>
        <div className="flex gap-2">
          <Input
            readOnly
            dir="ltr"
            value={apiKey ? `Bearer ${apiKey}` : locale === "ar" ? "لم يتم إنشاء مفتاح بعد" : "No key generated yet"}
            className="font-mono text-xs bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => copyClaudeText("key")}
            disabled={!apiKey}
            className="dark:border-gray-600 dark:text-gray-300 flex-shrink-0"
            title={locale === "ar" ? "نسخ المفتاح" : "Copy Key"}
          >
            {copied === "key" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={handleGenerateApiKey}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
            title={apiKey ? (locale === "ar" ? "تجديد المفتاح" : "Regenerate Key") : locale === "ar" ? "إنشاء مفتاح" : "Generate Key"}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
        {apiKey && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Shield className="w-3 h-3" /> {locale === "ar" ? "احتفظ بهذا المفتاح سري — لا تشاركه" : "Keep this key secret — do not share it"}
          </p>
        )}
      </div>

      {/* MCP URL */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <LinkIcon className="w-3 h-3 text-emerald-600" /> {locale === "ar" ? "رابط الاتصال (MCP URL)" : "Connection URL (MCP URL)"}
        </label>
        <CopyInput
          value={typeof window !== "undefined" ? `https://${window.location.host}/api/mcp` : "https://aiwni.com/api/mcp"}
          placeholder="https://aiwni.com/api/mcp"
        />
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {locale === "ar" ? "استخدم هذا الرابط + المفتاح أعلاه في إعدادات Claude Desktop" : "Use this URL + key above in Claude Desktop settings"}
        </p>
      </div>

      {/* Config */}
      {apiKey && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Database className="w-3 h-3 text-emerald-600" /> {locale === "ar" ? "إعدادات Claude Desktop (انسخ والصق في MCP Config)" : "Claude Desktop Config (Copy & paste into MCP Config)"}
          </label>
          <div className="relative">
            <pre className="text-xs font-mono bg-gray-950 text-emerald-400 rounded-xl p-4 overflow-x-auto leading-relaxed" dir="ltr">
              {`{
  "mcpServers": {
    "wani": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch",
               "https://${typeof window !== "undefined" ? window.location.host : "aiwni.com"}/api/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer ${apiKey}"
      }
    }
  }
}`}
            </pre>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copyClaudeText("config")}
              className="absolute top-2 left-2 text-xs gap-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              {copied === "config" ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {locale === "ar" ? "تم النسخ" : "Copied"}
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> {locale === "ar" ? "نسخ" : "Copy"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* أمثلة أوامر Claude */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          {locale === "ar" ? "بعد الربط — تقدر تقول لـ Claude:" : "After connecting — you can ask Claude:"}
        </p>
        <ul className="space-y-1">
          {[
            locale === "ar" ? "\"اختار جمهور عشوائي واعملي حملة\"" : "\"Pick a random audience and create a campaign\"",
            locale === "ar" ? "\"فيه كام رسالة واردة؟\"" : "\"How many incoming messages are there?\"",
            locale === "ar" ? "\"اعرضلي أفضل الحملات هذا الشهر\"" : "\"Show me the best performing campaigns this month\"",
            locale === "ar" ? "\"كام جهة اتصال عندي؟\"" : "\"How many contacts do I have?\"",
            locale === "ar" ? "\"اعملي قالب تسويقي يشد العميل \"" : "\"Create an engaging marketing template\"",
          ].map((ex, i) => (
            <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="text-emerald-500 font-bold">›</span> {ex}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
