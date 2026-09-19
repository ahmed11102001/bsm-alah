"use client";

import { useState } from "react";
import { X, Send, FileText, Users, Sparkles, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { EmailTemplateDTO } from "../../types";

/** الحد الأدنى اللي بيتبعت فعليًا للسيرفر — بدون أي أرقام (الأرقام بتيجي من الـfetch بعد الإنشاء). */
export interface CreateCampaignPayload {
  name: string;
  subject: string;
  templateId: string;
  targetTag: string | null;
}

export default function CreateEmailCampaignModal({
  isOpen,
  templates,
  availableTags,
  totalContactsCount,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  templates: EmailTemplateDTO[];
  availableTags: string[];
  totalContactsCount: number;
  onClose: () => void;
  onCreate: (campaign: CreateCampaignPayload, sendNow: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id || ""
  );
  const [targetType, setTargetType] = useState<"ALL" | "TAG">("ALL");
  const [selectedTag, setSelectedTag] = useState<string>(availableTags[0] || "");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim() || !subject.trim()) {
        toast.error("يرجى إدخال اسم الحملة وعنوان الرسالة أولاً");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedTemplateId) {
        toast.error("يرجى اختيار قالب للحملة");
        return;
      }
      setStep(3);
    }
  };

  const handleFinish = async (sendNow: boolean) => {
    setSubmitting(true);

    // بيتبعت للسيرفر بس الحقول الحقيقية — مفيش أرقام وهمية (كانت dead code:
    // الأب بياخد 4 حقول بس ويعمل loadData بعدها، فالأرقام المزيفة عمرها ما اتعرضت).
    onCreate(
      {
        name: name.trim(),
        subject: subject.trim(),
        templateId: selectedTemplateId,
        targetTag: targetType === "TAG" ? selectedTag : null,
      },
      sendNow
    );
    setSubmitting(false);

    if (sendNow) {
      toast.success(`تم إطلاق الحملة البريدية "${name}" بنجاح! 🚀`);
    } else {
      toast.success(`تم حفظ مسودة الحملة "${name}" بنجاح.`);
    }

    onClose();
    // Reset wizard
    setStep(1);
    setName("");
    setSubject("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">معالج إنشاء حملة بريدية جديدة</h3>
              <p className="text-[11px] text-slate-500">خطوة {step} من 3</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 my-5">
          <div className={`h-1.5 rounded-full ${step >= 1 ? "bg-red-600" : "bg-slate-100"}`} />
          <div className={`h-1.5 rounded-full ${step >= 2 ? "bg-red-600" : "bg-slate-100"}`} />
          <div className={`h-1.5 rounded-full ${step >= 3 ? "bg-red-600" : "bg-slate-100"}`} />
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                اسم الحملة (للتعريف الداخلي) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: نشرة سبتمبر الإخبارية، عرض اليوم الوطني"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                عنوان الرسالة (Subject Line) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="العنوان الذي سيراه العميل في صندوق البريد..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Choose Template */}
        {step === 2 && (
          <div className="space-y-3 text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              اختر قالب البريد الذي تريد إرساله:
            </label>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {templates.map((tpl) => {
                const selected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`flex items-start justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selected
                        ? "border-red-500 bg-red-50/50"
                        : "border-slate-200 bg-slate-50 hover:border-red-200 hover:bg-red-50/20"
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{tpl.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tpl.subject}</p>
                    </div>
                    {selected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shrink-0 shadow-sm">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Audience Targeting & Confirmation */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              تحديد الجمهور المستهدف:
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType("ALL")}
                className={`p-4 rounded-2xl border text-right transition-all ${
                  targetType === "ALL"
                    ? "border-red-500 bg-red-50/60 text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Users className="h-5 w-5 mb-2 text-red-600" />
                <div className="font-bold text-xs">كافة المشتركين</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  ({totalContactsCount} جهة اتصال)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType("TAG")}
                className={`p-4 rounded-2xl border text-right transition-all ${
                  targetType === "TAG"
                    ? "border-red-500 bg-red-50/60 text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Sparkles className="h-5 w-5 mb-2 text-amber-500" />
                <div className="font-bold text-xs">شريحة محددة (وسم)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">استهداف مخصص</div>
              </button>
            </div>

            {targetType === "TAG" && (
              <div className="mt-3">
                <label className="block text-[11px] text-slate-500 mb-1">اختر الوسم المستهدف:</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-red-500 focus:outline-none"
                >
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      وسم: {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
              💡 سيتم إرسال الحملة لجهات الاتصال المشتركة فقط، مع استبعاد الملغى اشتراكهم تلقائيًا.
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((p) => ((p - 1) as any))}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 transition-all active:scale-95 shadow-md shadow-red-500/20"
              >
                <span>التالي</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinish(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  حفظ كمسودة
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinish(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:from-red-700 hover:to-rose-700 active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitting ? "جاري الإرسال..." : "إرسال الآن"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
