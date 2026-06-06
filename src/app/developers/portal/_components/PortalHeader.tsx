"use client";

import { useState } from "react";
import { Bell, Copy, Check } from "lucide-react";

export default function PortalHeader({ developer }: { developer: any }) {
  const [copied, setCopied] = useState(false);
  const activeKey = developer.apiKeys?.[0];

  async function copyKey() {
    if (!activeKey?.keyPrefix) return;
    await navigator.clipboard.writeText(activeKey.keyPrefix + "_xxxxxxxx");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="h-16 bg-[#0f0f0f] border-b border-white/5 flex items-center justify-between px-6">
      {/* Left: Breadcrumb / Title */}
      <div>
        <h2 className="text-white font-medium">Developer Portal</h2>
        <p className="text-white/40 text-xs">إدارة OTP API</p>
      </div>

      {/* Right: API Key + Notifications */}
      <div className="flex items-center gap-4">
        {/* API Key Badge */}
        {activeKey ? (
          <button
            onClick={copyKey}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-mono hover:bg-[#25D366]/20 transition-all"
          >
            <span>{activeKey.keyPrefix}_••••••••</span>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        ) : (
          <span className="text-amber-400/70 text-sm bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            مفيش API Key — روح اعمل واحد
          </span>
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#25D366]" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-black font-bold text-xs">
          {developer.name?.[0]?.toUpperCase() || developer.email[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
