"use client";

// نُقل من chat/page.tsx

import { Bot, CheckCheck, Clock, Paperclip, Users } from "lucide-react";
import type { Lang } from "./i18n";
import type { Message } from "./types";
import { dateStr, timeStr } from "./utils";

export function TimelineView({ messages, lang, dark }: { messages: Message[], lang: Lang, dark: boolean }) {
    if (messages.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <p className={`text-xs px-4 py-1.5 rounded-full ${dark ? "bg-[#1f2c34] text-[#8696a0]" : "bg-white/60 text-gray-400"}`}>
                    لا توجد بيانات للأتمتة
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
                            <span className="text-xl">🚀</span>
                            <h4 className={`font-semibold text-sm ${dark ? "text-[#e9edef]" : "text-gray-800"}`}>
                                {lang === "ar" ? "بداية الأتمتة" : "Automation Started"}
                            </h4>
                        </div>
                        <p className={`text-xs ${dark ? "text-[#8696a0]" : "text-gray-500"}`}>
                            {timeStr(messages[0]?.createdAt ?? new Date().toISOString())}
                        </p>
                    </div>
                </div>

                {messages.map((msg, i) => {
                    const isMe = msg.direction === "outbound";
                    // We consider it bot if it has [متابعة ذكية] or if it is an outbound message and the filter is automation (which implies bot messages). Actually msg doesn't have senderType here.
                    // But we can check content for keywords or just assume if it's from bot in an automated workflow.
                    const isBot = isMe && (msg.content?.includes("[متابعة ذكية]") || msg.content?.includes("[قالب]"));
                    const isCustomer = msg.direction === "inbound";

                    let icon = "💬";
                    let title = isMe ? (lang === "ar" ? "أنت" : "You") : (lang === "ar" ? "العميل" : "Customer");
                    let dotColor = isMe ? "bg-[#25d366]" : "bg-gray-400";
                    let dotIcon = isMe ? <CheckCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />;

                    if (isBot) {
                        icon = "🤖";
                        title = lang === "ar" ? "الأتمتة (رد آلي)" : "Automation (Bot)";
                        dotColor = "bg-amber-500";
                        dotIcon = <Bot className="w-3 h-3" />;
                    } else if (isCustomer) {
                        icon = "👤";
                        title = lang === "ar" ? "العميل" : "Customer";
                        dotColor = "bg-gray-400";
                        dotIcon = <Users className="w-3 h-3" />;
                    } else if (isMe) {
                        icon = "👨‍💻";
                        title = lang === "ar" ? "تدخل بشري" : "Human Agent";
                        dotColor = "bg-[#25d366]";
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
                                            {dateStr(msg.createdAt, lang)} • {timeStr(msg.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                {msg.content && (
                                    <div className={`text-sm p-3 rounded-lg ${dark ? "bg-[#2a3942] text-[#d1d7db]" : "bg-gray-50 text-gray-700"} whitespace-pre-wrap`}>
                                        {msg.content.replace("[متابعة ذكية] ", "").replace("[قالب] ", "")}
                                    </div>
                                )}
                                {msg.mediaUrl && (
                                    <div className="mt-2 text-xs text-blue-500 flex items-center gap-1">
                                        <Paperclip className="w-3 h-3" /> {lang === "ar" ? "مرفق" : "Attachment"} ({msg.type})
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
                            <span className="text-xl">✅</span>
                            <h4 className={`font-semibold text-sm ${dark ? "text-indigo-300" : "text-indigo-700"}`}>
                                {lang === "ar" ? "نهاية المسار المتاح" : "End of available workflow"}
                            </h4>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────