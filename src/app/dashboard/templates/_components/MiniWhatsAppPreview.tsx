import { MessageSquare, ExternalLink, Phone, CheckCheck } from "lucide-react";
import type { TemplateButton } from "./types";

export function MiniWhatsAppPreview({ body, footer, buttons, exampleVars }: {
    body: string; footer: string; buttons: TemplateButton[]; exampleVars: string[];
}) {
    const filled = body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
        const ex = exampleVars[parseInt(n) - 1];
        return ex ? ex : `{{${n}}}`;
    });

    const renderLines = (text: string) =>
        text.split("\n").map((line, i, arr) => {
            const parts = line.split(/(\*[^*]+\*)/g);
            return (
                <span key={i}>
                    {parts.map((p, j) =>
                        p.startsWith("*") && p.endsWith("*")
                            ? <strong key={j}>{p.slice(1, -1)}</strong>
                            : p
                    )}
                    {i < arr.length - 1 && <br />}
                </span>
            );
        });

    return (
        <div className="bg-[#e5ddd5] dark:bg-[#0a1014] rounded-2xl overflow-hidden shadow-inner">
            <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-3 h-3 text-white" />
                </div>
                <p className="text-white text-[11px] font-semibold">متجرك · Business Account</p>
            </div>
            <div className="p-3">
                <div className="bg-white dark:bg-[#202c33] rounded-lg rounded-tl-none shadow-sm max-w-[85%] overflow-hidden">
                    {body && (
                        <div className="px-3 py-2.5">
                            <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {renderLines(filled)}
                            </p>
                        </div>
                    )}
                    {footer && (
                        <div className="px-3 pb-2 -mt-1 border-t border-gray-50 dark:border-gray-700/50">
                            <p className="text-[9px] text-gray-400">{footer}</p>
                        </div>
                    )}
                    <div className="flex justify-end px-3 pb-1.5">
                        <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                            12:34 <CheckCheck className="w-2 h-2 text-blue-400" />
                        </span>
                    </div>
                    {buttons.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                            {buttons.map((btn, i) => (
                                <div key={i} className="text-[10px] text-[#0d9488] dark:text-[#25D366] py-1.5 flex items-center justify-center gap-1">
                                    {btn.type === "url" && <ExternalLink className="w-2.5 h-2.5" />}
                                    {btn.type === "phone" && <Phone className="w-2.5 h-2.5" />}
                                    {btn.text || "زر"}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}