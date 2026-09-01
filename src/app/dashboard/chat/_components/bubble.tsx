"use client";

// نُقل من chat/page.tsx

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCheck, Clock, Copy, FileText, Forward, Image as ImageIcon, Loader2, MoreVertical, Paperclip, Reply, X, GraduationCap, MessageSquareWarning } from "lucide-react";
import { t, type Lang } from "./i18n";
import type { Message } from "./types";
import { mediaSrc, linkify, timeStr } from "./utils";
import { MsgTick } from "./masgtic";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

// ─── Bubble ───────────────────────────────────────────────────────────────────
export function Bubble({
  msg, contactId, onReact, onReply, onCopy, onForward, onQuoteClick, lang, dark,
}: {
  msg: Message;
  contactId?: string;
  onReact?: (msgId: string, emoji: string) => void;
  onReply?: (msg: Message) => void;
  onCopy?: (msg: Message) => void;
  onForward?: (msg: Message) => void;
  onQuoteClick?: (id: string) => void;
  lang: Lang;
  dark: boolean;
}) {
  const router = useRouter();
  const isMe = msg.direction === "outbound";
  const isAiMessage = msg.senderType === "ai";
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [showReactions, setShowReactions] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolvedMediaSrc = msg.mediaUrl ? mediaSrc(msg.mediaUrl) : null;
  const resolvedMediaDownloadSrc = msg.mediaUrl ? mediaSrc(msg.mediaUrl, { download: true }) : null;

  const handleSaveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resolvedMediaSrc || saving) return;
    setSaving(true);
    try {
      const res = await fetch(resolvedMediaDownloadSrc ?? resolvedMediaSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = blob.type.split("/")[1]?.split("+")[0] ?? "jpg";
      a.href = url;
      a.download = `image_${msg.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, msg.id]);

  const reactionCounts = (msg.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  const bubbleBg = isMe
    ? (dark ? "bg-[#005c4b]" : "bg-[#d9fdd3]")
    : (dark ? "bg-[#1f2c34]" : "bg-white");

  const textColor = dark ? "text-[#e9edef]" : "text-[#111b21]";

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-1`} dir="ltr">
      <div className="group relative inline-block max-w-[80%] sm:max-w-[68%]">
        {showReactions && onReact && (
          <div className={`absolute -top-10 z-20 flex items-center gap-1 rounded-full shadow-lg border px-2 py-1
            ${dark ? "bg-[#233138] border-[#2a3942]" : "bg-white border-gray-100"}
            ${isMe ? "right-0" : "left-0"}`}>
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji}
                onClick={e => { e.stopPropagation(); onReact(msg.id, emoji); setShowReactions(false); }}
                className="text-lg hover:scale-125 transition-transform leading-none">
                {emoji}
              </button>
            ))}
            <button onClick={e => { e.stopPropagation(); setShowReactions(false); }}
              className="text-gray-400 hover:text-gray-600 text-xs mr-1">✕</button>
          </div>
        )}

        {(onReply || onCopy || onForward) && (
          <>
            <button
              type="button"
              aria-label={lang === "ar" ? "المزيد" : "More"}
              title={lang === "ar" ? "المزيد" : "More"}
              onClick={e => {
                e.stopPropagation();
                setShowActions(p => !p);
                setShowReactions(false);
              }}
              className={`absolute top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full border shadow-sm transition-opacity ${
                isMe ? "left-0 -translate-x-[calc(100%+6px)]" : "right-0 translate-x-[calc(100%+6px)]"
              } ${
                showActions ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              } ${dark ? "bg-[#233138] border-[#2a3942] text-[#e9edef] hover:bg-[#2d3d45]" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActions && (
              <div
                className={`absolute top-full mt-1 z-40 flex gap-1 whitespace-nowrap rounded-lg border p-1 shadow-lg ${
                  isMe ? "right-0" : "left-0"
                } ${dark ? "bg-[#233138] border-[#2a3942] text-[#e9edef]" : "bg-white border-gray-200 text-gray-700"}`}
                onClick={e => e.stopPropagation()}
              >
                {onReply && <button type="button" aria-label={lang === "ar" ? "رد" : "Reply"} title={lang === "ar" ? "رد" : "Reply"} onClick={() => { setShowActions(false); onReply(msg); }} className="p-1.5 hover:bg-black/10 rounded"><Reply className="w-4 h-4" /></button>}
                {onCopy && msg.content && <button type="button" aria-label={lang === "ar" ? "نسخ" : "Copy"} title={lang === "ar" ? "نسخ" : "Copy"} onClick={() => { setShowActions(false); onCopy(msg); }} className="p-1.5 hover:bg-black/10 rounded"><Copy className="w-4 h-4" /></button>}
                {onForward && <button type="button" aria-label={lang === "ar" ? "إعادة توجيه" : "Forward"} title={lang === "ar" ? "إعادة توجيه" : "Forward"} onClick={() => { setShowActions(false); onForward(msg); }} className="p-1.5 hover:bg-black/10 rounded"><Forward className="w-4 h-4" /></button>}
                {isAiMessage && (
                  <button
                    type="button"
                    aria-label={lang === "ar" ? "تدريب الإيجنت / تصحيح الرد" : "Train Agent / Correct Reply"}
                    title={lang === "ar" ? "تدريب الإيجنت / تصحيح الرد" : "Train Agent / Correct Reply"}
                    onClick={() => {
                      setShowActions(false);
                      const targetContactId = contactId || msg.contactId || "";
                      router.push(
                        `/dashboard/ai-agent?tab=training${targetContactId ? `&contactId=${targetContactId}` : ""}&messageId=${msg.id}`
                      );
                    }}
                    className="p-1.5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded flex items-center gap-1 text-xs font-semibold"
                  >
                    <GraduationCap className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
        <div
          onClick={() => onReact && setShowReactions(p => !p)}
          className={`rounded-xl px-3 py-2 text-sm shadow-sm cursor-pointer
            ${isMe ? "rounded-tr-none" : "rounded-tl-none"} ${bubbleBg}`}
        >
          {msg.replyTo && (
            <button type="button" onClick={e => { e.stopPropagation(); onQuoteClick?.(msg.replyTo!.id); }} className={`w-full text-left mb-2 border-l-4 rounded px-2 py-1 text-xs ${dark ? "bg-black/20 border-[#25d366] text-gray-300" : "bg-black/5 border-[#25d366] text-gray-600"}`}>
              <span className="font-semibold block">{msg.replyTo.direction === "outbound" ? (lang === "ar" ? "أنت" : "You") : (lang === "ar" ? "العميل" : "Customer")}</span>
              <span className="line-clamp-2">{msg.replyTo.content || (lang === "ar" ? `مرفق ${msg.replyTo.type}` : `${msg.replyTo.type} attachment`)}</span>
          </button>
          )}
          {msg.type === "image" && resolvedMediaSrc && (
            <>
              {/* Lightbox modal */}
              {lightboxOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                  onClick={() => setLightboxOpen(false)}
                >
                  <button
                    onClick={() => setLightboxOpen(false)}
                    className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSaveImage}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full px-4 py-2 text-sm flex items-center gap-2 z-10"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    {t[lang].saveImage}
                  </button>
                  <img
                    src={resolvedMediaSrc}
                    alt=""
                    className="max-w-[92vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )}
              {/* Thumbnail — click to open lightbox */}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setLightboxOpen(true); }}
                className="block w-full"
              >
                <img src={resolvedMediaSrc} alt="" className="rounded-lg mb-1 max-w-full max-h-60 object-cover cursor-zoom-in" />
              </button>
              {/* Save button — downloads via blob */}
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={saving}
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline mb-1 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {t[lang].saveImage}
              </button>
            </>
          )}
          {msg.type === "video" && resolvedMediaSrc && (
            <video src={resolvedMediaSrc} controls onClick={e => e.stopPropagation()}
              className="rounded-lg mb-1 max-w-full max-h-48" />
          )}
          {msg.type === "audio" && resolvedMediaSrc && (
            <>
              <audio ref={audioRef} src={resolvedMediaSrc} controls onClick={e => e.stopPropagation()}
                className="mb-1 w-full max-w-[200px]" />
              <div className="flex items-center gap-1 mb-1">
                {([1, 1.5, 2] as const).map(r => (
                  <button key={r} type="button"
                    onClick={e => { e.stopPropagation(); setSpeed(r); }}
                    className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${speed === r ? "bg-[#25d366] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>{r}x</button>
                ))}
              </div>
            </>
          )}
          {msg.type === "document" && resolvedMediaSrc && (
            <a href={resolvedMediaSrc} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 text-blue-400 text-xs mb-1 hover:underline">
              <FileText className="w-4 h-4" /> {t[lang].downloadFile}
            </a>
          )}
          {msg.type === "sticker" && resolvedMediaSrc && (
            <img
              src={resolvedMediaSrc}
              alt="sticker"
              className="w-32 h-32 object-contain mb-1"
              style={{ background: "transparent" }}
            />
          )}

          {msg.content && (
            <p className={`leading-relaxed whitespace-pre-wrap break-words ${textColor}`} dir="auto">
              {linkify(msg.content)}
            </p>
          )}

          <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] text-gray-400
            ${isMe ? "justify-end" : "justify-start"}`}>
            {timeStr(msg.createdAt)}
            <MsgTick status={msg.status} isMe={isMe} />
          </div>

          {Object.keys(reactionCounts).length > 0 && (
            <div className={`flex gap-1 flex-wrap mt-1.5 pt-1.5 border-t border-black/10 ${isMe ? "justify-end" : "justify-start"}`}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <span key={emoji}
                  className="inline-flex items-center gap-0.5 bg-black/10 rounded-full px-1.5 py-0.5 text-xs">
                  {emoji}{count > 1 && <span className="text-gray-500 text-[10px]">{count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
