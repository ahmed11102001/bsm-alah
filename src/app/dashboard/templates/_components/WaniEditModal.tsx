"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    RefreshCw, Pencil, Shield, AlertCircle, Smartphone, Sparkles, Loader2,
} from "lucide-react";
import { T } from "./i18n";
import { WANI_READY } from "./wani-ready-templates";
import { extractVarMeta, validateVarsPreserved } from "./var-meta-utils";
import { MiniWhatsAppPreview } from "./MiniWhatsAppPreview";
import type { Template, TemplateButton, Lang } from "./types";

// ─── WaniEditModal ────────────────────────────────────────────────────────────
// بيسمح باليوزر يعدل النصوص الحرة بس — المتغيرات {{N}} محمية بـ regex
// المنطق: بنقسم الـ body لـ segments — كل segment إما نص حر أو متغير مقفول
// ─────────────────────────────────────────────────────────────────────────────
export function WaniEditModal({ template, open, onClose, onSendCustomized, lang }: {
    template: Template | null;
    open: boolean;
    onClose: () => void;
    onSendCustomized: (tpl: Template) => Promise<boolean>;
    lang: Lang;
}) {
    const tw = T[lang].waniEdit as any;
    const t = T[lang] as any;

    const [tplLang, setTplLang] = useState<Lang>("ar");
    const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);

    // state يبدأ من القالب الأصلي
    const [body, setBody] = useState("");
    const [footer, setFooter] = useState("");
    const [buttons, setButtons] = useState<TemplateButton[]>([]);
    const [varError, setVarError] = useState(false);
    const [sending, setSending] = useState(false);

    // كلما فتح الـ modal على قالب جديد نعيد التهيئة
    useEffect(() => {
        if (!template) return;
        const variant = WANI_READY.find(t => t.name === template.name && t.language === tplLang) || template;
        setActiveTemplate(variant);
        setBody(variant.body ?? "");
        setFooter(variant.footer ?? "");
        setButtons(variant.buttons ? [...variant.buttons] : []);
        setVarError(false);
    }, [template, tplLang]);

    if (!template) return null;

    const originalBody = activeTemplate?.body ?? "";
    const varMeta = extractVarMeta(originalBody);
    const originalVars = [...originalBody.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]);

    // المتغيرات الأصلية بالترتيب كـ pill مرئية في الـ body textarea
    const handleBodyChange = (val: string) => {
        setBody(val);
        setVarError(!validateVarsPreserved(originalBody, val));
    };

    const handleReset = () => {
        setBody(originalBody);
        setFooter(activeTemplate?.footer ?? "");
        setButtons(activeTemplate?.buttons ? [...activeTemplate.buttons] : []);
        setVarError(false);
    };

    const handleSend = async () => {
        if (varError) return;
        if (!validateVarsPreserved(originalBody, body)) { setVarError(true); return; }
        setSending(true);
        const customized: Template = { ...activeTemplate!, body, footer, buttons };
        const ok = await onSendCustomized(customized);
        setSending(false);
        if (ok) onClose();
    };

    const updateBtnText = (i: number, val: string) => {
        const next = [...buttons];
        next[i] = { ...next[i], text: val };
        setButtons(next);
    };

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <Pencil className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="font-mono text-base dark:text-white">{tw.title}</DialogTitle>
                                <p className="text-xs text-muted-foreground mt-0.5 font-normal">{tw.subtitle}</p>
                            </div>
                        </div>
                        <div className="flex bg-muted rounded-lg p-1 gap-1">
                            <button onClick={() => setTplLang("ar")} className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${tplLang === "ar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                {t.langToggleAR}
                            </button>
                            <button onClick={() => setTplLang("en")} className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${tplLang === "en" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                {t.langToggleEN}
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-5 mt-2">
                    {/* ── Left: Edit panel (3 cols) ─────────────────────────────────── */}
                    <div className="sm:col-span-3 space-y-4">

                        {/* System Template Alert */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">تنبيه</p>
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
                                {lang === "ar"
                                    ? "هذا قالب نظام مرتبط بأتمتة Wani. يمكنك تعديل نص الرسالة وعناوين الأزرار فقط. لا يمكن حذف أو إضافة أو تغيير المتغيرات أو عدد الأزرار أو معرفاتها، لأن ذلك سيؤثر على عمل الأتمتة."
                                    : "This is a Wani system template. You can only edit the message text and button labels. You cannot delete, add, or change variables, button count, or IDs, as it will break the automation."}
                            </p>

                            {varMeta.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-amber-200/50 dark:border-amber-700/50">
                                    {varMeta.map(v => (
                                        <span key={v.num}
                                            className="inline-flex items-center gap-1 bg-card border border-amber-300 dark:border-amber-600 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                                            <span className="text-amber-400">🔒</span>
                                            {`{{${v.num}}}`}
                                            <span className="font-normal text-muted-foreground">
                                                {lang === "ar" ? v.meaning_ar : v.meaning_en}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Body textarea */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <Label className="text-sm font-semibold text-foreground/80">
                                    {lang === "ar" ? "نص الرسالة" : "Message Body"}
                                </Label>
                                <button onClick={handleReset}
                                    className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                                    <RefreshCw className="w-3 h-3" /> {tw.resetBtn}
                                </button>
                            </div>
                            <Textarea
                                value={body}
                                onChange={e => handleBodyChange(e.target.value)}
                                rows={6}
                                dir="auto"
                                className={`font-mono text-sm resize-none bg-background border-border transition-colors
                  ${varError ? "border-red-400 dark:border-red-500 bg-red-50/30 dark:bg-red-900/10" : ""}`}
                            />
                            {/* Var error */}
                            {varError && (
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{tw.varMissing}</span>
                                    <div className="flex gap-1 flex-wrap">
                                        {originalVars
                                            .filter(v => !body.includes(`{{${v}}}`))
                                            .filter((v, i, a) => a.indexOf(v) === i)
                                            .map(v => (
                                                <button key={v}
                                                    onClick={() => { setBody(b => b + ` {{${v}}}`); setVarError(false); }}
                                                    className="font-mono bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded text-[10px] transition-colors">
                                                    + {`{{${v}}}`}
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                            {/* Quick-insert locked vars */}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {varMeta.map(v => (
                                    <button key={v.num}
                                        onClick={() => { setBody(b => b + `{{${v.num}}}`); setVarError(false); }}
                                        title={lang === "ar" ? `إدراج ${v.meaning_ar}` : `Insert ${v.meaning_en}`}
                                        className="text-[10px] font-mono bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground px-2 py-0.5 rounded-md border border-border transition-colors">
                                        + {`{{${v.num}}}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div>
                            <Label className="text-sm font-semibold text-foreground/80 mb-1.5 block">
                                {tw.footerLabel}
                                <span className="text-[11px] font-normal text-muted-foreground mr-1">({footer.length}/60)</span>
                            </Label>
                            <Input value={footer} maxLength={60} dir="auto"
                                onChange={e => setFooter(e.target.value)}
                                placeholder={lang === "ar" ? "مثل: متجرك على واتساب" : "e.g. Your WhatsApp Store"}
                                className="bg-background border-border" />
                        </div>

                        {/* Button texts — قابل للتعديل، الـ value (الرابط) ثابت */}
                        {buttons.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-foreground/80 block">
                                    {tw.btnTextLabel}
                                </Label>
                                {buttons.map((btn, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-muted/70 rounded-xl px-3 py-2 border border-border">
                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono flex-shrink-0">{btn.type}</span>
                                        <Input
                                            value={btn.text}
                                            onChange={e => updateBtnText(i, e.target.value)}
                                            dir="auto"
                                            placeholder={lang === "ar" ? "نص الزر" : "Button text"}
                                            className="h-7 text-xs flex-1 bg-transparent border-0 focus-visible:ring-0 p-0 shadow-none"
                                        />
                                        {/* value مقفول */}
                                        <span className="text-[9px] text-muted-foreground font-mono truncate max-w-20 flex items-center gap-0.5 flex-shrink-0">
                                            <span className="text-amber-400">🔒</span> {btn.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Right: Live preview (2 cols) ──────────────────────────────── */}
                    <div className="sm:col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5" />
                            {lang === "ar" ? "معاينة مباشرة" : "Live Preview"}
                        </p>
                        <MiniWhatsAppPreview
                            body={body}
                            footer={footer}
                            buttons={buttons}
                            exampleVars={activeTemplate?.exampleVars ?? []}
                        />
                    </div>
                </div>

                {/* ── Actions ─────────────────────────────────────────────────────── */}
                <div className="flex gap-2 pt-4 border-t border-border mt-2">
                    <Button variant="outline" onClick={onClose} className="border-border text-foreground">
                        {lang === "ar" ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={varError || sending}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 disabled:opacity-60">
                        {sending
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> {lang === "ar" ? "جاري الإرسال..." : "Sending..."}</>
                            : <><Sparkles className="w-4 h-4" /> {tw.saveAndSend}</>
                        }
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}