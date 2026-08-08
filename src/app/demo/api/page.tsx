"use client";

// نسخة الديمو من src/app/dashboard/api/page.tsx (1500+ سطر أصلاً، فيها فورمات
// ربط حقيقية بـ Meta/Shopify/WooCommerce/Claude). بما إنه مفيش بيانات حقيقية
// تتعرض هنا أصلاً، عملنا نسخة مبسطة: كروت حالة ربط فقط بنفس روح كروت
// الأتمتة، من غير فورمات إدخال مفاتيح حقيقية.

import { MessageCircle, ShoppingBag, Package, Store, Sparkles, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

type Status = "connected" | "available";

interface IntegrationDef {
    id: string;
    icon: React.ReactNode;
    color: string;
    titleAr: string; titleEn: string;
    descAr: string; descEn: string;
    status: Status;
    metaAr?: string; metaEn?: string;
}

const INTEGRATIONS: IntegrationDef[] = [
    {
        id: "whatsapp", icon: <MessageCircle className="w-5 h-5" />, color: "bg-green-500",
        titleAr: "واتساب بيزنس (Meta)", titleEn: "WhatsApp Business (Meta)",
        descAr: "الرقم الرسمي اللي بيبعت ويستقبل كل رسائلك", descEn: "The official number sending and receiving all your messages",
        status: "connected", metaAr: "رقم +20 100 123 4567", metaEn: "+20 100 123 4567",
    },
    {
        id: "shopify", icon: <ShoppingBag className="w-5 h-5" />, color: "bg-emerald-500",
        titleAr: "Shopify", titleEn: "Shopify",
        descAr: "مزامنة الأوردرات والعملاء أوتوماتيك", descEn: "Auto-sync orders and customers",
        status: "connected", metaAr: "متجر ليالي للعطور", metaEn: "Layali Perfumes Store",
    },
    {
        id: "easyorders", icon: <Package className="w-5 h-5" />, color: "bg-orange-500",
        titleAr: "EasyOrders", titleEn: "EasyOrders",
        descAr: "لمتاجر EasyOrders — مزامنة أوردرات فورية", descEn: "For EasyOrders stores — instant order sync",
        status: "available",
    },
    {
        id: "woocommerce", icon: <Store className="w-5 h-5" />, color: "bg-purple-500",
        titleAr: "WooCommerce", titleEn: "WooCommerce",
        descAr: "ربط موحّد لمتاجر ووردبريس — أوردرات ومنتجات AI", descEn: "Unified WordPress store connection — orders + AI products",
        status: "available",
    },
    {
        id: "claude", icon: <Sparkles className="w-5 h-5" />, color: "bg-[#d97757]",
        titleAr: "Claude AI (MCP)", titleEn: "Claude AI (MCP)",
        descAr: "تحكم في وني بالكامل من شات Claude", descEn: "Control WANI entirely from Claude chat",
        status: "connected", metaAr: "متصل عبر Claude Desktop", metaEn: "Connected via Claude Desktop",
    },
];

function lockedToast(locale: string) {
    toast.message(locale === "ar" ? "🔒 متاح في النسخة الكاملة" : "🔒 Available in the full version", {
        description: locale === "ar" ? "سجّل مجانًا عشان تقدر تربط حساباتك الحقيقية." : "Sign up free to connect your real accounts.",
    });
}

export default function DemoIntegrationsPage() {
    const { locale } = useLanguage();
    const lang = locale === "en" ? "en" : "ar";

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {lang === "ar" ? "التكاملات والربط" : "Integrations"}
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                    {lang === "ar" ? "الحسابات والخدمات المربوطة بحساب وني بتاعك" : "Accounts and services connected to your WANI account"}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTEGRATIONS.map(item => (
                    <div key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center text-white flex-shrink-0`}>
                            {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-sm text-gray-800 dark:text-white">
                                    {lang === "ar" ? item.titleAr : item.titleEn}
                                </p>
                                {item.status === "connected" ? (
                                    <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                        <CheckCircle2 className="w-3 h-3" /> {lang === "ar" ? "متصل" : "Connected"}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 flex-shrink-0">
                                        {lang === "ar" ? "غير مفعّل" : "Not connected"}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{lang === "ar" ? item.descAr : item.descEn}</p>
                            {item.status === "connected" && (item.metaAr || item.metaEn) && (
                                <p className="text-xs text-gray-500 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-2.5 py-1.5 font-mono inline-block">
                                    {lang === "ar" ? item.metaAr : item.metaEn}
                                </p>
                            )}
                            <div className="mt-3">
                                <button onClick={() => lockedToast(locale)}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#25D366] hover:underline">
                                    {item.status === "connected"
                                        ? (lang === "ar" ? "إدارة الربط" : "Manage connection")
                                        : (lang === "ar" ? "ربط الآن" : "Connect now")}
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}