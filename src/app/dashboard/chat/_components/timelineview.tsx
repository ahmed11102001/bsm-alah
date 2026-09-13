"use client";

// Ù†ÙÙ‚Ù„ Ù…Ù† chat/page.tsx

import { Bot, CheckCheck, Clock, Paperclip, Users } from "lucide-react";
import type { Lang } from "./i18n";
import type { Message } from "./types";
import { dateStr, timeStr } from "./utils";

export function TimelineView({ messages, lang, dark }: { messages: Message[], lang: Lang, dark: boolean }) {
  if (messages.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className={`text-xs px-4 py-1.5 rounded-full ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/60 text-gray-400"}`}>
          Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ø£ØªÙ…ØªØ©
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto w-full font-sans" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="relative border-l-2 border-amber-500/30 rtl:border-l-0 rtl:border-r-2 ml-4 rtl:mr-4 rtl:ml-0 pl-6 rtl:pr-6 space-y-8">
        
        {/* Workflow Started */}
        <div className="relative">
          <div className="absolute -left-[35px] rtl:-left-auto rtl:-right-[35px] w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-[#0b141a]">
            <Clock className="w-3 h-3" />
          </div>
          <div className={`p-4 rounded-xl shadow-sm border ${dark ? "bg-[#1f2c34] border-[#2a3942]" : "bg-white border-gray-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">ðŸš€</span>
              <h4 className={`font-semibold text-sm ${dark ? "text-[#e9edef]" : "text-gray-800"}`}>
                {lang === "ar" ? "Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø£ØªÙ…ØªØ©" : "Automation Started"}
              </h4>
            </div>
            <p className={`text-xs ${dark ? "text-[#8696a0]" : "text-gray-500"}`}>
              {timeStr(messages[0]?.createdAt ?? new Date().toISOString())}
            </p>
          </div>
        </div>

        {messages.map((msg, i) => {
          const isMe = msg.direction === "outbound";
          // We consider it bot if it has [Ù…ØªØ§Ø¨Ø¹Ø© Ø°ÙƒÙŠØ©] or if it is an outbound message and the filter is automation (which implies bot messages). Actually msg doesn't have senderType here.
          // But we can check content for keywords or just assume if it's from bot in an automated workflow.
          const isBot = isMe && (msg.content?.includes("[Ù…ØªØ§Ø¨Ø¹Ø© Ø°ÙƒÙŠØ©]") || msg.content?.includes("[Ù‚Ø§Ù„Ø¨]"));
          const isCustomer = msg.direction === "inbound";
          
          let icon = "ðŸ’¬";
          let title = isMe ? (lang === "ar" ? "Ø£Ù†Øª" : "You") : (lang === "ar" ? "Ø§Ù„Ø¹Ù…ÙŠÙ„" : "Customer");
          let dotColor = isMe ? "bg-primary" : "bg-gray-400";
          let dotIcon = isMe ? <CheckCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />;

          if (isBot) {
            icon = "ðŸ¤–";
            title = lang === "ar" ? "Ø§Ù„Ø£ØªÙ…ØªØ© (Ø±Ø¯ Ø¢Ù„ÙŠ)" : "Automation (Bot)";
            dotColor = "bg-amber-500";
            dotIcon = <Bot className="w-3 h-3" />;
          } else if (isCustomer) {
            icon = "ðŸ‘¤";
            title = lang === "ar" ? "Ø§Ù„Ø¹Ù…ÙŠÙ„" : "Customer";
            dotColor = "bg-gray-400";
            dotIcon = <Users className="w-3 h-3" />;
          } else if (isMe) {
            icon = "ðŸ‘¨â€ðŸ’»";
            title = lang === "ar" ? "ØªØ¯Ø®Ù„ Ø¨Ø´Ø±ÙŠ" : "Human Agent";
            dotColor = "bg-primary";
            dotIcon = <CheckCheck className="w-3 h-3" />;
          }

          return (
            <div key={msg.id} className="relative">
              <div className={`absolute -left-[35px] rtl:-left-auto rtl:-right-[35px] w-6 h-6 rounded-full ${dotColor} text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-[#0b141a]`}>
                {dotIcon}
              </div>
              <div className={`p-4 rounded-xl shadow-sm border ${dark ? "bg-[#1f2c34] border-[#2a3942]" : "bg-white border-gray-100"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <h4 className={`font-semibold text-sm ${dark ? "text-[#e9edef]" : "text-gray-800"}`}>{title}</h4>
                    <p className={`text-[10px] ${dark ? "text-[#8696a0]" : "text-gray-500"}`}>
                      {dateStr(msg.createdAt, lang)} â€¢ {timeStr(msg.createdAt)}
                    </p>
                  </div>
                </div>
                {msg.content && (
                  <div className={`text-sm p-3 rounded-lg ${dark ? "bg-[#2a3942] text-[#d1d7db]" : "bg-gray-50 text-gray-700"} whitespace-pre-wrap`}>
                    {msg.content.replace("[Ù…ØªØ§Ø¨Ø¹Ø© Ø°ÙƒÙŠØ©] ", "").replace("[Ù‚Ø§Ù„Ø¨] ", "")}
                  </div>
                )}
                {msg.mediaUrl && (
                  <div className="mt-2 text-xs text-blue-500 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> {lang === "ar" ? "Ù…Ø±ÙÙ‚" : "Attachment"} ({msg.type})
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* End of Workflow marker */}
        <div className="relative">
          <div className="absolute -left-[35px] rtl:-left-auto rtl:-right-[35px] w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-[#0b141a]">
            <CheckCheck className="w-3 h-3" />
          </div>
          <div className={`p-4 rounded-xl shadow-sm border ${dark ? "bg-indigo-900/20 border-indigo-500/30" : "bg-indigo-50 border-indigo-100"}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">âœ…</span>
              <h4 className={`font-semibold text-sm ${dark ? "text-indigo-300" : "text-indigo-700"}`}>
                {lang === "ar" ? "Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù…ØªØ§Ø­" : "End of available workflow"}
              </h4>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

