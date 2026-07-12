"use client";

// ─── SmartFollowUpTab.tsx ──────────────────────────────────────────────────────
// Replaces the old "noreply" (المتابعة) + "advanced_followup" (المتابعة المتقدمة) tabs.
// Single entry point → 3 fixed cards (شحن / سلة متروكة / حملة). Each automation has
// a FIXED flow (hardcoded, not user-buildable) — the merchant only edits the message
// TEXT (inside a dedicated auto-created template) and ONE shared delay setting.
//
// STATUS: front-end only for now. Shipping card and Cart card are fully built.
// Campaign card is a placeholder.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Truck, ShoppingCart, Megaphone, ChevronLeft, Star, Bell,
  MessageCircle, CheckCircle2, XCircle, Lock, Headset
} from "lucide-react";
import { toast } from "sonner";

type Lang = "ar" | "en";
const tx = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);

type CardId = "shipping" | "cart" | "campaign";

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => { if (!disabled) onChange(!checked); }}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${checked ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-[-22px] rtl:translate-x-[22px]" : "translate-x-[-2px] rtl:translate-x-[2px]"}`}
        style={{ insetInlineEnd: 2 }} />
    </button>
  );
}

// ─── Tree UI Components ───────────────────────────────────────────────────────

function FlowTree({ templateName, title, icon, children, isApproved }: { templateName: string, title: string, icon: React.ReactNode, children: React.ReactNode, isApproved: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm mt-6">
      {/* Template Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700/50 rounded-xl p-3">
         <div>
            <p className="text-xs text-gray-500 font-medium mb-1">{tx("ar", "اسم القالب المخصص (يُعدل من مكتبة القوالب):", "Dedicated template name (edited from Template Library):")}</p>
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
               <Lock className="w-3.5 h-3.5 text-gray-400" />
               {templateName}
            </div>
         </div>
         <div>
            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> {tx("ar", "قالب معتمد", "Approved template")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                <Lock className="w-3.5 h-3.5" /> {tx("ar", "غير معتمد", "Not approved")}
              </span>
            )}
         </div>
      </div>

      {/* The Root of the flow */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px]">{title}</h3>
      </div>

      <div className="rtl:pr-4 ltr:pl-4 rtl:border-r-2 ltr:border-l-2 border-gray-100 dark:border-gray-700 rtl:mr-4 ltr:ml-4 pb-2">
         {children}
      </div>
    </div>
  );
}

function FlowAction({ title, icon, isLast, children }: { title: string, icon: React.ReactNode, isLast?: boolean, children: React.ReactNode }) {
  return (
    <div className="relative mt-5 pt-1">
      {/* Horizontal connector line */}
      <div className="absolute top-4 w-4 border-t-2 border-gray-100 dark:border-gray-700 rtl:-right-4 ltr:-left-4" />
      
      {/* Hide the vertical line overlap if it's the last item */}
      {isLast && (
        <div className="absolute top-[17px] bottom-0 w-1 bg-white dark:bg-gray-800 rtl:-right-[18px] ltr:-left-[18px]" />
      )}

      <div className="flex items-center gap-2 mb-3">
         <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center flex-shrink-0">
            {icon}
         </div>
         <span className="font-semibold text-[13px] text-gray-800 dark:text-gray-200">{title}</span>
      </div>

      <div className="rtl:pr-7 ltr:pl-7 rtl:border-r-2 ltr:border-l-2 border-gray-100 dark:border-gray-700 rtl:mr-3 ltr:ml-3 space-y-4 pb-3">
         {children}
      </div>
    </div>
  );
}

function FlowStep({ text, textareaValue, onTextareaChange, icon, isLast, label }: { text: string, textareaValue?: string, onTextareaChange?: (v: string) => void, icon?: React.ReactNode, isLast?: boolean, label?: string }) {
  return (
    <div className="relative mt-3">
      {/* Horizontal connector line */}
      <div className="absolute top-2.5 w-5 border-t-2 border-gray-100 dark:border-gray-700 rtl:-right-5 ltr:-left-5" />
      
      {/* Hide the vertical line overlap if it's the last item */}
      {isLast && (
        <div className="absolute top-[11px] bottom-0 w-1 bg-white dark:bg-gray-800 rtl:-right-[22px] ltr:-left-[22px]" />
      )}

      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-gray-400 dark:text-gray-500">
           {icon || <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mt-1" />}
        </div>
        <div className="flex-1 max-w-md">
           <p className="text-[13px] text-gray-700 dark:text-gray-300 font-medium mb-1.5">{text}</p>
           {textareaValue !== undefined && (
             <div className="mt-2">
                {label && <p className="text-[11px] text-gray-400 mb-1">{label}</p>}
                <Textarea 
                   rows={2} 
                   value={textareaValue} 
                   onChange={e => onTextareaChange && onTextareaChange(e.target.value)}
                   className="text-xs resize-none dark:bg-gray-900 dark:border-gray-700 shadow-sm"
                />
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

// ─── Header Selects ────────────────────────────────────────────────────────────
function SelectDelay({ value, onChange, options, label }: { value: string | number, onChange: (v: any) => void, options: { label: string, value: string | number }[], label: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300">
      <span className="font-medium whitespace-nowrap">{label}:</span>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="bg-transparent border-none outline-none font-bold text-gray-900 dark:text-gray-100 cursor-pointer min-w-[70px]"
      >
         {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Shipping detail view ───────────────────────────────────────────────────────

function ShippingFollowUpDetail({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [replyDelay, setReplyDelay] = useState(0); 
  const [triggerDelayDays, setTriggerDelayDays] = useState(3); 
  const [saving, setSaving] = useState(false);

  // MOCK: This will come from API
  const templateStatus: string = "PENDING"; 
  const isApproved = templateStatus === "APPROVED";

  const [texts, setTexts] = useState({
    rating: tx(lang, "يسعدنا معرفة رأيك في المنتج ⭐", "We'd love to know what you think of the product ⭐"),
    ratingThanks: tx(lang, "شكرًا لتقييمك ❤️", "Thanks for your rating ❤️"),
    notArrived: tx(lang, "شكرًا لإبلاغنا. سيتم متابعة الشحنة مع فريق الشحن وسنتواصل معك في أقرب وقت.", "Thanks for letting us know. We'll follow up with the shipping team and get back to you soon."),
    problemType: tx(lang, "ما نوع المشكلة؟", "What kind of problem?"),
    problemThanks: tx(lang, "شكرًا لإبلاغنا. سيتم تحويل طلبك إلى أحد موظفي خدمة العملاء للتواصل معك في أقرب وقت.", "Thanks for letting us know. Your request will be forwarded to a support agent who'll reach out soon."),
  });

  const handleToggle = (checked: boolean) => {
    if (checked && !isApproved) {
      toast.error(tx(lang, "يجب اعتماد القالب من ميتا أولاً لتفعيل الأتمتة", "Template must be approved by Meta to enable automation"));
      return;
    }
    setIsEnabled(checked);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    toast.success(tx(lang, "تم الحفظ بنجاح", "Saved successfully"));
  };

  return (
    <div className="space-y-4">
      {/* Unified Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:bg-gray-800 text-gray-400 flex-shrink-0">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{tx(lang, "متابعة الشحن", "Shipping Follow-up")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <SelectDelay 
             label={tx(lang, "إرسال المتابعة بعد", "Trigger after")} 
             value={triggerDelayDays} 
             onChange={v => setTriggerDelayDays(Number(v))} 
             options={[
               { label: tx(lang, "1 يوم", "1 day"), value: 1 },
               { label: tx(lang, "2 أيام", "2 days"), value: 2 },
               { label: tx(lang, "3 أيام", "3 days"), value: 3 },
               { label: tx(lang, "4 أيام", "4 days"), value: 4 },
               { label: tx(lang, "5 أيام", "5 days"), value: 5 },
               { label: tx(lang, "7 أيام", "7 days"), value: 7 },
             ]} 
           />
           <SelectDelay 
             label={tx(lang, "تأخير رسائل الرد", "Reply delay")} 
             value={replyDelay} 
             onChange={v => setReplyDelay(Number(v))} 
             options={[
               { label: tx(lang, "0 دقيقة (فوري)", "0 min (Instant)"), value: 0 },
               { label: tx(lang, "30 ثانية", "30 secs"), value: 0.5 },
               { label: tx(lang, "1 دقيقة", "1 min"), value: 1 },
               { label: tx(lang, "2 دقيقة", "2 mins"), value: 2 },
             ]} 
           />
           <ToggleSwitch checked={isEnabled} onChange={handleToggle} />
        </div>
      </div>

      <FlowTree 
         templateName="wani_shipping_followup"
         title={tx(lang, "أتمتة متابعة الشحن", "Shipping Follow-up Automation")}
         icon={<Truck className="w-4 h-4" />}
         isApproved={isApproved}
      >
         <FlowAction title={tx(lang, "يستقبل ضغط الزر (استلمته)", "Receives button click (Received)")} icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}>
            <FlowStep 
              icon={<MessageCircle className="w-4 h-4" />}
              text={tx(lang, "يرسل رسالة طلب التقييم", "Sends rating request")}
              label={tx(lang, "نص رسالة طلب التقييم", "Rating request text")}
              textareaValue={texts.rating}
              onTextareaChange={v => setTexts({...texts, rating: v})}
            />
            <FlowStep icon={<Bell className="w-4 h-4" />} text={tx(lang, "إذا كان التقييم 1-2 نجمة: يرسل إشعار فوري للتاجر", "If rating 1-2 stars: sends instant notification to merchant")} />
            <FlowStep 
              isLast 
              icon={<Star className="w-4 h-4 text-amber-500" />}
              text={tx(lang, "إذا كان التقييم 3-5 نجوم: يرسل رسالة شكر للعميل", "If rating 3-5 stars: sends thank you message to customer")}
              label={tx(lang, "نص رسالة الشكر", "Thank you message text")}
              textareaValue={texts.ratingThanks}
              onTextareaChange={v => setTexts({...texts, ratingThanks: v})}
            />
         </FlowAction>

         <FlowAction title={tx(lang, "يستقبل ضغط الزر (لسه موصلش)", "Receives button click (Not yet)")} icon={<Truck className="w-4 h-4 text-blue-500" />}>
            <FlowStep 
              icon={<MessageCircle className="w-4 h-4" />}
              text={tx(lang, "يرسل رسالة الرد الفوري", "Sends instant reply message")}
              label={tx(lang, "نص الرسالة", "Message text")}
              textareaValue={texts.notArrived}
              onTextareaChange={v => setTexts({...texts, notArrived: v})}
            />
            <FlowStep isLast icon={<Bell className="w-4 h-4" />} text={tx(lang, "يرسل إشعار فوري للتاجر", "Sends instant notification to merchant")} />
         </FlowAction>

         <FlowAction isLast title={tx(lang, "يستقبل ضغط الزر (حصلت مشكلة)", "Receives button click (Problem)")} icon={<XCircle className="w-4 h-4 text-red-500" />}>
            <FlowStep 
              icon={<MessageCircle className="w-4 h-4" />}
              text={tx(lang, "يرسل سؤال نوع المشكلة", "Sends problem type question")}
              label={tx(lang, "نص رسالة سؤال المشكلة", "Problem question text")}
              textareaValue={texts.problemType}
              onTextareaChange={v => setTexts({...texts, problemType: v})}
            />
            <FlowStep 
              icon={<MessageCircle className="w-4 h-4" />}
              text={tx(lang, "يستقبل الرد ويرسل رسالة", "Receives answer and sends message")}
              label={tx(lang, "نص رسالة الفحص", "Checking message text")}
              textareaValue={texts.problemThanks}
              onTextareaChange={v => setTexts({...texts, problemThanks: v})}
            />
            <FlowStep isLast icon={<Headset className="w-4 h-4" />} text={tx(lang, "يرسل إشعار فوري ويحول العميل لموظف المحادثة", "Sends instant notification and routes customer to human agent")} />
         </FlowAction>
      </FlowTree>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>{tx(lang, "إلغاء", "Cancel")}</Button>
        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSave} disabled={saving}>
          {saving ? tx(lang, "جاري الحفظ...", "Saving...") : tx(lang, "حفظ التغييرات", "Save changes")}
        </Button>
      </div>
    </div>
  );
}

// ─── Cart abandonment detail view ───────────────────────────────────────────────

function CartFollowUpDetail({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [replyDelay, setReplyDelay] = useState(0); 
  const [triggerDelayDays, setTriggerDelayDays] = useState(1);
  const [saving, setSaving] = useState(false);

  // MOCK: This will come from API
  const templateStatus = "PENDING"; 
  const isApproved = templateStatus === "APPROVED";

  const [texts, setTexts] = useState({
    completeReply: tx(lang, "رائع ❤️\nيمكنك إكمال طلبك من خلال الرابط التالي:\n🔗 [رابط إكمال الطلب]", "Great ❤️\nYou can complete your order through the following link:\n🔗 [checkout link]"),
    inquiryReply: tx(lang, "سيتم تحويلك إلى أحد موظفي المبيعات للتواصل معك في أقرب وقت.", "You'll be connected with one of our sales team who will reach out soon."),
    reasonQuestion: tx(lang, "ما سبب عدم إكمال الطلب؟", "What's the reason you didn't complete the order?"),
  });

  const handleToggle = (checked: boolean) => {
    if (checked && !isApproved) {
      toast.error(tx(lang, "يجب اعتماد القالب من ميتا أولاً لتفعيل الأتمتة", "Template must be approved by Meta to enable automation"));
      return;
    }
    setIsEnabled(checked);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    toast.success(tx(lang, "تم الحفظ بنجاح", "Saved successfully"));
  };

  return (
    <div className="space-y-4">
      {/* Unified Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:bg-gray-800 text-gray-400 flex-shrink-0">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{tx(lang, "متابعة السلة المتروكة", "Abandoned Cart Follow-up")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <SelectDelay 
             label={tx(lang, "إرسال المتابعة بعد", "Trigger after")} 
             value={triggerDelayDays} 
             onChange={v => setTriggerDelayDays(Number(v))} 
             options={[
               { label: tx(lang, "1 يوم", "1 day"), value: 1 },
               { label: tx(lang, "2 أيام", "2 days"), value: 2 },
               { label: tx(lang, "3 أيام", "3 days"), value: 3 },
             ]} 
           />
           <SelectDelay 
             label={tx(lang, "تأخير رسائل الرد", "Reply delay")} 
             value={replyDelay} 
             onChange={v => setReplyDelay(Number(v))} 
             options={[
               { label: tx(lang, "0 دقيقة (فوري)", "0 min (Instant)"), value: 0 },
               { label: tx(lang, "30 ثانية", "30 secs"), value: 0.5 },
               { label: tx(lang, "1 دقيقة", "1 min"), value: 1 },
               { label: tx(lang, "2 دقيقة", "2 mins"), value: 2 },
             ]} 
           />
           <ToggleSwitch checked={isEnabled} onChange={handleToggle} />
        </div>
      </div>

      <FlowTree 
         templateName="wani_abandoned_cart_followup"
         title={tx(lang, "أتمتة متابعة السلة المتروكة", "Abandoned Cart Automation")}
         icon={<ShoppingCart className="w-4 h-4" />}
         isApproved={isApproved}
      >
         <FlowAction title={tx(lang, "يستقبل ضغط الزر (أريد إكمال الطلب)", "Receives button click (Continue Order)")} icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}>
            <FlowStep 
              isLast
              icon={<MessageCircle className="w-4 h-4" />}
              text={tx(lang, "يرسل رسالة رابط الإكمال (الرابط يُحقن تلقائيًا)", "Sends checkout link message (Link is auto-injected)")}
              label={tx(lang, "نص رسالة رابط الإكمال", "Checkout link message")}
              textareaValue={texts.completeReply}
              onTextareaChange={v => setTexts({...texts, completeReply: v})}
            />
         </FlowAction>

         <FlowAction title={tx(lang, "يستقبل ضغط الزر (لدي استفسار)", "Receives button click (Have a question)")} icon={<MessageCircle className="w-4 h-4 text-amber-500" />}>
            <FlowStep 
              icon={<MessageCircle className="w-4 h-4" />}
              text={tx(lang, "يرسل رسالة الرد الفوري", "Sends instant reply message")}
              label={tx(lang, "نص الرسالة", "Message text")}
              textareaValue={texts.inquiryReply}
              onTextareaChange={v => setTexts({...texts, inquiryReply: v})}
            />
            <FlowStep isLast icon={<Headset className="w-4 h-4" />} text={tx(lang, "يرسل إشعار فوري للتاجر ويحول المحادثة للموظف", "Sends instant notification and routes to agent")} />
         </FlowAction>

         <FlowAction isLast title={tx(lang, "يستقبل ضغط الزر (غير مهتم)", "Receives button click (Not interested)")} icon={<XCircle className="w-4 h-4 text-red-500" />}>
            <FlowStep 
              isLast
              icon={<MessageCircle className="w-4 h-4" />}
              text={tx(lang, "يرسل رسالة سؤال عن السبب", "Sends reason question message")}
              label={tx(lang, "نص رسالة سؤال السبب", "Reason question text")}
              textareaValue={texts.reasonQuestion}
              onTextareaChange={v => setTexts({...texts, reasonQuestion: v})}
            />
         </FlowAction>
      </FlowTree>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>{tx(lang, "إلغاء", "Cancel")}</Button>
        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSave} disabled={saving}>
          {saving ? tx(lang, "جاري الحفظ...", "Saving...") : tx(lang, "حفظ التغييرات", "Save changes")}
        </Button>
      </div>
    </div>
  );
}

// ─── 3-card picker ──────────────────────────────────────────────────────────────

function CardGrid({ lang, onOpen }: { lang: Lang; onOpen: (id: CardId) => void }) {
  const cards: { id: CardId; icon: React.ReactNode; title: string; desc: string; ready: boolean }[] = [
    {
      id: "shipping",
      icon: <Truck className="w-5 h-5" />,
      title: tx(lang, "متابعة أثناء الشحن", "Shipping Follow-up"),
      desc: tx(lang, "يسأل العميل هل استلم طلبه، ويتفرع حسب رده", "Asks if the customer received their order, branches on their answer"),
      ready: true,
    },
    {
      id: "cart",
      icon: <ShoppingCart className="w-5 h-5" />,
      title: tx(lang, "متابعة السلة المتروكة", "Abandoned Cart Follow-up"),
      desc: tx(lang, "يسأل العميل هل لسه مهتم يكمل طلبه، ويتفرع حسب رده", "Asks if the customer still wants to complete their order, branches on their answer"),
      ready: true,
    },
    {
      id: "campaign",
      icon: <Megaphone className="w-5 h-5" />,
      title: tx(lang, "متابعة الحملة التسويقية", "Campaign Follow-up"),
      desc: tx(lang, "قريبًا", "Coming soon"),
      ready: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(c => (
        <button
          key={c.id}
          disabled={!c.ready}
          onClick={() => c.ready && onOpen(c.id)}
          className={`text-start rounded-2xl border p-4 flex flex-col gap-3 transition-all
            ${c.ready
              ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-green-300 dark:hover:border-green-800 cursor-pointer"
              : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 opacity-60 cursor-not-allowed"}`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.ready ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
              {c.icon}
            </div>
            {c.ready && <ChevronLeft className="w-4 h-4 text-gray-300 rtl:rotate-180" />}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{c.title}</p>
            <p className="text-xs text-gray-400 mt-1">{c.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function SmartFollowUpTab({ lang }: { lang: Lang }) {
  const [openCard, setOpenCard] = useState<CardId | null>(null);

  if (openCard === "shipping") {
    return <ShippingFollowUpDetail lang={lang} onBack={() => setOpenCard(null)} />;
  }
  if (openCard === "cart") {
    return <CartFollowUpDetail lang={lang} onBack={() => setOpenCard(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tx(lang, "أتمتة جاهزة الاستخدام — النص قابل للتعديل، الفلو والأزرار ثابتة.", "Ready-made automations — text is editable, flow and buttons are fixed.")}
        </p>
      </div>
      <CardGrid lang={lang} onOpen={setOpenCard} />
    </div>
  );
}