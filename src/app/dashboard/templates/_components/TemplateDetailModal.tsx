"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, AlertCircle, Trash2, Copy, Pencil, Loader2 } from "lucide-react";
import { T } from "./i18n";
import { STATUS_CONFIG } from "./status-config";
import { WANI_READY } from "./wani-ready-templates";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import type { Template, Lang } from "./types";

export function TemplateDetailModal({ template, open, onClose, onDelete, lang }: {
    template: Template | null; open: boolean; onClose: () => void; onDelete: (id: string) => Promise<void>; lang: Lang;
}) {
    const t = T[lang];
    if (!template) return null;
    const st = STATUS_CONFIG[template.status];
    const [deleting, setDeleting] = useState(false);

    const handleDeleteClick = async () => {
        if (confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا القالب؟" : "Are you sure you want to delete this template?")) {
            setDeleting(true);
            await onDelete(template.id);
            setDeleting(false);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 dark:bg-[#25D366]/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#25D366]" />
                        </div>
                        <div>
                            <DialogTitle className="font-mono text-base dark:text-white">{template.name}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <CategoryBadge category={template.category} lang={lang} />
                                <StatusBadge status={template.status} label={t.status[template.status]} />
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                            { label: t.detail.id, value: template.id },
                            { label: t.table.language, value: template.language },
                            { label: t.detail.created, value: template.createdAt ?? "—" },
                            { label: t.detail.updated, value: template.updatedAt ?? "—" },
                        ].map(r => (
                            <div key={r.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                                <p className="text-gray-400 dark:text-gray-500 mb-0.5">{r.label}</p>
                                <p className="font-mono font-medium text-gray-800 dark:text-gray-200 break-all text-[11px]">{r.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Body */}
                    {template.body && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t.body.replace(" *", "")}</p>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{template.body}</p>
                            </div>
                        </div>
                    )}

                    {/* Rejection reason */}
                    {template.status === "REJECTED" && template.rejectedReason && (
                        <div className="flex gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300">{t.detail.rejectedReason}</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{template.rejectedReason}</p>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    {template.buttons && template.buttons.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.buttons}</p>
                            {template.buttons.map((btn, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-xs">
                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{btn.type}</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{btn.text}</span>
                                    {btn.value && <span className="text-gray-400 truncate">{btn.value}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        {!(template.isWaniReady || WANI_READY.some(w => w.name === template.name)) && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDeleteClick}
                                disabled={deleting}
                                className="gap-1.5 border-red-200 dark:border-red-900/50 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                {t.detail.delete}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" className="gap-1.5 dark:border-gray-600 dark:text-gray-300"
                            onClick={async () => {
                                if (template.body) {
                                    await navigator.clipboard.writeText(template.body);
                                    toast.success(lang === "ar" ? "تم نسخ نص القالب" : "Template text copied");
                                }
                            }}
                        >
                            <Copy className="w-3.5 h-3.5" /> {t.detail.duplicate}
                        </Button>
                        {!(template.isWaniReady || WANI_READY.some(w => w.name === template.name)) && template.status !== "APPROVED" && (
                            <Button size="sm" variant="outline" className="gap-1.5 dark:border-gray-600 dark:text-gray-300">
                                <Pencil className="w-3.5 h-3.5" /> {t.detail.edit}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={onClose}
                            className="mr-auto dark:border-gray-600 dark:text-gray-300">
                            {t.detail.close}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}