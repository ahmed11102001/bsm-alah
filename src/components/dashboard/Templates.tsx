"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw, Plus, Search, CheckCircle2, Clock, XCircle, Ban,
  ChevronRight, ChevronLeft, Trash2, Copy, Eye, Pencil,
  Megaphone, Package, Shield, Globe, X, Loader2,
  Smartphone, LayoutGrid, FileText, Type, Image, Video,
  Paperclip, Phone, ExternalLink, MessageSquare, Sparkles,
  AlertCircle, Crown, Zap, CheckCheck, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
type HeaderType = "none" | "text" | "image" | "video" | "document";
type ButtonType = "url" | "phone" | "quick_reply";
type View = "list" | "create" | "detail";
type Lang = "ar" | "en";

interface TemplateButton { type: ButtonType; text: string; value: string; }
interface Template {
  id: string; name: string; category: TemplateCategory; language: string;
  status: TemplateStatus; body?: string; headerType?: HeaderType;
  headerText?: string; footer?: string; buttons?: TemplateButton[];
  createdAt?: string; updatedAt?: string; rejectedReason?: string;
  isWaniReady?: boolean; exampleVars?: string[];
}
interface FormState {
  name: string; category: TemplateCategory | ""; language: string;
  headerType: HeaderType; headerText: string; body: string;
  footer: string; buttons: TemplateButton[]; exampleVars: string[];
}

// ─── Inline i18n ─────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: "قوالب واتساب", subtitle: "أنشئ وأدر قوالبك المعتمدة من Meta",
    newTemplate: "إنشاء قالب", syncBtn: "مزامنة من Meta", syncing: "جاري المزامنة...",
    stats: { total: "إجمالي القوالب", approved: "معتمدة", pending: "قيد المراجعة", rejected: "مرفوضة", paused: "متوقفة" },
    filters: { all: "الكل", search: "ابحث بالاسم...", status: "الحالة", category: "التصنيف", language: "اللغة" },
    status: { APPROVED: "معتمد", PENDING: "قيد المراجعة", REJECTED: "مرفوض", PAUSED: "متوقف" },
    category: { MARKETING: "تسويقي", UTILITY: "خدمي", AUTHENTICATION: "مصادقة" },
    table: { name: "اسم القالب", category: "الفئة", language: "اللغة", updated: "آخر تعديل", status: "الحالة", actions: "" },
    empty: "لا توجد قوالب بعد", emptyHint: "أنشئ قالبك الأول أو مزامنة من Meta",
    waniReady: "قوالب Wani الجاهزة", waniReadyDesc: "قوالب مبنية مسبقاً للمتجر — خصّصها قبل الإرسال",
    myTemplates: "قوالبي", sendReview: "إرسال للمراجعة", submitted: "تم الإرسال ✓",
    waniEdit: {
      title: "تخصيص القالب",
      subtitle: "عدّل النصوص الحرة — المتغيرات محمية ولا يمكن حذفها",
      lockedVarsTitle: "متغيرات الأتمتة (محمية)",
      lockedVarsHint: "تُملأ تلقائياً من بيانات المتجر عند الإرسال",
      footerLabel: "Footer",
      btnTextLabel: "نص الزر",
      resetBtn: "إعادة للنص الأصلي",
      saveAndSend: "حفظ وإرسال للمراجعة",
      varMissing: "لا يمكن حذف المتغيرات الأصلية",
      customize: "تخصيص",
    },
    step1: "المعلومات الأساسية", step2: "محتوى الرسالة",
    templateName: "اسم القالب", templateNameHint: "حروف صغيرة وأرقام و _ فقط",
    categoryLabel: "الفئة", languageLabel: "اللغة",
    header: "Header (اختياري)", headerTypes: { none: "بدون Header", text: "نص", image: "صورة", video: "فيديو", document: "ملف PDF" },
    body: "Body *", bodyHint: "استخدم {{1}} {{2}} ... للمتغيرات",
    addVar: "+ إضافة متغير", footer: "Footer (اختياري)", footerHint: "حد أقصى 60 حرف",
    addButton: "+ إضافة زر", buttons: "أزرار (اختياري)",
    btnTypes: { url: "رابط موقع", phone: "اتصال هاتفي", quick_reply: "رد سريع" },
    btnText: "نص الزر", btnValue: "الرابط / الرقم", btnQR: "نص الرد السريع",
    examplesTitle: "أمثلة للمتغيرات", examplePlaceholder: "مثال...",
    preview: "معاينة مباشرة", saveDraft: "حفظ كمسودة", submitReview: "إرسال للمراجعة",
    next: "التالي", back: "رجوع", cancel: "إلغاء",
    successTitle: "تم إرسال القالب إلى Meta ✅", successMsg: "الحالة الحالية: قيد المراجعة — قد تستغرق عدة دقائق أو ساعات.",
    validation: { nameStart: "لا يمكن أن يبدأ اسم القالب برقم", nameChars: "يسمح فقط بحروف صغيرة وأرقام و _", varSkip: "لا يمكن تخطي أرقام المتغيرات", bodyRequired: "محتوى الرسالة مطلوب", categoryRequired: "الفئة مطلوبة", nameRequired: "اسم القالب مطلوب" },
    detail: { id: "معرّف القالب", created: "تاريخ الإنشاء", updated: "آخر تحديث", rejectedReason: "سبب الرفض", duplicate: "نسخ", edit: "تعديل", delete: "حذف", close: "إغلاق" },
    languages: { ar: "العربية", en: "الإنجليزية", fr: "الفرنسية", es: "الإسبانية" },
    mediaPlaceholder: "سيتم طلب ملف تجريبي من Meta أثناء المراجعة",
  },
  en: {
    title: "WhatsApp Templates", subtitle: "Create and manage your Meta-approved templates",
    newTemplate: "New Template", syncBtn: "Sync from Meta", syncing: "Syncing...",
    stats: { total: "Total Templates", approved: "Approved", pending: "Pending", rejected: "Rejected", paused: "Paused" },
    filters: { all: "All", search: "Search by name...", status: "Status", category: "Category", language: "Language" },
    status: { APPROVED: "Approved", PENDING: "Pending", REJECTED: "Rejected", PAUSED: "Paused" },
    category: { MARKETING: "Marketing", UTILITY: "Utility", AUTHENTICATION: "Authentication" },
    table: { name: "Template Name", category: "Category", language: "Language", updated: "Last Updated", status: "Status", actions: "" },
    empty: "No templates yet", emptyHint: "Create your first template or sync from Meta",
    waniReady: "Wani Ready Templates", waniReadyDesc: "Pre-built store templates — customize before sending",
    myTemplates: "My Templates", sendReview: "Send for Review", submitted: "Submitted ✓",
    waniEdit: {
      title: "Customize Template",
      subtitle: "Edit free text only — variables are locked and cannot be removed",
      lockedVarsTitle: "Automation Variables (Locked)",
      lockedVarsHint: "Auto-filled from store data when sending",
      footerLabel: "Footer",
      btnTextLabel: "Button Text",
      resetBtn: "Reset to Original",
      saveAndSend: "Save & Send for Review",
      varMissing: "Original variables cannot be removed",
      customize: "Customize",
    },
    step1: "Basic Info", step2: "Message Content",
    templateName: "Template Name", templateNameHint: "Lowercase letters, numbers and _ only",
    categoryLabel: "Category", languageLabel: "Language",
    header: "Header (optional)", headerTypes: { none: "No Header", text: "Text", image: "Image", video: "Video", document: "PDF" },
    body: "Body *", bodyHint: "Use {{1}} {{2}} ... for variables",
    addVar: "+ Add Variable", footer: "Footer (optional)", footerHint: "Max 60 characters",
    addButton: "+ Add Button", buttons: "Buttons (optional)",
    btnTypes: { url: "Website URL", phone: "Phone Call", quick_reply: "Quick Reply" },
    btnText: "Button Text", btnValue: "URL / Phone", btnQR: "Quick Reply Text",
    examplesTitle: "Variable Examples", examplePlaceholder: "Example...",
    preview: "Live Preview", saveDraft: "Save Draft", submitReview: "Submit for Review",
    next: "Next", back: "Back", cancel: "Cancel",
    successTitle: "Template Sent to Meta ✅", successMsg: "Status: Pending Review — may take a few minutes or hours.",
    validation: { nameStart: "Template name cannot start with a number", nameChars: "Only lowercase letters, numbers and _ allowed", varSkip: "Variable numbers cannot skip values", bodyRequired: "Message body is required", categoryRequired: "Category is required", nameRequired: "Template name is required" },
    detail: { id: "Template ID", created: "Created At", updated: "Last Updated", rejectedReason: "Rejection Reason", duplicate: "Duplicate", edit: "Edit", delete: "Delete", close: "Close" },
    languages: { ar: "Arabic", en: "English", fr: "French", es: "Spanish" },
    mediaPlaceholder: "Meta will request a sample file during review",
  },
};

// ─── Wani-Ready pre-built templates ──────────────────────────────────────────
const WANI_READY: Template[] = [
  {
    id: "wani_order_confirm", name: "wani_order_confirm",
    category: "UTILITY", language: "ar", status: "PENDING", isWaniReady: true,
    headerType: "none",
    body: "مرحباً {{1}} 👋\n\nتم تأكيد طلبك رقم *{{2}}* بنجاح ✅\nإجمالي الطلب: *{{3}}*\n\nشكراً لتسوقك معنا! سيصلك تحديث عند الشحن.",
    footer: "Wani Store",
    exampleVars: ["أحمد", "ORD-12345", "١٢٥ ج.م"],
  },
  {
    id: "wani_order_shipped", name: "wani_order_shipped",
    category: "UTILITY", language: "ar", status: "PENDING", isWaniReady: true,
    headerType: "none",
    body: "مرحباً {{1}} 📦\n\nطلبك رقم *{{2}}* في طريقه إليك! 🚚\nرقم التتبع: *{{3}}*\n\nتوقع وصوله خلال 2-4 أيام.",
    footer: "Wani Store",
    exampleVars: ["مريم", "ORD-12345", "TRK-789"],
  },
  {
    id: "wani_cart_abandon", name: "wani_cart_abandon",
    category: "MARKETING", language: "ar", status: "PENDING", isWaniReady: true,
    headerType: "none",
    body: "مرحباً {{1}} 🛒\n\nنسيت *{{2}}* في سلتك!\nالإجمالي: *{{3}}*\n\nأكمل طلبك الآن قبل نفاد المخزون 👇",
    buttons: [{ type: "url", text: "إكمال الطلب", value: "{{4}}" }],
    exampleVars: ["سارة", "قميص قطني أزرق", "٢٤٠ ج.م", "https://store.example.com/cart"],
    footer: "Wani Store",
  },
];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TemplateStatus, { icon: React.ReactNode; cls: string; dot: string }> = {
  APPROVED: { icon: <CheckCircle2 className="w-3 h-3" />, cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700", dot: "bg-emerald-500" },
  PENDING: { icon: <Clock className="w-3 h-3" />, cls: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/30  dark:text-amber-300  dark:border-amber-700", dot: "bg-amber-400" },
  REJECTED: { icon: <XCircle className="w-3 h-3" />, cls: "bg-red-50    text-red-700    border-red-200    dark:bg-red-900/30    dark:text-red-300    dark:border-red-700", dot: "bg-red-500" },
  PAUSED: { icon: <Ban className="w-3 h-3" />, cls: "bg-gray-100  text-gray-600   border-gray-200   dark:bg-gray-700      dark:text-gray-400   dark:border-gray-600", dot: "bg-gray-400" },
};

const CATEGORY_CONFIG: Record<TemplateCategory, { icon: React.ReactNode; cls: string; label_ar: string }> = {
  MARKETING: { icon: <Megaphone className="w-3.5 h-3.5" />, cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700", label_ar: "تسويقي" },
  UTILITY: { icon: <Package className="w-3.5 h-3.5" />, cls: "bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/30   dark:text-blue-300   dark:border-blue-700", label_ar: "خدمي" },
  AUTHENTICATION: { icon: <Shield className="w-3.5 h-3.5" />, cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700", label_ar: "مصادقة" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status, label }: { status: TemplateStatus; label: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}

function CategoryBadge({ category, lang }: { category: TemplateCategory; lang: Lang }) {
  const cfg = CATEGORY_CONFIG[category];
  const t = T[lang];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.cls}`}>
      {cfg.icon} {t.category[category]}
    </span>
  );
}

// ─── WhatsApp Preview ─────────────────────────────────────────────────────────
function WhatsAppPreview({ form, lang }: { form: FormState; lang: Lang }) {
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

// ─── Wani Edit Modal ──────────────────────────────────────────────────────────
// بيسمح باليوزر يعدل النصوص الحرة بس — المتغيرات {{N}} محمية بـ regex
// المنطق: بنقسم الـ body لـ segments — كل segment إما نص حر أو متغير مقفول
// ─────────────────────────────────────────────────────────────────────────────

// استخراج أرقام المتغيرات من الـ body الأصلي بالترتيب مع metadata
function extractVarMeta(originalBody: string): { num: number; meaning_ar: string; meaning_en: string }[] {
  const ORDER_CONFIRM_VARS: Record<number, { ar: string; en: string }> = {
    1: { ar: "اسم العميل", en: "Customer Name" },
    2: { ar: "رقم الطلب", en: "Order Number" },
    3: { ar: "إجمالي الطلب", en: "Order Total" },
  };
  const ORDER_SHIPPED_VARS: Record<number, { ar: string; en: string }> = {
    1: { ar: "اسم العميل", en: "Customer Name" },
    2: { ar: "رقم الطلب", en: "Order Number" },
    3: { ar: "رقم التتبع", en: "Tracking Number" },
  };
  const CART_ABANDON_VARS: Record<number, { ar: string; en: string }> = {
    1: { ar: "اسم العميل", en: "Customer Name" },
    2: { ar: "اسم المنتج", en: "Product Name" },
    3: { ar: "إجمالي السلة", en: "Cart Total" },
    4: { ar: "رابط السلة", en: "Cart URL" },
  };

  const nums = [...new Set([...originalBody.matchAll(/\{\{(\d+)\}\}/g)].map(m => parseInt(m[1])))].sort((a, b) => a - b);
  const map = originalBody.includes("التتبع") || originalBody.includes("tracking")
    ? ORDER_SHIPPED_VARS
    : originalBody.includes("سلتك") || originalBody.includes("cart")
      ? CART_ABANDON_VARS
      : ORDER_CONFIRM_VARS;

  return nums.map(n => ({
    num: n,
    meaning_ar: map[n]?.ar ?? `متغير ${n}`,
    meaning_en: map[n]?.en ?? `Variable ${n}`,
  }));
}

// التحقق أن جميع المتغيرات الأصلية لا تزال موجودة في النص المعدّل
function validateVarsPreserved(original: string, edited: string): boolean {
  const origVars = [...original.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]);
  const editVars = [...edited.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]);
  return origVars.every(v => editVars.includes(v));
}

// ─── المعاينة المضغوطة داخل الـ modal ────────────────────────────────────────
function MiniWhatsAppPreview({ body, footer, buttons, exampleVars }: {
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

// ─── WaniEditModal ────────────────────────────────────────────────────────────
function WaniEditModal({ template, open, onClose, onSendCustomized, lang }: {
  template: Template | null;
  open: boolean;
  onClose: () => void;
  onSendCustomized: (tpl: Template) => Promise<boolean>;
  lang: Lang;
}) {
  const tw = T[lang].waniEdit as any;

  // state يبدأ من القالب الأصلي
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [varError, setVarError] = useState(false);
  const [sending, setSending] = useState(false);

  // كلما فتح الـ modal على قالب جديد نعيد التهيئة
  useEffect(() => {
    if (!template) return;
    setBody(template.body ?? "");
    setFooter(template.footer ?? "");
    setButtons(template.buttons ? [...template.buttons] : []);
    setVarError(false);
  }, [template]);

  if (!template) return null;

  const originalBody = template.body ?? "";
  const varMeta = extractVarMeta(originalBody);
  const originalVars = [...originalBody.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]);

  // المتغيرات الأصلية بالترتيب كـ pill مرئية في الـ body textarea
  const handleBodyChange = (val: string) => {
    setBody(val);
    setVarError(!validateVarsPreserved(originalBody, val));
  };

  const handleReset = () => {
    setBody(originalBody);
    setFooter(template.footer ?? "");
    setButtons(template.buttons ? [...template.buttons] : []);
    setVarError(false);
  };

  const handleSend = async () => {
    if (varError) return;
    if (!validateVarsPreserved(originalBody, body)) { setVarError(true); return; }
    setSending(true);
    const customized: Template = { ...template, body, footer, buttons };
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
      <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 dark:bg-[#25D366]/20 flex items-center justify-center flex-shrink-0">
              <Pencil className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <DialogTitle className="font-mono text-base dark:text-white">{tw.title}</DialogTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">{tw.subtitle}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-5 mt-2">
          {/* ── Left: Edit panel (3 cols) ─────────────────────────────────── */}
          <div className="sm:col-span-3 space-y-4">

            {/* Locked vars info */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{tw.lockedVarsTitle}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {varMeta.map(v => (
                  <span key={v.num}
                    className="inline-flex items-center gap-1 bg-white dark:bg-gray-700 border border-amber-300 dark:border-amber-600 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                    <span className="text-amber-400">🔒</span>
                    {`{{${v.num}}}`}
                    <span className="font-normal text-gray-500 dark:text-gray-400">
                      {lang === "ar" ? v.meaning_ar : v.meaning_en}
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5">{tw.lockedVarsHint}</p>
            </div>

            {/* Body textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {lang === "ar" ? "نص الرسالة" : "Message Body"}
                </Label>
                <button onClick={handleReset}
                  className="text-[11px] text-gray-400 hover:text-[#25D366] flex items-center gap-1 transition-colors">
                  <RefreshCw className="w-3 h-3" /> {tw.resetBtn}
                </button>
              </div>
              <Textarea
                value={body}
                onChange={e => handleBodyChange(e.target.value)}
                rows={6}
                dir="auto"
                className={`font-mono text-sm resize-none dark:bg-gray-700 dark:border-gray-600 transition-colors
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
                    className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 hover:bg-[#25D366]/10 hover:text-[#25D366] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
                    + {`{{${v.num}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                {tw.footerLabel}
                <span className="text-[11px] font-normal text-gray-400 mr-1">({footer.length}/60)</span>
              </Label>
              <Input value={footer} maxLength={60} dir="auto"
                onChange={e => setFooter(e.target.value)}
                placeholder={lang === "ar" ? "مثل: متجرك على واتساب" : "e.g. Your WhatsApp Store"}
                className="dark:bg-gray-700 dark:border-gray-600" />
            </div>

            {/* Button texts — قابل للتعديل، الـ value (الرابط) ثابت */}
            {buttons.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                  {tw.btnTextLabel}
                </Label>
                {buttons.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600">
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono flex-shrink-0">{btn.type}</span>
                    <Input
                      value={btn.text}
                      onChange={e => updateBtnText(i, e.target.value)}
                      dir="auto"
                      placeholder={lang === "ar" ? "نص الزر" : "Button text"}
                      className="h-7 text-xs flex-1 dark:bg-gray-700 dark:border-gray-600 border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none"
                    />
                    {/* value مقفول */}
                    <span className="text-[9px] text-gray-400 font-mono truncate max-w-20 flex items-center gap-0.5 flex-shrink-0">
                      <span className="text-amber-400">🔒</span> {btn.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Live preview (2 cols) ──────────────────────────────── */}
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              {lang === "ar" ? "معاينة مباشرة" : "Live Preview"}
            </p>
            <MiniWhatsAppPreview
              body={body}
              footer={footer}
              buttons={buttons}
              exampleVars={template.exampleVars ?? []}
            />
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
          <Button variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300">
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={handleSend}
            disabled={varError || sending}
            className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-2 disabled:opacity-60">
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

// ─── Wani-Ready Card ──────────────────────────────────────────────────────────
// matchedTemplate = القالب الحقيقي من الـ API لو موجود (اسمه مطابق للـ wani template)
// الحالات:
//   APPROVED  → زر معطّل "معتمد ✓" أخضر
//   PENDING   → زر معطّل "قيد المراجعة..." أصفر
//   REJECTED  → زر مفعّل "إعادة الإرسال" أحمر خفيف
//   null      → لم يُرسل بعد → زر "إرسال للمراجعة" أخضر
function WaniReadyCard({ template, lang, onView, onSend, onCustomize, matchedTemplate }: {
  template: Template;
  lang: Lang;
  onView: () => void;
  onSend: (tpl: Template) => Promise<boolean>;
  onCustomize: (tpl: Template) => void;
  matchedTemplate: Template | null;
}) {
  const t = T[lang];
  const tw = (t as any).waniEdit;
  const [loading, setLoading] = useState(false);

  const varCount = (template.body?.match(/\{\{\d+\}\}/g) ?? []).length;

  // استنتج الحالة من الـ DB مش من local state
  const liveStatus = matchedTemplate?.status ?? null;
  const isPending = liveStatus === "PENDING";
  const isApproved = liveStatus === "APPROVED";
  const isRejected = liveStatus === "REJECTED" || liveStatus === "PAUSED";
  const isLocked = isPending || isApproved;   // لا يُعاد الإرسال

  const handleSend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    setLoading(true);
    await onSend(template);
    setLoading(false);
  };

  // ── تحديد شكل الزر بناءً على الحالة الحقيقية ─────────────────────────────
  const btnConfig = (() => {
    if (isApproved) return {
      cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default",
      content: <><CheckCircle2 className="w-3.5 h-3.5" /> {lang === "ar" ? "معتمد ✓" : "Approved ✓"}</>,
    };
    if (isPending) return {
      cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 cursor-not-allowed",
      content: <><Clock className="w-3.5 h-3.5 animate-pulse" /> {lang === "ar" ? "قيد المراجعة..." : "Under Review..."}</>,
    };
    if (isRejected) return {
      cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40",
      content: loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <><RefreshCw className="w-3.5 h-3.5" /> {lang === "ar" ? "إعادة الإرسال" : "Resubmit"}</>,
    };
    // لم يُرسل بعد
    return {
      cls: "bg-[#25D366] hover:bg-[#1fb956] text-white shadow-sm hover:shadow-md",
      content: loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : (lang === "ar" ? "إرسال للمراجعة" : "Send for Review"),
    };
  })();

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
        rounded-2xl p-4 hover:shadow-md hover:border-[#25D366]/40 dark:hover:border-[#25D366]/30
        transition-all duration-200 cursor-pointer"
      onClick={onView}
    >
      {/* Wani badge */}
      <div className="absolute -top-2 left-4 flex items-center gap-1 bg-gradient-to-r from-[#25D366] to-[#1fb956]
        text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
        <Zap className="w-2.5 h-2.5" /> Wani Ready
      </div>

      {/* Status pill — يظهر فقط لو القالب موجود في الـ DB */}
      {liveStatus && (
        <div className="absolute -top-2 right-4">
          <StatusBadge status={liveStatus} label={T[lang].status[liveStatus]} />
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mt-1">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">{template.name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <CategoryBadge category={template.category} lang={lang} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{template.language === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}</span>
            {varCount > 0 && (
              <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-mono">
                {varCount} {lang === "ar" ? "متغير" : "vars"}
              </span>
            )}
          </div>
        </div>
        <Eye className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors mt-0.5 flex-shrink-0" />
      </div>

      {/* Body preview */}
      <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {template.body}
        </p>
      </div>

      {/* Rejection reason hint */}
      {isRejected && matchedTemplate?.rejectedReason && (
        <div className="mt-2 flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-2.5 py-1.5">
          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600 dark:text-red-400 leading-snug line-clamp-2">
            {matchedTemplate.rejectedReason}
          </p>
        </div>
      )}

      {/* Buttons row: Customize + Send */}
      <div className="mt-3 flex gap-2">
        {/* زر التخصيص — يظهر دايماً ما لم يكن معتمد */}
        {!isApproved && (
          <button
            onClick={e => { e.stopPropagation(); onCustomize(template); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#25D366] hover:text-[#25D366] dark:hover:border-[#25D366] dark:hover:text-[#25D366] flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-gray-800"
          >
            <Pencil className="w-3 h-3" />
            {(tw as any)?.customize ?? (lang === 'ar' ? 'تخصيص' : 'Customize')}
          </button>
        )}
        {/* زر الإرسال */}
        <button
          onClick={handleSend}
          disabled={isLocked || loading}
          className={`${isApproved ? 'w-full' : 'flex-1'} py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${btnConfig.cls}`}
        >
          {btnConfig.content}
        </button>
      </div>
    </div>
  );
}

// ─── Template Detail Modal ────────────────────────────────────────────────────
function TemplateDetailModal({ template, open, onClose, onDelete, lang }: {
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
            <Button size="sm" variant="outline" className="gap-1.5 dark:border-gray-600 dark:text-gray-300">
              <Copy className="w-3.5 h-3.5" /> {t.detail.duplicate}
            </Button>
            {template.status !== "APPROVED" && (
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

// ─── Create Template — Step 1 ─────────────────────────────────────────────────
function Step1({ form, setForm, lang, onNext, onCancel }: {
  form: FormState; setForm: (f: FormState) => void; lang: Lang;
  onNext: () => void; onCancel: () => void;
}) {
  const t = T[lang];
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t.validation.nameRequired;
    else if (/^\d/.test(form.name)) e.name = t.validation.nameStart;
    else if (!/^[a-z0-9_]+$/.test(form.name)) e.name = t.validation.nameChars;
    if (!form.category) e.cat = t.validation.categoryRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const CATS: { key: TemplateCategory; icon: React.ReactNode; title_ar: string; title_en: string; items_ar: string[]; items_en: string[] }[] = [
    {
      key: "MARKETING", icon: <Megaphone className="w-6 h-6" />,
      title_ar: "📢 تسويقي", title_en: "📢 Marketing",
      items_ar: ["عروض وخصومات", "استرجاع السلة", "حملات إعلانية"],
      items_en: ["Promotions", "Cart Recovery", "Ad Campaigns"]
    },
    {
      key: "UTILITY", icon: <Package className="w-6 h-6" />,
      title_ar: "📦 خدمي", title_en: "📦 Utility",
      items_ar: ["تأكيد الطلب", "تحديث الشحن", "الفواتير"],
      items_en: ["Order Confirmation", "Shipping Update", "Invoices"]
    },
    {
      key: "AUTHENTICATION", icon: <Shield className="w-6 h-6" />,
      title_ar: "🔐 مصادقة", title_en: "🔐 Authentication",
      items_ar: ["رمز OTP", "أكواد الدخول", "التحقق الثنائي"],
      items_en: ["OTP Code", "Login Codes", "2FA"]
    },
  ];

  const LANGS = [
    { code: "ar", label: "🇸🇦 العربية" }, { code: "en", label: "🇬🇧 English" },
    { code: "fr", label: "🇫🇷 Français" }, { code: "es", label: "🇪🇸 Español" },
  ];

  return (
    <div className="space-y-6">
      {/* Template name */}
      <div>
        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
          {t.templateName} *
        </Label>
        <Input
          value={form.name} dir="ltr"
          onChange={e => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
          placeholder="order_confirmation"
          className={`font-mono dark:bg-gray-700 dark:border-gray-600 ${errors.name ? "border-red-400" : ""}`}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.templateNameHint}</p>
        {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
      </div>

      {/* Category */}
      <div>
        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">{t.categoryLabel} *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CATS.map(cat => {
            const isAuth = cat.key === "AUTHENTICATION";
            return (
              <div key={cat.key} className="relative">
                <button
                  disabled={isAuth}
                  onClick={() => { if (!isAuth) setForm({ ...form, category: cat.key }); }}
                  className={`w-full text-start rounded-2xl border-2 p-4 transition-all
                    ${isAuth ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50" : "hover:shadow-sm"}
                    ${!isAuth && form.category === cat.key
                      ? "border-[#25D366] bg-[#25D366]/5 dark:bg-[#25D366]/10 ring-1 ring-[#25D366]/30"
                      : !isAuth ? "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800" : ""
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${cat.key === "MARKETING" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                      cat.key === "UTILITY" ? "bg-blue-100   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400" :
                        "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"}`}>
                    {cat.icon}
                  </div>
                  <p className="font-bold text-sm text-gray-800 dark:text-white mb-2">
                    {lang === "ar" ? cat.title_ar : cat.title_en}
                  </p>
                  <ul className="space-y-1">
                    {(lang === "ar" ? cat.items_ar : cat.items_en).map(it => (
                      <li key={it} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" /> {it}
                      </li>
                    ))}
                  </ul>
                </button>
                {isAuth && (
                  <div className="absolute -bottom-10 left-0 right-0 z-10 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm">
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-300 text-center leading-tight">
                      {lang === "ar" ? "قوالب الـ OTP مخصصة للمطورين فقط." : "OTP templates are for developers only."}
                      <br />
                      <a href="/developers" className="font-bold underline hover:text-indigo-800 dark:hover:text-indigo-200">
                        {lang === "ar" ? "اكتشف وني للمطورين ←" : "Explore Wani Developers ←"}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {errors.cat && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cat}</p>}
      </div>

      {/* Language */}
      <div>
        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">{t.languageLabel}</Label>
        <div className="flex flex-wrap gap-2">
          {LANGS.map(l => (
            <button key={l.code}
              onClick={() => setForm({ ...form, language: l.code })}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${form.language === l.code
                  ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366] dark:text-[#25D366]"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} className="dark:border-gray-600 dark:text-gray-300">{t.cancel}</Button>
        <Button className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-2"
          onClick={() => { if (validate()) onNext(); }}>
          {t.next} <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Create Template — Step 2 ─────────────────────────────────────────────────
function Step2({ form, setForm, lang, onSubmit, onBack, submitting, success }: {
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
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t.successTitle}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{t.successMsg}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">{t.header}</Label>
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {(["none", "text", "image", "video", "document"] as HeaderType[]).map(h => (
            <button key={h}
              onClick={() => setForm({ ...form, headerType: h })}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-all
                ${form.headerType === h
                  ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]"
                  : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"
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
            className="dark:bg-gray-700 dark:border-gray-600" />
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
          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.body}</Label>
          <button onClick={addVar} className="text-xs text-[#25D366] hover:text-[#1fb956] font-medium flex items-center gap-1">
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
          className={`font-mono text-sm resize-none dark:bg-gray-700 dark:border-gray-600 ${errors.body ? "border-red-400" : ""}`}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.bodyHint}</p>
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
                    className="h-7 text-xs dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div>
        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
          {t.footer} <span className="text-[11px] font-normal text-gray-400">({form.footer.length}/60)</span>
        </Label>
        <Input value={form.footer} maxLength={60}
          onChange={e => setForm({ ...form, footer: e.target.value })}
          placeholder={lang === "ar" ? "مثل: Wani Store" : "e.g. Wani Store"}
          className="dark:bg-gray-700 dark:border-gray-600" />
      </div>

      {/* Buttons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.buttons}</Label>
          {form.buttons.length < 3 && (
            <button onClick={addButton} className="text-xs text-[#25D366] hover:text-[#1fb956] font-medium flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> {t.addButton}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {form.buttons.map((btn, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-200 dark:border-gray-600 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {(["url", "phone", "quick_reply"] as ButtonType[]).map(bt => (
                    <button key={bt}
                      onClick={() => updateButton(i, "type", bt)}
                      className={`text-[11px] px-2 py-1 rounded-lg font-medium border transition-all
                        ${btn.type === bt ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]" : "border-gray-200 dark:border-gray-500 text-gray-500 dark:text-gray-400"}`}
                    >{t.btnTypes[bt]}</button>
                  ))}
                </div>
                <button onClick={() => removeButton(i)} className="mr-auto p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Input value={btn.text} onChange={e => updateButton(i, "text", e.target.value)}
                placeholder={btn.type === "quick_reply" ? t.btnQR : t.btnText}
                className="h-8 text-sm dark:bg-gray-700 dark:border-gray-600" />
              {btn.type !== "quick_reply" && (
                <Input dir="ltr" value={btn.value} onChange={e => updateButton(i, "value", e.target.value)}
                  placeholder={btn.type === "url" ? "https://..." : "+201234567890"}
                  className="h-8 text-sm font-mono dark:bg-gray-700 dark:border-gray-600" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <Button variant="outline" onClick={onBack} className="gap-1.5 dark:border-gray-600 dark:text-gray-300">
          <ChevronRight className="w-4 h-4" /> {t.back}
        </Button>
        <Button variant="outline"
          onClick={() => { if (validate()) onSubmit(true); }}
          disabled={submitting}
          className="flex-1 dark:border-gray-600 dark:text-gray-300">
          {t.saveDraft}
        </Button>
        <Button
          onClick={() => { if (validate()) onSubmit(false); }}
          disabled={submitting}
          className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-1.5">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t.submitReview}
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { dir } = useLanguage();
  const lang: Lang = dir === "rtl" ? "ar" : "en";
  const t = T[lang];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [view, setView] = useState<View>("list");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [detailTpl, setDetailTpl] = useState<Template | null>(null);
  const [waniEditTpl, setWaniEditTpl] = useState<Template | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [filterLang, setFilterLang] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const defaultForm: FormState = { name: "", category: "", language: "ar", headerType: "none", headerText: "", body: "", footer: "", buttons: [], exampleVars: [] };
  const [form, setForm] = useState<FormState>(defaultForm);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      const mapped = data.map((t: any) => ({
        ...t,
        body: t.content,
      }));
      setTemplates(mapped);
    } catch (err: any) {
      toast.error(lang === "ar" ? "فشل تحميل القوالب" : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.status === "APPROVED").length,
    pending: templates.filter(t => t.status === "PENDING").length,
    rejected: templates.filter(t => t.status === "REJECTED").length,
    paused: templates.filter(t => t.status === "PAUSED").length,
  };

  const filtered = templates.filter(tp => {
    if (filterStatus !== "ALL" && tp.status !== filterStatus) return false;
    if (filterCat !== "ALL" && tp.category !== filterCat) return false;
    if (filterLang !== "ALL" && tp.language !== filterLang) return false;
    if (search && !tp.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/templates/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast.success(lang === "ar" ? `تمت المزامنة بنجاح (${data.count} قالب)` : `Sync successful (${data.count} templates)`);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل المزامنة" : "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (draft: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          draft
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");

      if (!draft) {
        setSubmitSuccess(true);
      } else {
        toast.success(lang === "ar" ? "تم الحفظ كمسودة" : "Saved as draft");
        setView("list"); setStep(1); setForm(defaultForm);
      }
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل حفظ القالب" : "Failed to save template"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete template");
      toast.success(lang === "ar" ? "تم حذف القالب بنجاح" : "Template deleted successfully");
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل حذف القالب" : "Failed to delete template"));
    }
  };

  const handleSendWani = async (tpl: Template) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tpl.name,
          category: tpl.category,
          language: tpl.language,
          headerType: tpl.headerType || "none",
          headerText: tpl.headerText || "",
          body: tpl.body || "",
          footer: tpl.footer || "",
          buttons: tpl.buttons || [],
          exampleVars: tpl.exampleVars || [],
          draft: false
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send template");
      toast.success(lang === "ar" ? "تم إرسال القالب للمراجعة" : "Template submitted for review");
      fetchTemplates();
      return true;
    } catch (err: any) {
      toast.error(err.message || (lang === "ar" ? "فشل إرسال القالب" : "Failed to send template"));
      return false;
    }
  };

  // ── List view ──────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6" dir={dir}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? t.syncing : t.syncBtn}
          </button>
          <Button onClick={() => { setView("create"); setStep(1); setForm(defaultForm); setSubmitSuccess(false); }}
            className="bg-[#25D366] hover:bg-[#1fb956] text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> {t.newTemplate}
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t.stats.total, value: stats.total, cls: "text-gray-800 dark:text-white", icon: <LayoutGrid className="w-4 h-4 text-gray-400" /> },
          { label: t.stats.approved, value: stats.approved, cls: "text-emerald-700 dark:text-emerald-400", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
          { label: t.stats.pending, value: stats.pending, cls: "text-amber-700  dark:text-amber-400", icon: <Clock className="w-4 h-4 text-amber-500" /> },
          { label: t.stats.rejected, value: stats.rejected, cls: "text-red-700    dark:text-red-400", icon: <XCircle className="w-4 h-4 text-red-500" /> },
          { label: t.stats.paused, value: stats.paused, cls: "text-gray-500   dark:text-gray-400", icon: <Ban className="w-4 h-4 text-gray-400" /> },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            {s.icon}
            <div>
              <p className={`text-xl font-bold leading-none ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.filters.search}
            className="pr-9 text-sm dark:bg-gray-800 dark:border-gray-700" />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {["ALL", "APPROVED", "PENDING", "REJECTED"].map(s => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                ${filterStatus === s ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {s === "ALL" ? t.filters.all : t.status[s as TemplateStatus]}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {["ALL", "MARKETING", "UTILITY", "AUTHENTICATION"].map(c => (
            <button key={c}
              onClick={() => setFilterCat(c)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                ${filterCat === c ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {c === "ALL" ? t.filters.all : t.category[c as TemplateCategory]}
            </button>
          ))}
        </div>
      </div>

      {/* Wani-Ready Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">{t.waniReady}</p>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">— {t.waniReadyDesc}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {WANI_READY.map(tpl => (
            <WaniReadyCard
              key={tpl.id}
              template={tpl}
              lang={lang}
              onView={() => setDetailTpl(tpl)}
              onSend={handleSendWani}
              onCustomize={tpl => setWaniEditTpl(tpl)}
              matchedTemplate={templates.find(t => t.name === tpl.name) ?? null}
            />
          ))}
        </div>
      </div>

      {/* My Templates Table */}
      <div>
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">{t.myTemplates}</p>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-8 h-8 text-[#25D366] animate-spin mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "ar" ? "جاري تحميل القوالب..." : "Loading templates..."}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{t.empty}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t.emptyHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {[t.table.name, t.table.category, t.table.language, t.table.updated, t.table.status, ""].map((h, i) => (
                      <th key={i} className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filtered.map(tpl => (
                    <tr key={tpl.id} onClick={() => setDetailTpl(tpl)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer group">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#25D366] transition-colors">
                          {tpl.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><CategoryBadge category={tpl.category} lang={lang} /></td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {tpl.language === "ar" ? "🇸🇦" : "🇬🇧"} {tpl.language}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{tpl.updatedAt ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={tpl.status} label={t.status[tpl.status]} />
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <TemplateDetailModal template={detailTpl} open={!!detailTpl} onClose={() => setDetailTpl(null)} onDelete={handleDelete} lang={lang} />
      <WaniEditModal
        template={waniEditTpl}
        open={!!waniEditTpl}
        onClose={() => setWaniEditTpl(null)}
        onSendCustomized={handleSendWani}
        lang={lang}
      />
    </div>
  );

  // ── Create view ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto" dir={dir}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <button onClick={() => { setView("list"); setStep(1); }} className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          {t.title}
        </button>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-white font-medium">{t.newTemplate}</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[{ n: 1, label: t.step1 }, { n: 2, label: t.step2 }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
              ${step === s.n ? "bg-[#25D366] text-white" : step > s.n ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
              {step > s.n ? <CheckCheck className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={`text-sm font-medium ${step === s.n ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
              {s.label}
            </span>
            {i < 1 && <div className={`h-0.5 w-12 mx-1 ${step > 1 ? "bg-[#25D366]" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          {step === 1
            ? <Step1 form={form} setForm={setForm} lang={lang}
              onNext={() => setStep(2)}
              onCancel={() => { setView("list"); setStep(1); }} />
            : <Step2 form={form} setForm={setForm} lang={lang}
              onSubmit={handleSubmit} onBack={() => setStep(1)}
              submitting={submitting} success={submitSuccess} />
          }
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-1 sticky top-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" /> {t.preview}
            </p>
            <WhatsAppPreview form={form} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}