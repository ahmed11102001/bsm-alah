"use client";

import { Check, CheckCheck, Clock, X } from "lucide-react";

export function MsgTick({ status, isMe }: { status: string; isMe: boolean }) {
  if (!isMe) return null;
  if (status === "pending") return <Clock className="w-3 h-3 opacity-60" />;
  if (status === "sent") return <Check className="w-3 h-3" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-[#53bdeb]" />;
  if (status === "failed") return <X className="w-3 h-3 text-red-400" />;
  return null;
}