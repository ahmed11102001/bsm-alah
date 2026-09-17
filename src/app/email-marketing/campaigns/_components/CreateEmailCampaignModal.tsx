"use client";

import { useState } from "react";
import { X, Send, FileText, Users, Sparkles, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { EmailCampaignDTO, EmailTemplateDTO } from "../../types";

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
  onCreate: (campaign: EmailCampaignDTO, sendNow: boolean) => void;
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
    await new Promise((r) => setTimeout(r, 800));

    const chosenTemplate = templates.find((t) => t.id === selectedTemplateId);
    const targetCount = targetType === "ALL" ? totalContactsCount : Math.min(220, totalContactsCount);

    const newCampaign: EmailCampaignDTO = {
      id: `cmp_${Date.now()}`,
      name: name.trim(),
      subject: subject.trim(),
      templateId: selectedTemplateId,
      templateName: chosenTemplate?.name || "قالب بريدي",
      targetTag: targetType === "TAG" ? selectedTag : null,
      targetCount,
      sentCount: sendNow ? targetCount : 0,
      deliveredCount: sendNow ? targetCount - 2 : 0,
      failedCount: sendNow ? 2 : 0,
      openedCount: 0,
      status: sendNow ? "COMPLETED" : "DRAFT",
      createdAt: new Date().toISOString(),
      completedAt: sendNow ? new Date().toISOString() : null,
    };

    onCreate(newCampaign, sendNow);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#04241b] p-6 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">معالج إنشاء حملة بريدية جديدة</h3>
              <p className="text-[11px] text-white/50">خطوة {step} من 3</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 my-5">
          <div className={`h-1.5 rounded-full ${step >= 1 ? "bg-blue-500" : "bg-white/10"}`} />
          <div className={`h-1.5 rounded-full ${step >= 2 ? "bg-blue-500" : "bg-white/10"}`} />
          <div className={`h-1.5 rounded-full ${step >= 3 ? "bg-blue-500" : "bg-white/10"}`} />
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-white/80 mb-1.5">
                اسم الحملة (للتعريف الداخلي) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: نشرة سبتمبر الإخبارية، عرض اليوم الوطني"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-white/80 mb-1.5">
                عنوان الرسالة (Subject Line) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="العنوان الذي سيراه العميل في صندوق البريد..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Choose Template */}
        {step === 2 && (
          <div className="space-y-3 text-xs">
            <label className="block font-semibold text-white/80 mb-1">
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
                        ? "border-blue-500 bg-blue-500/15"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-white text-xs">{tpl.name}</h4>
                      <p className="text-[11px] text-white/50 mt-0.5">{tpl.subject}</p>
                    </div>
                    {selected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shrink-0">
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
            <label className="block font-semibold text-white/80 mb-1">
              تحديد الجمهور المستهدف:
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType("ALL")}
                className={`p-4 rounded-2xl border text-right transition-all ${
                  targetType === "ALL"
                    ? "border-blue-500 bg-blue-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                <Users className="h-5 w-5 mb-2 text-blue-400" />
                <div className="font-bold text-xs">كافة المشتركين</div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  ({totalContactsCount} جهة اتصال)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType("TAG")}
                className={`p-4 rounded-2xl border text-right transition-all ${
                  targetType === "TAG"
                    ? "border-blue-500 bg-blue-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                <Sparkles className="h-5 w-5 mb-2 text-amber-400" />
                <div className="font-bold text-xs">شريحة محددة (وسم)</div>
                <div className="text-[10px] text-white/40 mt-0.5">استهداف مخصص</div>
              </button>
            </div>

            {targetType === "TAG" && (
              <div className="mt-3">
                <label className="block text-[11px] text-white/60 mb-1">اختر الوسم المستهدف:</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#04241b] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      وسم: {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-white/50">
              💡 سيتم إرسال الحملة لجهات الاتصال المشتركة فقط، مع استبعاد الملغى اشتراكهم تلقائيًا.
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((p) => ((p - 1) as any))}
              className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-all active:scale-95"
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
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  حفظ كمسودة
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinish(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:brightness-110 active:scale-95"
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
