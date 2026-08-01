import {
    Smartphone, MessageSquare, Image, Video, Paperclip, ExternalLink, Phone, CheckCheck,
} from "lucide-react";
import { T } from "./i18n";
import type { FormState, Lang } from "./types";

export function WhatsAppPreview({ form, lang }: { form: FormState; lang: Lang }) {
    const t = T[lang];

    const fillVars = (text: string) =>
        text.replace(/\{\{(\d+)\}}/g, (_, n) => {
            const ex = form.exampleVars[parseInt(n) - 1];
            return ex ? `*${ex}*` : `{{${n}}}`;
        });

    const renderBody = (text: string) =>
        text.split("\n").map((line, i) => {
            const parts = line.split(/(\*[^*]+\*)/g);
            return (
                <span key={i}>
                    {parts.map((p, j) =>
                        p.startsWith("*") && p.endsWith("*")
                            ? <strong key={j}>{p.slice(1, -1)}</strong>
                            : p
                    )}
                    {i < text.split("\n").length - 1 && <br />}
                </span>
            );
        });

    const previewBody = form.body ? fillVars(form.body) : "";

    return (
        <div className="flex flex-col items-center">
            {/* Phone shell */}
            <div className="relative w-64 bg-gray-900 dark:bg-gray-950 rounded-[2.5rem] p-2 shadow-2xl border border-gray-700">
                {/* Notch */}
                <div className="w-20 h-5 bg-gray-800 rounded-full mx-auto mb-2" />
                {/* Screen */}
                <div className="bg-[#e5ddd5] dark:bg-[#0a1014] rounded-[2rem] overflow-hidden" style={{ minHeight: 380 }}>
                    {/* WhatsApp Header bar */}
                    <div className="bg-[#075E54] px-3 py-2.5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-white text-xs font-semibold leading-none">متجرك</p>
                            <p className="text-green-200 text-[10px]">Business Account</p>
                        </div>
                    </div>

                    {/* Chat area */}
                    <div className="p-3 space-y-1" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3C/svg%3E\")" }}>
                        {(form.body || form.headerText) ? (
                            <div className="bg-white dark:bg-[#202c33] rounded-lg rounded-tl-none shadow-sm max-w-[90%] overflow-hidden">
                                {/* Header */}
                                {form.headerType === "text" && form.headerText && (
                                    <div className="px-3 pt-2.5 pb-1 border-b border-gray-100 dark:border-gray-700">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{form.headerText}</p>
                                    </div>
                                )}
                                {(form.headerType === "image" || form.headerType === "video" || form.headerType === "document") && (
                                    <div className="h-24 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        {form.headerType === "image" && <Image className="w-8 h-8 text-gray-400" />}
                                        {form.headerType === "video" && <Video className="w-8 h-8 text-gray-400" />}
                                        {form.headerType === "document" && <Paperclip className="w-8 h-8 text-gray-400" />}
                                    </div>
                                )}

                                {/* Body */}
                                {previewBody && (
                                    <div className="px-3 py-2.5">
                                        <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                            {renderBody(previewBody)}
                                        </p>
                                    </div>
                                )}

                                {/* Footer */}
                                {form.footer && (
                                    <div className="px-3 pb-2 -mt-1">
                                        <p className="text-[10px] text-gray-400">{form.footer}</p>
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="flex justify-end px-3 pb-1.5">
                                    <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                        12:34 <CheckCheck className="w-2.5 h-2.5 text-blue-400" />
                                    </span>
                                </div>

                                {/* Buttons */}
                                {form.buttons.length > 0 && (
                                    <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                                        {form.buttons.map((btn, i) => (
                                            <button key={i} className="w-full text-xs text-[#0d9488] dark:text-[#25D366] py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                {btn.type === "url" && <ExternalLink className="w-3 h-3" />}
                                                {btn.type === "phone" && <Phone className="w-3 h-3" />}
                                                {btn.text || "زر"}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-600">
                                <Smartphone className="w-10 h-10 mb-2 opacity-40" />
                                <p className="text-xs text-center opacity-60">ابدأ بكتابة الرسالة<br />لترى المعاينة</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t.preview}</p>
        </div>
    );
}