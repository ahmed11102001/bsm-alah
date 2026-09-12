"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle2 } from "lucide-react";

export function CopyInput({ value, placeholder }: { value: string; placeholder?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={value}
        placeholder={placeholder ?? ""}
        className="bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 font-mono text-xs"
        dir="ltr"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={copy}
        disabled={!value}
        className="dark:border-gray-600 dark:text-gray-300 flex-shrink-0"
      >
        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
