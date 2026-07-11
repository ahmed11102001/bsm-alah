"use client";

// ─── SmartFollowUpTab.tsx ──────────────────────────────────────────────────────
// Replaces the old "noreply" (المتابعة) + "advanced_followup" (المتابعة المتقدمة) tabs.
// Single entry point → 3 fixed cards (شحن / سلة متروكة / حملة). Each automation has
// a FIXED flow (hardcoded, not user-buildable) — the merchant only edits the message
// TEXT (inside a dedicated auto-created template) and ONE shared delay setting.
//
// STATUS: front-end only for now. Shipping card is fully built (per Ahmed's spec).
// Cart / Campaign cards are placeholders — next step, not yet designed.
// No API wiring yet — all state below is local; TODOs mark where the real
// GET/PUT /api/automation/smart-followup/shipping calls will go.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Truck, ShoppingCart, Megaphone, ChevronLeft, Star, Bell,
  MessageCircle, CheckCircle2, XCircle, Lock, Info,
} from "lucide-react";

type Lang = "ar" | "en";
const tx = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);

type CardId = "shipping" | "cart" | "campaign";

// ─── Small shared pieces ───────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-[-22px] rtl:translate-x-[22px]" : "translate-x-[-2px] rtl:translate-x-[2px]"}`}
        style={{ insetInlineEnd: 2 }} />
    </button>
  );
}

function FlowStep({ icon, text, sub, tone = "default" }: { icon: React.ReactNode; text: string; sub?: string; tone?: "default" | "success" | "danger" | "warning" }) {
  const toneClasses = {
    default: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200",
    success: "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-300",
    danger: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300",
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${toneClasses}`}>
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="font-semibold">{text}</p>
        {sub && <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}

function Branch({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-r-2 rtl:border-r-2 border-l-2 ltr:border-l-2 border-dashed border-gray-200 dark:border-gray-700 pr-4 rtl:pr-4 pl-4 ltr:pl-4 py-1 space-y-2">
      {children}
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

// ─── Shipping detail view ───────────────────────────────────────────────────────

function ShippingFollowUpDetail({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  // TODO(backend): replace with GET /api/automation/smart-followup/shipping
  const [isEnabled, setIsEnabled] = useState(false);
  const [replyDelay, setReplyDelay] = useState(0); // 0–2 minutes, applies to every reply message in this flow
  const [triggerDelayDays, setTriggerDelayDays] = useState(3); // days after shipping template → send follow-up
  const [saving, setSaving] = useState(false);

  // TODO(backend): these come from the dedicated auto-created templates —
  // one per message below. Variables (avg delivery days, order number, etc.)
  // stay locked; only the surrounding wording is editable here.
  const [texts, setTexts] = useState({
    ask: tx(lang, "هل استلمت طلبك؟", "Did you receive your order?"),
    rating: tx(lang, "يسعدنا معرفة رأيك في المنتج ⭐", "We'd love to know what you think of the product ⭐"),
    ratingThanks: tx(lang, "شكرًا لتقييمك ❤️", "Thanks for your rating ❤️"),
    notArrived: tx(lang, "شكرًا لإبلاغنا. سيتم متابعة الشحنة مع فريق الشحن وسنتواصل معك في أقرب وقت.", "Thanks for letting us know. We'll follow up with the shipping team and get back to you soon."),
    problemType: tx(lang, "ما نوع المشكلة؟", "What kind of problem?"),
    problemThanks: tx(lang, "شكرًا لإبلاغنا. سيتم تحويل طلبك إلى أحد موظفي خدمة العملاء للتواصل معك في أقرب وقت.", "Thanks for letting us know. Your request will be forwarded to a support agent who'll reach out soon."),
  });

  const handleSave = async () => {
    setSaving(true);
    // TODO(backend): PUT /api/automation/smart-followup/shipping
    // { isEnabled, replyDelay, triggerDelayDays, texts }
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
          <Truck className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{tx(lang, "متابعة أثناء الشحن", "Shipping Follow-up")}</p>
        </div>
        <ToggleSwitch checked={isEnabled} onChange={setIsEnabled} />
      </div>

      <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {tx(lang, "الفلو والأزرار ثابتين، تقدر تعدّل نص الرسائل بس. المتغيرات محمية ومحسوبة تلقائيًا.",
          "The flow and buttons are fixed — you can only edit the message wording. Variables are protected and calculated automatically.")}
      </div>

      {/* Template Name */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <Label className="mb-1.5 block text-sm">{tx(lang, "اسم القالب المخصص", "Dedicated Template Name")}</Label>
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-gray-500 font-mono flex items-center justify-between">
          <span>wani_shipping_followup</span>
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {tx(lang, "هذا القالب مخصص لمتابعة الشحن، سيتم جلبه من مكتبة القوالب ولا يمكن تغييره.",
            "This template is dedicated for shipping follow-up, it will be fetched from the template library and cannot be changed.")}
        </p>
      </div>

      {/* Trigger delay — when to send the follow-up after shipping template */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <Label className="mb-1.5 block text-sm">{tx(lang, "إرسال المتابعة بعد (أيام من إرسال قالب الشحن)", "Send follow-up after (days from shipping template)")}</Label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={7} step={1}
            value={triggerDelayDays}
            onChange={e => setTriggerDelayDays(Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-sm font-semibold w-16 text-center text-gray-900 dark:text-gray-100">{triggerDelayDays} {tx(lang, triggerDelayDays === 1 ? "يوم" : "أيام", triggerDelayDays === 1 ? "day" : "days")}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {tx(lang, "بعد ما أتمتة المتجر تبعت قالب الشحن للعميل، رسالة المتابعة (هل استلمت طلبك؟) هتتبعت بعد العدد ده من الأيام.",
            "After the store automation sends the shipping template, the follow-up message (Did you receive your order?) will be sent after this many days.")}
        </p>
      </div>

      {/* Reply delay — applies to every reply message inside this flow */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <Label className="mb-1.5 block text-sm">{tx(lang, "تأخير رسائل الرد (بالدقائق)", "Reply message delay (minutes)")}</Label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={2} step={1}
            value={replyDelay}
            onChange={e => setReplyDelay(Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-sm font-semibold w-10 text-center text-gray-900 dark:text-gray-100">{replyDelay}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {tx(lang, "بيتطبق على كل رسايل الرد جوه الفلو ده بس (مش أول رسالة). أول رسالة بتتحسب من عدد الأيام اللي حددته فوق.",
            "Applies only to reply messages inside this flow (not the first message). The first message is timed from the days you set above.")}
        </p>
      </div>

      {/* Fixed flow, editable text only */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{tx(lang, "خطوات الفلو", "Flow steps")}</p>
          <span className="text-xs text-gray-400 flex items-center gap-1"><Info className="w-3.5 h-3.5" />{tx(lang, "قراءة فقط للهيكل، تعديل للنص", "Structure is read-only, text is editable")}</span>
        </div>

        <FlowStep icon={<Truck className="w-4 h-4" />} tone="default"
          text={tx(lang, "تم شحن الطلب", "Order shipped")}
          sub={tx(lang, `بعد ${triggerDelayDays} ${triggerDelayDays === 1 ? 'يوم' : 'أيام'} من إرسال قالب الشحن`, `${triggerDelayDays} ${triggerDelayDays === 1 ? 'day' : 'days'} after shipping template is sent`)} />

        <div>
          <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة السؤال (القالب المخصص)", "Question message (dedicated template)")}</Label>
          <Textarea rows={2} value={texts.ask} onChange={e => setTexts({ ...texts, ask: e.target.value })} />
          <div className="flex gap-2 mt-2 text-xs">
            <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{tx(lang, "استلمته", "Received it")}</span>
            <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center gap-1"><Truck className="w-3 h-3" />{tx(lang, "لسه موصلش", "Not yet")}</span>
            <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{tx(lang, "حصلت مشكلة", "Had a problem")}</span>
          </div>
        </div>

        {/* Branch: received */}
        <Branch>
          <FlowStep icon={<CheckCircle2 className="w-4 h-4" />} tone="success" text={tx(lang, "استلمته ✅", "Received it ✅")} />
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة طلب التقييم", "Rating request message")}</Label>
            <Textarea rows={2} value={texts.rating} onChange={e => setTexts({ ...texts, rating: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Star className="w-3 h-3" /> {tx(lang, "قائمة تقييم من 1 إلى 5 نجوم — ثابتة", "1–5 star list — fixed")}</p>
          </div>
          <FlowStep icon={<Bell className="w-4 h-4" />} tone="warning"
            text={tx(lang, "تقييم 1-2 نجمة → إشعار فوري لصاحب المتجر", "1–2 star rating → instant notification to the merchant")} />
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة الشكر (تقييم 3-5)", "Thank-you message (3–5 rating)")}</Label>
            <Textarea rows={1} value={texts.ratingThanks} onChange={e => setTexts({ ...texts, ratingThanks: e.target.value })} />
          </div>
        </Branch>

        {/* Branch: not yet */}
        <Branch>
          <FlowStep icon={<Truck className="w-4 h-4" />} tone="warning" text={tx(lang, "لسه موصلش 🚚", "Not yet 🚚")} />
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة الرد الفوري", "Instant reply message")}</Label>
            <Textarea rows={2} value={texts.notArrived} onChange={e => setTexts({ ...texts, notArrived: e.target.value })} />
          </div>
          <FlowStep icon={<Bell className="w-4 h-4" />} tone="warning" text={tx(lang, "إشعار فوري لصاحب المتجر", "Instant notification to the merchant")} />
        </Branch>

        {/* Branch: problem */}
        <Branch>
          <FlowStep icon={<XCircle className="w-4 h-4" />} tone="danger" text={tx(lang, "حصلت مشكلة ❌", "Had a problem ❌")} />
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة سؤال نوع المشكلة", "Problem-type question message")}</Label>
            <Textarea rows={2} value={texts.problemType} onChange={e => setTexts({ ...texts, problemType: e.target.value })} />
            <div className="flex gap-2 mt-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">{tx(lang, "المنتج تالف", "Product damaged")}</span>
              <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">{tx(lang, "المنتج مختلف", "Wrong item")}</span>
              <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">{tx(lang, "مشكلة أخرى", "Other issue")}</span>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة الرد الفوري", "Instant reply message")}</Label>
            <Textarea rows={2} value={texts.problemThanks} onChange={e => setTexts({ ...texts, problemThanks: e.target.value })} />
          </div>
          <FlowStep icon={<Bell className="w-4 h-4" />} tone="danger"
            text={tx(lang, "إشعار فوري + تحويل للمحادثة + تسجيل نوع المشكلة", "Instant notification + handoff + issue type logged")} />
        </Branch>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>{tx(lang, "إلغاء", "Cancel")}</Button>
        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSave} disabled={saving}>
          {saving ? tx(lang, "جاري الحفظ...", "Saving...") : tx(lang, "حفظ", "Save")}
        </Button>
      </div>
    </div>
  );
}

// ─── Cart abandonment detail view ───────────────────────────────────────────────

function CartFollowUpDetail({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  // TODO(backend): replace with GET /api/automation/smart-followup/cart
  const [isEnabled, setIsEnabled] = useState(false);
  const [replyDelay, setReplyDelay] = useState(0); // 0–2 minutes, applies to every reply message in this flow — separate from the shipping card's own delay
  const [triggerDelayDays, setTriggerDelayDays] = useState(1); // days after cart abandonment template → send follow-up
  const [saving, setSaving] = useState(false);

  // TODO(backend): dedicated auto-created templates, one per message below.
  // Variables (checkout/recovery link, etc.) stay locked; only wording is editable.
  const [texts, setTexts] = useState({
    ask: tx(lang, "هل ما زلت مهتم بإتمام طلبك؟", "Are you still interested in completing your order?"),
    completeReply: tx(lang, "رائع ❤️\nيمكنك إكمال طلبك من خلال الرابط التالي:\n🔗 [رابط إكمال الطلب]", "Great ❤️\nYou can complete your order through the following link:\n🔗 [checkout link]"),
    inquiryReply: tx(lang, "سيتم تحويلك إلى أحد موظفي المبيعات للتواصل معك في أقرب وقت.", "You'll be connected with one of our sales team who will reach out soon."),
    reasonQuestion: tx(lang, "ما سبب عدم إكمال الطلب؟", "What's the reason you didn't complete the order?"),
    reasonThanks: tx(lang, "شكرًا لمشاركتنا رأيك ❤️", "Thanks for sharing your feedback with us ❤️"),
  });

  const handleSave = async () => {
    setSaving(true);
    // TODO(backend): PUT /api/automation/smart-followup/cart
    // { isEnabled, replyDelay, triggerDelayDays, texts }
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{tx(lang, "متابعة السلة المتروكة", "Abandoned Cart Follow-up")}</p>
        </div>
        <ToggleSwitch checked={isEnabled} onChange={setIsEnabled} />
      </div>

      <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {tx(lang, "الفلو والأزرار ثابتين، تقدر تعدّل نص الرسائل بس. المتغيرات (زي رابط إتمام الطلب) محمية ومحسوبة تلقائيًا.",
          "The flow and buttons are fixed — you can only edit the message wording. Variables (like the checkout link) are protected and calculated automatically.")}
      </div>

      {/* Template Name */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <Label className="mb-1.5 block text-sm">{tx(lang, "اسم القالب المخصص", "Dedicated Template Name")}</Label>
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-gray-500 font-mono flex items-center justify-between">
          <span>wani_cart_followup</span>
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {tx(lang, "هذا القالب مخصص لمتابعة السلة المتروكة، سيتم جلبه من مكتبة القوالب ولا يمكن تغييره.",
            "This template is dedicated for abandoned cart follow-up, it will be fetched from the template library and cannot be changed.")}
        </p>
      </div>

      {/* Trigger delay — when to send the follow-up after cart abandonment template */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <Label className="mb-1.5 block text-sm">{tx(lang, "إرسال المتابعة بعد (أيام من إرسال قالب السلة المتروكة)", "Send follow-up after (days from cart template)")}</Label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={3} step={1}
            value={triggerDelayDays}
            onChange={e => setTriggerDelayDays(Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-sm font-semibold w-16 text-center text-gray-900 dark:text-gray-100">{triggerDelayDays} {tx(lang, triggerDelayDays === 1 ? "يوم" : "أيام", triggerDelayDays === 1 ? "day" : "days")}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {tx(lang, "بعد ما أتمتة المتجر تبعت قالب السلة المتروكة للعميل، رسالة المتابعة (هل ما زلت مهتم؟) هتتبعت بعد العدد ده من الأيام.",
            "After the store automation sends the cart abandonment template, the follow-up message (Still interested?) will be sent after this many days.")}
        </p>
      </div>

      {/* Reply delay — applies to every reply message inside this flow */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <Label className="mb-1.5 block text-sm">{tx(lang, "تأخير رسائل الرد (بالدقائق)", "Reply message delay (minutes)")}</Label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={2} step={1}
            value={replyDelay}
            onChange={e => setReplyDelay(Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-sm font-semibold w-10 text-center text-gray-900 dark:text-gray-100">{replyDelay}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {tx(lang, "بيتطبق على كل رسايل الرد جوه الفلو ده بس (مش أول رسالة). أول رسالة بتتحسب من عدد الأيام اللي حددته فوق.",
            "Applies only to reply messages inside this flow (not the first message). The first message is timed from the days you set above.")}
        </p>
      </div>

      {/* Fixed flow, editable text only */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{tx(lang, "خطوات الفلو", "Flow steps")}</p>
          <span className="text-xs text-gray-400 flex items-center gap-1"><Info className="w-3.5 h-3.5" />{tx(lang, "قراءة فقط للهيكل، تعديل للنص", "Structure is read-only, text is editable")}</span>
        </div>

        <FlowStep icon={<ShoppingCart className="w-4 h-4" />} tone="default"
          text={tx(lang, "سلة متروكة", "Cart abandoned")}
          sub={tx(lang, `بعد ${triggerDelayDays} ${triggerDelayDays === 1 ? 'يوم' : 'أيام'} من إرسال قالب السلة المتروكة`, `${triggerDelayDays} ${triggerDelayDays === 1 ? 'day' : 'days'} after cart abandonment template is sent`)} />

        <div>
          <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة السؤال (القالب المخصص)", "Question message (dedicated template)")}</Label>
          <Textarea rows={2} value={texts.ask} onChange={e => setTexts({ ...texts, ask: e.target.value })} />
          <div className="flex gap-2 mt-2 text-xs flex-wrap">
            <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{tx(lang, "نعم، أريد إكماله", "Yes, I want to complete it")}</span>
            <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center gap-1"><MessageCircle className="w-3 h-3" />{tx(lang, "لدي استفسار", "I have a question")}</span>
            <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{tx(lang, "لست مهتمًا الآن", "Not interested now")}</span>
          </div>
        </div>

        {/* Branch: wants to complete */}
        <Branch>
          <FlowStep icon={<CheckCircle2 className="w-4 h-4" />} tone="success" text={tx(lang, "نعم، أريد إكماله ✅", "Yes, I want to complete it ✅")} />
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة رابط الإكمال", "Checkout link message")}</Label>
            <Textarea rows={3} value={texts.completeReply} onChange={e => setTexts({ ...texts, completeReply: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">{tx(lang, "🔗 رابط إتمام الطلب بيتحقن تلقائي — انتهاء المتابعة بعدها", "🔗 The checkout link is injected automatically — follow-up ends after this")}</p>
          </div>
        </Branch>

        {/* Branch: has a question */}
        <Branch>
          <FlowStep icon={<MessageCircle className="w-4 h-4" />} tone="warning" text={tx(lang, "لدي استفسار ❓", "I have a question ❓")} />
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة الرد الفوري", "Instant reply message")}</Label>
            <Textarea rows={2} value={texts.inquiryReply} onChange={e => setTexts({ ...texts, inquiryReply: e.target.value })} />
          </div>
          <FlowStep icon={<Bell className="w-4 h-4" />} tone="warning" text={tx(lang, "إشعار فوري لصاحب المتجر + تحويل للمحادثة", "Instant notification to the merchant + handoff")} />
        </Branch>

        {/* Branch: not interested */}
        <Branch>
          <FlowStep icon={<XCircle className="w-4 h-4" />} tone="danger" text={tx(lang, "لست مهتمًا الآن ❌", "Not interested now ❌")} />
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة سؤال السبب", "Reason question message")}</Label>
            <Textarea rows={2} value={texts.reasonQuestion} onChange={e => setTexts({ ...texts, reasonQuestion: e.target.value })} />
            <div className="flex gap-2 mt-2 text-xs flex-wrap">
              <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">{tx(lang, "السعر مرتفع", "Price is too high")}</span>
              <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">{tx(lang, "غيرت رأيي", "Changed my mind")}</span>
              <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">{tx(lang, "سبب آخر", "Other reason")}</span>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-gray-400">{tx(lang, "رسالة الشكر", "Thank-you message")}</Label>
            <Textarea rows={1} value={texts.reasonThanks} onChange={e => setTexts({ ...texts, reasonThanks: e.target.value })} />
          </div>
          <FlowStep icon={<Bell className="w-4 h-4" />} tone="danger"
            text={tx(lang, "تسجيل سبب الإلغاء + إشعار لصاحب المتجر", "Cancellation reason logged + notification to the merchant")} />
        </Branch>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>{tx(lang, "إلغاء", "Cancel")}</Button>
        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSave} disabled={saving}>
          {saving ? tx(lang, "جاري الحفظ...", "Saving...") : tx(lang, "حفظ", "Save")}
        </Button>
      </div>
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