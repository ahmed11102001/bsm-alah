// src/components/dashboard/DeviceNotificationModal.tsx
// ─── نافذة تخصيص إشعارات الجهاز (سطح المكتب والموبايل) ─────────────────────

"use client";

import { useState, useMemo } from "react";
import {
  X,
  Check,
  CheckCheck,
  SlidersHorizontal,
  Bell,
  BellRing,
  Smartphone,
  Laptop,
  MessageSquare,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Wifi,
  Sparkles,
  Bot,
  UserCheck,
  Zap,
  CreditCard,
  Layers,
  Search,
} from "lucide-react";
import { NotificationType } from "@/types/enums";
import { toast } from "sonner";

export interface NotificationItemDef {
  type: NotificationType;
  category: "chat" | "store" | "campaigns" | "billing" | "automation" | "system";
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  icon: React.ReactNode;
  bgClass: string;
}

export const ALL_SYSTEM_NOTIFICATIONS: NotificationItemDef[] = [
  // ── 1. Chat & Conversations ──
  {
    type: NotificationType.NEW_MESSAGE,
    category: "chat",
    title: { ar: "رسائل العملاء الجديدة", en: "New Customer Messages" },
    description: {
      ar: "تنبيه فوري عند استلام رسالة واتساب واردة من أي عميل",
      en: "Instant alert when a new WhatsApp message is received from a customer",
    },
    icon: <MessageSquare className="w-4 h-4 text-blue-500" />,
    bgClass: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    type: NotificationType.AI_HANDOFF_NEEDED,
    category: "chat",
    title: { ar: "طلب تحويل العميل لموظف (AI Handoff)", en: "AI Support Handoff Request" },
    description: {
      ar: "تنبيه عندما يطلب العميل التحدث مع موظف أو يحتاج تدخل بشري",
      en: "Alert when a customer requests human support or AI handoff is needed",
    },
    icon: <Bot className="w-4 h-4 text-purple-500" />,
    bgClass: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },

  // ── 2. Store & E-Commerce ──
  {
    type: NotificationType.ORDER_CONFIRMED,
    category: "store",
    title: { ar: "تأكيد طلبات المتجر", en: "New Store Order Confirmed" },
    description: {
      ar: "إشعار عند إنشاء أو تأكيد طلب جديد في متجرك الإلكتروني",
      en: "Alert when a new store order is created or confirmed",
    },
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    type: NotificationType.ORDER_CANCELLED,
    category: "store",
    title: { ar: "إلغاء واسترجاع الطلبات", en: "Order Cancelled / Refunded" },
    description: {
      ar: "تنبيه عند إلغاء أو استرجاع أي طلب من العميل",
      en: "Alert when a store order is cancelled or refunded",
    },
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    bgClass: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
  {
    type: NotificationType.STORE_AUTO_SENT,
    category: "store",
    title: { ar: "إرسال رسائل أتمتة المتجر بنجاح", en: "Store Automation Messages Sent" },
    description: {
      ar: "إشعار بنجاح إرسال رسائل تأكيد الشحن والطلبات التلقائية",
      en: "Alert when automated order confirmation or shipping updates send successfully",
    },
    icon: <ShoppingBag className="w-4 h-4 text-emerald-500" />,
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    type: NotificationType.STORE_AUTO_FAILED,
    category: "store",
    title: { ar: "فشل رسائل أتمتة المتجر", en: "Store Automation Sending Failed" },
    description: {
      ar: "تنبيه فوري عند تعذر إرسال رسالة أتمتة لطلب متجر",
      en: "Alert if an automated store order message fails to deliver",
    },
    icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    bgClass: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },

  // ── 3. Marketing Campaigns ──
  {
    type: NotificationType.CAMPAIGN_SUCCESS,
    category: "campaigns",
    title: { ar: "اكتمال الحملة بنجاح", en: "Campaign Completed Successfully" },
    description: {
      ar: "إشعار باكتمال إرسال رسائل الحملة التسويقية الجماعية بنجاح",
      en: "Alert when a bulk marketing campaign finishes sending successfully",
    },
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    bgClass: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
  {
    type: NotificationType.CAMPAIGN_FAILED,
    category: "campaigns",
    title: { ar: "فشل إرسال الحملة", en: "Campaign Sending Failed" },
    description: {
      ar: "تنبيه عند حدوث خطأ أوقف إرسال الحملة بالكامل",
      en: "Alert if a campaign encounters an error and fails to send",
    },
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    bgClass: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
  {
    type: NotificationType.CAMPAIGN_PARTIAL,
    category: "campaigns",
    title: { ar: "اكتمال الحملة جزئياً", en: "Campaign Partially Sent" },
    description: {
      ar: "تنبيه عند اكتمال الحملة مع فشل وصول بعض الأرقام",
      en: "Alert if a campaign completes with some failed deliveries",
    },
    icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    bgClass: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  },

  // ── 4. Subscription & Billing ──
  {
    type: NotificationType.SUBSCRIPTION_SUCCESS,
    category: "billing",
    title: { ar: "تفعيل وترقية الباقة", en: "Subscription Activated / Upgraded" },
    description: {
      ar: "إشعار بنجاح تجديد الاشتراك أو الترقية لباقة أعلى",
      en: "Alert upon successful subscription renewal or plan upgrade",
    },
    icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    type: NotificationType.SUBSCRIPTION_EXPIRING,
    category: "billing",
    title: { ar: "اقتراب انتهاء صلاحية الباقة", en: "Subscription Expiring Soon" },
    description: {
      ar: "تنبيه مبكر قبل موعد تجديد أو انتهاء اشتراك باقتك",
      en: "Early reminder before your current subscription plan expires",
    },
    icon: <Clock className="w-4 h-4 text-amber-500" />,
    bgClass: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  {
    type: NotificationType.PLAN_LIMIT_REACHED,
    category: "billing",
    title: { ar: "استهلاك الحد الأقصى للباقة", en: "Plan Limit Reached" },
    description: {
      ar: "تنبيه عند استهلاك كامل رصيد الرسائل أو جهات الاتصال المسموحة",
      en: "Alert when contact or message quota limit is reached",
    },
    icon: <Layers className="w-4 h-4 text-orange-500" />,
    bgClass: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    type: NotificationType.PAYMENT_FAILED,
    category: "billing",
    title: { ar: "فشل عملية الدفع", en: "Payment Renewal Failed" },
    description: {
      ar: "تنبيه فوري عند تعثر خصم رسوم التجديد التلقائي",
      en: "Instant alert if recurring subscription payment fails",
    },
    icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
    bgClass: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },

  // ── 5. Automation & Smart Follow-ups ──
  {
    type: NotificationType.SMART_FOLLOWUP_ALERT,
    category: "automation",
    title: { ar: "تنبيهات المتابعة الذكية", en: "Smart Follow-Up Alerts" },
    description: {
      ar: "إشعارات تذكير العملاء ومتابعة السلات المتروكة واسترداد المبيعات",
      en: "Alerts for abandoned cart recovery and smart customer re-engagement",
    },
    icon: <Sparkles className="w-4 h-4 text-orange-500" />,
    bgClass: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    type: NotificationType.AUTOMATION_FAILED,
    category: "automation",
    title: { ar: "فشل قواعد الأتمتة", en: "Automation Rule Failed" },
    description: {
      ar: "تنبيه عند تعذر تنفيذ قاعدة أتمتة ذكية أو رد تفاعلي",
      en: "Alert if an automated rule or trigger fails to execute",
    },
    icon: <Zap className="w-4 h-4 text-red-500" />,
    bgClass: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
  {
    type: NotificationType.AUTOMATION_LOOP_STOPPED,
    category: "automation",
    title: { ar: "إيقاف تكرار الأتمتة للأمان", en: "Automation Loop Stopped" },
    description: {
      ar: "تنبيه أمان عند رصد ردود متكررة وإيقافها لحماية حسابك",
      en: "Safety alert when an automated message loop is detected and halted",
    },
    icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    bgClass: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  },

  // ── 6. Team, Token & AI System ──
  {
    type: NotificationType.TEAM_MEMBER_JOINED,
    category: "system",
    title: { ar: "انضمام عضو جديد للفريق", en: "Team Member Joined" },
    description: {
      ar: "إشعار عند قبول دعوة الفريق وانضمام موظف جديد لمساحة العمل",
      en: "Alert when an invited team member accepts and joins your workspace",
    },
    icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    type: NotificationType.WHATSAPP_TOKEN_EXPIRING,
    category: "system",
    title: { ar: "صلاحية رمز ربط واتساب (Meta Token)", en: "WhatsApp Meta Token Expiring" },
    description: {
      ar: "تنبيه هام عند اقتراب انتهاء صلاحية توكن واتساب كلاود لتجديده",
      en: "Important alert before WhatsApp Cloud API access token expires",
    },
    icon: <Wifi className="w-4 h-4 text-orange-500" />,
    bgClass: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    type: NotificationType.AI_TOKENS_LOW,
    category: "system",
    title: { ar: "رصيد رموز الذكاء الاصطناعي (AI Tokens)", en: "AI Token Balance Low" },
    description: {
      ar: "تنبيه عند انخفاض رصيد استهلاك الذكاء الاصطناعي للردود التلقائية",
      en: "Alert when your AI token credit for automated replies is running low",
    },
    icon: <Sparkles className="w-4 h-4 text-yellow-500" />,
    bgClass: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  },
];

export const ALL_NOTIFICATION_TYPES_LIST: NotificationType[] = ALL_SYSTEM_NOTIFICATIONS.map(
  (n) => n.type
);

interface DeviceNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "ar" | "en";
  selectedTypes: NotificationType[];
  onSave: (types: NotificationType[]) => void;
  pushEnabled: boolean;
  onTogglePush: () => void;
  pushLoading?: boolean;
}

export default function DeviceNotificationModal({
  isOpen,
  onClose,
  lang = "ar",
  selectedTypes,
  onSave,
  pushEnabled,
  onTogglePush,
  pushLoading = false,
}: DeviceNotificationModalProps) {
  const isAr = lang === "ar";
  const [selected, setSelected] = useState<Set<NotificationType>>(
    () => new Set(selectedTypes.length > 0 ? selectedTypes : ALL_NOTIFICATION_TYPES_LIST)
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(
    () => [
      { id: "all", label: isAr ? "الكل" : "All" },
      { id: "chat", label: isAr ? "المحادثات" : "Chat" },
      { id: "store", label: isAr ? "المتجر" : "Store" },
      { id: "campaigns", label: isAr ? "الحملات" : "Campaigns" },
      { id: "billing", label: isAr ? "الباقات والدفع" : "Billing" },
      { id: "automation", label: isAr ? "الأتمتة" : "Automation" },
      { id: "system", label: isAr ? "النظام والفريق" : "System" },
    ],
    [isAr]
  );

  const filteredNotifications = useMemo(() => {
    return ALL_SYSTEM_NOTIFICATIONS.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const titleStr = (isAr ? item.title.ar : item.title.en).toLowerCase();
      const descStr = (isAr ? item.description.ar : item.description.en).toLowerCase();
      return titleStr.includes(q) || descStr.includes(q);
    });
  }, [activeCategory, searchQuery, isAr]);

  if (!isOpen) return null;

  const isAllSelected = selected.size === ALL_SYSTEM_NOTIFICATIONS.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ALL_NOTIFICATION_TYPES_LIST));
    }
  };

  const toggleItem = (type: NotificationType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleSave = () => {
    const list = Array.from(selected);
    onSave(list);
    toast.success(
      isAr
        ? "تم حفظ إعدادات إشعارات الجهاز بنجاح! ✅"
        : "Device notification settings saved successfully! ✅"
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir={isAr ? "rtl" : "ltr"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Top Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#25D366] flex-shrink-0" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4 flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 flex items-center justify-center text-[#25D366] shadow-sm flex-shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isAr ? "تخصيص إشعارات الجهاز" : "Device Notification Settings"}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-[#128C7E] dark:text-[#25D366]">
                  {selected.size} / {ALL_SYSTEM_NOTIFICATIONS.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isAr
                  ? "حدد الإشعارات التي ترغب في استلامها كتنبيهات منبثقة على سطح المكتب والموبايل"
                  : "Select which notifications you want to receive on desktop and mobile"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isAr ? "إغلاق" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Toolbar: Search, Select All, Device Status */}
        <div className="px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className={`absolute top-2.5 w-4 h-4 text-gray-400 ${
                isAr ? "right-3" : "left-3"
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحث عن نوع إشعار..." : "Search notification type..."}
              className={`w-full h-9 rounded-xl text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-[#25D366] dark:focus:border-[#25D366] text-gray-800 dark:text-gray-100 placeholder-gray-400 shadow-sm ${
                isAr ? "pr-9 pl-3" : "pl-9 pr-3"
              }`}
            />
          </div>

          {/* Select All / Deselect All Button */}
          <button
            type="button"
            onClick={toggleSelectAll}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all active:scale-95 shadow-sm ${
              isAllSelected
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
            <span>
              {isAllSelected
                ? isAr
                  ? "إلغاء تحديد الكل"
                  : "Deselect All"
                : isAr
                ? "تحديد الكل"
                : "Select All"}
            </span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 no-scrollbar bg-white dark:bg-gray-900">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-[#25D366] text-white shadow-sm font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List of Notification Types with Checkboxes */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2.5 divide-y divide-gray-50 dark:divide-gray-800/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {isAr ? "لم يتم العثور على إشعارات مطابقة" : "No matching notifications found"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isChecked = selected.has(item.type);
              return (
                <div
                  key={item.type}
                  onClick={() => toggleItem(item.type)}
                  className={`pt-2.5 first:pt-0 flex items-center justify-between gap-4 p-3 rounded-2xl cursor-pointer transition-all border select-none ${
                    isChecked
                      ? "bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-800/50 hover:bg-green-50/70"
                      : "bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bgClass}`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                          {isAr ? item.title.ar : item.title.en}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        {isAr ? item.description.ar : item.description.en}
                      </p>
                    </div>
                  </div>

                  {/* Custom Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all border-2 ${
                      isChecked
                        ? "bg-[#25D366] border-[#25D366] text-white shadow-sm"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    }`}
                  >
                    {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer: Device Push Switch & Save Button */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/90 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          {/* Left: Device Push Status Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Laptop className="w-4 h-4" />
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {isAr ? "تفعيل التنبيهات على هذا الجهاز" : "Push notifications on this device"}
              </span>
            </div>

            <button
              type="button"
              onClick={onTogglePush}
              disabled={pushLoading}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                pushEnabled ? "bg-[#25D366]" : "bg-gray-300 dark:bg-gray-600"
              } ${pushLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                  pushEnabled
                    ? isAr
                      ? "left-1"
                      : "right-1"
                    : isAr
                    ? "right-1"
                    : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] text-white text-xs font-bold transition-all shadow-md shadow-green-100 dark:shadow-none active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isAr ? "حفظ الإعدادات" : "Save Preferences"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
