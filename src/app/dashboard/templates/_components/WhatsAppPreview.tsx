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
            <div className="relative w-64 bg-card rounded-[2.5rem] p-2 shadow-2xl border border-border">
                {/* Notch */}
                <div className="w-20 h-5 bg-muted rounded-full mx-auto mb-2" />
                {/* Screen */}
                <div className="bg-background rounded-[2rem] overflow-hidden" style={{ minHeight: 380 }}>
                    {/* WhatsApp Header bar */}
                    <div className="bg-primary px-3 py-2.5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
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
                            <div className="bg-card rounded-lg rounded-tl-none shadow-sm max-w-[90%] overflow-hidden">
                                {/* Header */}
                                {form.headerType === "text" && form.headerText && (
                                    <div className="px-3 pt-2.5 pb-1 border-b border-border">
                                        <p className="text-sm font-bold text-card-foreground">{form.headerText}</p>
                                    </div>
                                )}
                                {(form.headerType === "image" || form.headerType === "video" || form.headerType === "document") && (
                                    <div className="h-24 bg-muted flex items-center justify-center">
                                        {form.headerType === "image" && <Image className="w-8 h-8 text-muted-foreground" />}
                                        {form.headerType === "video" && <Video className="w-8 h-8 text-muted-foreground" />}
                                        {form.headerType === "document" && <Paperclip className="w-8 h-8 text-muted-foreground" />}
                                    </div>
                                )}

                                {/* Body */}
                                {previewBody && (
                                    <div className="px-3 py-2.5">
                                        <p className="text-xs text-card-foreground leading-relaxed whitespace-pre-wrap">
                                            {renderBody(previewBody)}
                                        </p>
                                    </div>
                                )}

                                {/* Footer */}
                                {form.footer && (
                                    <div className="px-3 pb-2 -mt-1">
                                        <p className="text-[10px] text-muted-foreground">{form.footer}</p>
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="flex justify-end px-3 pb-1.5">
                                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                        12:34 <CheckCheck className="w-2.5 h-2.5 text-blue-400" />
                                    </span>
                                </div>

                                {/* Buttons */}
                                {form.buttons.length > 0 && (
                                    <div className="border-t border-border divide-y divide-border">
                                        {form.buttons.map((btn, i) => (
                                            <button key={i} className="w-full text-xs text-primary py-2 flex items-center justify-center gap-1.5 hover:bg-muted/60">
                                                {btn.type === "url" && <ExternalLink className="w-3 h-3" />}
                                                {btn.type === "phone" && <Phone className="w-3 h-3" />}
                                                {btn.text || "زر"}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <Smartphone className="w-10 h-10 mb-2 opacity-40" />
                                <p className="text-xs text-center opacity-60">ابدأ بكتابة الرسالة<br />لترى المعاينة</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{t.preview}</p>
        </div>
    );
}
