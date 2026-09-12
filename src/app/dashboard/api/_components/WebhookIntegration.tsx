"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { CopyInput } from "./CopyInput";

export interface WebhookIntegrationProps {
  webhookUrl: string;
  verifyToken: string;
  hint: string;
  locale?: string;
}

export function WebhookIntegration({
  webhookUrl,
  verifyToken,
  hint,
}: WebhookIntegrationProps) {
  return (
    <div className="space-y-3.5">
      <div>
        <Label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Callback URL</Label>
        <div className="mt-1">
          <CopyInput value={webhookUrl} />
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Verify Token</Label>
        <div className="mt-1">
          <CopyInput value={verifyToken} placeholder="..." />
        </div>
      </div>
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-700 dark:text-gray-300">{hint}</p>
      </div>
    </div>
  );
}
