"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Type, Image, Video, Paperclip, Info, Plus, AlertCircle, X, ChevronRight, Loader2, CheckCheck,
} from "lucide-react";
import { T } from "./i18n";
import type { FormState, Lang, HeaderType, ButtonType, TemplateButton } from "./types";

export function Step2({ form, setForm, lang, onSubmit, onBack, submitting, success }: {
    form: FormState; setForm: (f: FormState) => void; lang: Lang;
    onSubmit: (draft: boolean) => void; onBack: () => void;
    submitting: boolean; success: boolean;
}) {
    const t = T[lang];
    const [errors, setErrors] = useState<Record<string, string>>({});

    const addVar = () => {
        const count = (form.body.match(/\{\{(\d+)\}\}/g) ?? []).length;
        setForm({ ...form, body: form.body + ` {{${count + 1}}}`, exampleVars: [...form.exampleVars, ""] });
    };

    const validateVars = (body: string) => {
        const nums = [...body.matchAll(/\{\{(\d+)\}\}/g)].map(m => parseInt(m[1])).sort((a, b) => a - b);
        for (let i = 0; i < nums.length; i++) if (nums[i] !== i + 1) return false;
        return true;
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.body.trim()) e.body = t.validation.bodyRequired;
        else if (!validateVars(form.body)) e.body = t.validation.varSkip;
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const varMatches = [...form.body.matchAll(/\{\{(\d+)\}\}/g)].map(m => parseInt(m[1])).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

    const addButton = () => setForm({ ...form, buttons: [...form.buttons, { type: "quick_reply", text: "", value: "" }] });
    const removeButton = (i: number) => setForm({ ...form, buttons: form.buttons.filter((_, j) => j !== i) });
    const updateButton = (i: number, field: keyof TemplateButton, val: string) => {
        const btns = [...form.buttons]; btns[i] = { ...btns[i], [field]: val };
        setForm({ ...form, buttons: btns });
    };

    if (success) return (
        <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 text-2xl">✅</div>
            <h3 className="text-lg font-bold text-foreground mb-2">{t.successTitle}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">{t.successMsg}</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <Label className="text-sm font-semibold text-foreground/80 mb-2 block">{t.header}</Label>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {(["none", "text", "image", "video", "document"] as HeaderType[]).map(h => (
                        <button key={h}
                            onClick={() => setForm({ ...form, headerType: h })}
                            className={`py-1.5 rounded-lg text-xs font-medium border transition-all
                ${form.headerType === h
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/50"
                                }`}
                        >
                            {form.headerType === h && h !== "none" && (
                                <span className="flex justify-center mb-0.5">
                                    {h === "text" && <Type className="w-3 h-3" />}
                                    {h === "image" && <Image className="w-3 h-3" />}
                                    {h === "video" && <Video className="w-3 h-3" />}
                                    {h === "document" && <Paperclip className="w-3 h-3" />}
                                </span>
                            )}
                            {t.headerTypes[h]}
                        </button>
                    ))}
                </div>
                {form.headerType === "text" && (
                    <Input value={form.headerText} onChange={e => setForm({ ...form, headerText: e.target.value })}
                        placeholder={lang === "ar" ? "عنوان الرسالة" : "Message title"}
                        className="bg-background border-border" />
                )}
                {(form.headerType === "image" || form.headerType === "video" || form.headerType === "document") && (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                        <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">{t.mediaPlaceholder}</p>
                    </div>
                )}
            </div>

            {/* Body */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-semibold text-foreground/80">{t.body}</Label>
                    <button onClick={addVar} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> {t.addVar}
                    </button>
                </div>
                <Textarea
                    value={form.body} rows={5}
                    onChange={e => {
                        const newBody = e.target.value;
                        const cnt = (newBody.match(/\{\{(\d+)\}\}/g) ?? []).length;
                        const vars = [...form.exampleVars];
                        while (vars.length < cnt) vars.push("");
                        setForm({ ...form, body: newBody, exampleVars: vars.slice(0, Math.max(cnt, vars.length)) });
                    }}
                    placeholder={lang === "ar" ? "مرحباً {{1}}\n\nتم تأكيد طلبك رقم {{2}}." : "Hello {{1}},\n\nYour order {{2}} is confirmed."}
                    className={`font-mono text-sm resize-none bg-background border-border ${errors.body ? "border-red-400" : ""}`}
                />
                <p className="text-xs text-muted-foreground mt-1">{t.bodyHint}</p>
                {errors.body && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.body}</p>}

                {/* Example vars */}
                {varMatches.length > 0 && (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">{t.examplesTitle}</p>
                        <div className="space-y-2">
                            {varMatches.map(n => (
                                <div key={n} className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded w-10 text-center flex-shrink-0">{`{{${n}}}`}</span>
                                    <Input
                                        value={form.exampleVars[n - 1] ?? ""}
                                        onChange={e => {
                                            const ev = [...form.exampleVars];
                                            ev[n - 1] = e.target.value;
                                            setForm({ ...form, exampleVars: ev });
                                        }}
                                        placeholder={t.examplePlaceholder}
                                        className="h-7 text-xs bg-background border-border"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div>
                <Label className="text-sm font-semibold text-foreground/80 mb-1.5 block">
                    {t.footer} <span className="text-[11px] font-normal text-muted-foreground">({form.footer.length}/60)</span>
                </Label>
                <Input value={form.footer} maxLength={60}
                    onChange={e => setForm({ ...form, footer: e.target.value })}
                    placeholder={lang === "ar" ? "مثل: Wani Store" : "e.g. Wani Store"}
                    className="bg-background border-border" />
            </div>

            {/* Buttons */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-foreground/80">{t.buttons}</Label>
                    {form.buttons.length < 3 && (
                        <button onClick={addButton} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> {t.addButton}
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {form.buttons.map((btn, i) => (
                        <div key={i} className="bg-muted/70 rounded-xl p-3 border border-border space-y-2.5">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    {(["url", "phone", "quick_reply"] as ButtonType[]).map(bt => (
                                        <button key={bt}
                                            onClick={() => updateButton(i, "type", bt)}
                                            className={`text-[11px] px-2 py-1 rounded-lg font-medium border transition-all
                        ${btn.type === bt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                                        >{t.btnTypes[bt]}</button>
                                    ))}
                                </div>
                                <button onClick={() => removeButton(i)} className="mr-auto p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <Input value={btn.text} onChange={e => updateButton(i, "text", e.target.value)}
                                placeholder={btn.type === "quick_reply" ? t.btnQR : t.btnText}
                                className="h-8 text-sm bg-background border-border" />
                            {btn.type !== "quick_reply" && (
                                <Input dir="ltr" value={btn.value} onChange={e => updateButton(i, "value", e.target.value)}
                                    placeholder={btn.type === "url" ? "https://..." : "+201234567890"}
                                    className="h-8 text-sm font-mono bg-background border-border" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-border">
                <Button variant="outline" onClick={onBack} className="gap-1.5 border-border text-foreground">
                    <ChevronRight className="w-4 h-4" /> {t.back}
                </Button>
                <Button variant="outline"
                    onClick={() => { if (validate()) onSubmit(true); }}
                    disabled={submitting}
                    className="flex-1 border-border text-foreground">
                    {t.saveDraft}
                </Button>
                <Button
                    onClick={() => { if (validate()) onSubmit(false); }}
                    disabled={submitting}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {t.submitReview}
                </Button>
            </div>
        </div>
    );
}