"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, AlertTriangle, Trash2, Shield, Link as LinkIcon, Loader2, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyInput } from "./CopyInput";

export interface EasyOrdersLabels {
  storeLabel: string;
  storePlaceholder: string;
  apiKeyLabel: string;
  webhookLabel: string;
  webhookWarning: string;
  webhookSecretOrdersLabel: string;
  webhookSecretStatusUpdateLabel: string;
  webhookSecretPlaceholder: string;
  saveSecretBtn: string;
  savingSecretBtn: string;
  webhookOrdersConfiguredBadge: string;
  webhookOrdersNotConfiguredBadge: string;
  webhookStatusConfiguredBadge: string;
  webhookStatusNotConfiguredBadge: string;
  connectFirstHint: string;
  syncingBtn: string;
  syncBtn: string;
  apiKeyErr: string;
  syncSuccess: (synced: number) => string;
  syncErr: string;
  connectedBadge: (store: string, total: number) => string;
  lastSync: (date: string) => string;
  loading: string;
}

export interface EasyOrdersIntegrationProps {
  apiKey: string;
  setApiKey: (v: string) => void;
  storeName: string;
  setStoreName: (v: string) => void;
  webhookUrl: string;
  syncing: boolean;
  status: {
    connected: boolean;
    storeName?: string;
    totalSynced?: number;
    lastSyncAt?: string;
    webhookOrdersConfigured?: boolean;
    webhookStatusUpdateConfigured?: boolean;
  } | null;
  onSync: () => void;
  onDisconnect: () => void;
  webhookSecretOrders: string;
  setWebhookSecretOrders: (v: string) => void;
  savingSecretOrders: boolean;
  onSaveSecretOrders: () => void;
  webhookSecretStatusUpdate: string;
  setWebhookSecretStatusUpdate: (v: string) => void;
  savingSecretStatusUpdate: boolean;
  onSaveSecretStatusUpdate: () => void;
  labels: EasyOrdersLabels;
  locale: string;
}

export function EasyOrdersIntegration({
  apiKey,
  setApiKey,
  storeName,
  setStoreName,
  webhookUrl,
  syncing,
  status,
  onSync,
  onDisconnect,
  webhookSecretOrders,
  setWebhookSecretOrders,
  savingSecretOrders,
  onSaveSecretOrders,
  webhookSecretStatusUpdate,
  setWebhookSecretStatusUpdate,
  savingSecretStatusUpdate,
  onSaveSecretStatusUpdate,
  labels,
  locale,
}: EasyOrdersIntegrationProps) {
  const dateStr = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")
    : "";

  const webhookBadge = (configured: boolean | undefined, configuredLabel: string, notConfiguredLabel: string) => (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg border",
      configured
        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
    )}>
      {configured
        ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        : <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
      <p className={cn(
        "text-xs font-medium",
        configured ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
      )}>
        {configured ? configuredLabel : notConfiguredLabel}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {status?.connected && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="flex-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {labels.connectedBadge(status.storeName ?? "", status.totalSynced ?? 0)}
            </p>
            <button
              type="button"
              onClick={onDisconnect}
              className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {webhookBadge(status.webhookOrdersConfigured, labels.webhookOrdersConfiguredBadge, labels.webhookOrdersNotConfiguredBadge)}
          {webhookBadge(status.webhookStatusUpdateConfigured, labels.webhookStatusConfiguredBadge, labels.webhookStatusNotConfiguredBadge)}
        </div>
      )}

      <div>
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">{labels.storeLabel}</Label>
        <Input
          id="easyorders_store_name"
          name="easyorders_store_name"
          autoComplete="off"
          placeholder={labels.storePlaceholder}
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          className="mt-1 dark:bg-gray-800 dark:border-gray-700 text-xs"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <Shield className="w-3 h-3 text-emerald-600" /> {labels.apiKeyLabel}
        </Label>
        <Input
          id="easyorders_api_key_custom"
          name="easyorders_api_key_custom"
          autoComplete="new-password"
          spellCheck={false}
          placeholder="eo_live_xxxxxxxxxxxx"
          dir="ltr"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          type="password"
          className="mt-1 font-mono text-xs dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <LinkIcon className="w-3 h-3 text-emerald-600" /> {labels.webhookLabel}
        </Label>
        <div className="mt-1"><CopyInput value={webhookUrl} placeholder={labels.loading} /></div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{labels.webhookWarning}</p>
      </div>

      {/* Webhook Secrets */}
      <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" /> {labels.webhookSecretOrdersLabel}
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="easyorders_secret_orders_custom"
              name="easyorders_secret_orders_custom"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={labels.webhookSecretPlaceholder}
              dir="ltr"
              value={webhookSecretOrders}
              onChange={e => setWebhookSecretOrders(e.target.value)}
              type="password"
              className="font-mono text-xs dark:bg-gray-800 dark:border-gray-700 flex-1"
            />
            <Button
              type="button"
              onClick={onSaveSecretOrders}
              disabled={savingSecretOrders || !webhookSecretOrders.trim() || !status?.connected}
              size="sm"
              variant="outline"
              className="text-xs dark:border-gray-700 flex-shrink-0"
            >
              {savingSecretOrders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : labels.saveSecretBtn}
            </Button>
          </div>
          {!status?.connected && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{labels.connectFirstHint}</p>
          )}
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" /> {labels.webhookSecretStatusUpdateLabel}
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="easyorders_secret_status_custom"
              name="easyorders_secret_status_custom"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={labels.webhookSecretPlaceholder}
              dir="ltr"
              value={webhookSecretStatusUpdate}
              onChange={e => setWebhookSecretStatusUpdate(e.target.value)}
              type="password"
              className="font-mono text-xs dark:bg-gray-800 dark:border-gray-700 flex-1"
            />
            <Button
              type="button"
              onClick={onSaveSecretStatusUpdate}
              disabled={savingSecretStatusUpdate || !webhookSecretStatusUpdate.trim() || !status?.connected}
              size="sm"
              variant="outline"
              className="text-xs dark:border-gray-700 flex-shrink-0"
            >
              {savingSecretStatusUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : labels.saveSecretBtn}
            </Button>
          </div>
          {!status?.connected && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{labels.connectFirstHint}</p>
          )}
        </div>
      </div>

      {/* ── زر الربط والمزامنة بالأسفل ── */}
      <div className="pt-2 space-y-2">
        <Button
          type="button"
          onClick={onSync}
          disabled={syncing || !apiKey.trim()}
          size="default"
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {labels.syncingBtn}
            </>
          ) : (
            <>
              <Database className="w-4 h-4" /> {labels.syncBtn}
            </>
          )}
        </Button>
        {dateStr && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">{labels.lastSync(dateStr)}</p>
        )}
      </div>
    </div>
  );
}
