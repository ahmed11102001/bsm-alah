"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, RefreshCw, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ElevenLabsIntegrationProps {
  apiKey: string;
  setApiKey: (v: string) => void;
  agentId: string;
  setAgentId: (v: string) => void;
  voiceId: string;
  setVoiceId: (v: string) => void;
  voiceRepliesEnabled: boolean;
  setVoiceRepliesEnabled: (v: boolean) => void;
  agentData: Record<string, unknown> | null;
  setAgentData: (d: Record<string, unknown> | null) => void;
  onSave: () => Promise<void>;
  onDisconnect: () => void;
  saving: boolean;
  locale?: string;
}

export function ElevenLabsIntegration({
  apiKey,
  setApiKey,
  agentId,
  setAgentId,
  voiceId,
  voiceRepliesEnabled,
  setVoiceRepliesEnabled,
  agentData,
  setAgentData,
  onSave,
  onDisconnect,
  saving,
  locale = "ar",
}: ElevenLabsIntegrationProps) {
  const [editMode, setEditMode] = useState(false);
  const isLinked = Boolean(agentData?.elevenLabsAgentId && agentData?.elevenLabsApiKey);

  return (
    <div>
      {isLinked && !editMode ? (
        <div className="space-y-3.5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
              <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {locale === "ar" ? "تم ربط ElevenLabs بنجاح ✅" : "ElevenLabs connected successfully ✅"}
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                {locale === "ar" ? "الـ Agent الصوتي شغّال" : "Your voice agent is active"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Agent ID</p>
              <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mt-0.5">{agentId}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {locale === "ar" ? "الرد الصوتي مفعّل" : "Voice Reply enabled"}
            </p>
            <button
              type="button"
              onClick={async () => {
                const next = !voiceRepliesEnabled;
                setVoiceRepliesEnabled(next);
                try {
                  const r = await fetch("/api/ai-agent", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...(agentData ?? {}),
                      elevenLabsEnabled: true,
                      voiceRepliesEnabled: next,
                      elevenLabsApiKey: apiKey.trim(),
                      elevenLabsAgentId: agentId.trim() || null,
                      elevenLabsVoiceId: voiceId.trim() || null,
                    }),
                  });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error ?? "Save failed");
                  setAgentData(d);
                } catch (e: any) {
                  setVoiceRepliesEnabled(!next);
                  toast.error(e?.message ?? (locale === "ar" ? "تعذر التحديث" : "Could not update"));
                }
              }}
              className={cn(
                "w-12 h-6 rounded-full p-1 transition-colors",
                voiceRepliesEnabled ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
              )}
              aria-label="Toggle Voice Replies Output"
            >
              <span
                className={cn(
                  "block w-4 h-4 rounded-full bg-white transition-transform",
                  voiceRepliesEnabled ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditMode(true)}
              className="flex-1 gap-2 text-xs font-medium dark:border-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {locale === "ar" ? "تعديل البيانات" : "Edit credentials"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onDisconnect}
              className="gap-2 text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {locale === "ar" ? "فك الربط" : "Disconnect"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              ElevenLabs API Key *
            </Label>
            <Input
              id="elevenlabs_api_key_custom"
              name="elevenlabs_api_key_custom"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk_••••••••"
              dir="ltr"
              className="rounded-xl text-xs font-mono dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Agent ID *
            </Label>
            <Input
              id="elevenlabs_agent_id_custom"
              name="elevenlabs_agent_id_custom"
              autoComplete="off"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              dir="ltr"
              className="rounded-xl text-xs font-mono dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          {/* زر الربط بالأسفل */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={async () => {
                await onSave();
                setEditMode(false);
              }}
              disabled={saving}
              size="default"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />{" "}
                  {locale === "ar" ? "حفظ وربط ElevenLabs" : "Save & Connect ElevenLabs"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
