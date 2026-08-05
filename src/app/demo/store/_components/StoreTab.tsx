// نسخة الديمو من src/app/dashboard/store/_components/StoreTab.tsx
// الفروق المتعمدة:
//   - مفيش fetch للعملاء ولا الأتمتات — بيانات جاهزة من store-data.ts.
//   - handleSaveAutomation بيعمل تحديث محلي + توست بدل fetch("/api/store/automation").
//   - "مزامنة يدوية" بتاعة EasyOrders برضه simulated (مش هتظهر أصلاً لأن مصدر
//     متجر الديمو "shopify").

import { useMemo, useState } from "react";
import {
    Package, Users, TrendingUp, RefreshCw, Search, Phone, ChevronRight, Globe,
} from "lucide-react";
import { toast } from "sonner";
import type {
    AutomationItem, AutomationTemplate, Customer, Lang, StoreAutomationType, StoreInfo,
} from "./types";
import { tr } from "./constants";
import { formatMoney, formatDate } from "./store-utils";
import { KpiCard } from "./KpiCard";
import { CustomerCard } from "./CustomerCard";
import { CopyPhonesButton } from "./CopyPhonesButton";
import { ExportExcelButton } from "./ExportExcelButton";
import { AutomationCard } from "./AutomationCard";

export interface StoreTabProps {
    store: StoreInfo;
    onOpenChat: (phone: string) => void;
    lang: Lang;
    initialAutomations: AutomationItem[];
    promoTemplates: AutomationTemplate[];
    allCustomers: Customer[];
}

export function StoreTab({
    store, onOpenChat, lang, initialAutomations, promoTemplates, allCustomers,
}: StoreTabProps) {
    const [search, setSearch] = useState("");
    const [visibleCount, setVisibleCount] = useState(6);
    const [automations, setAutomations] = useState<AutomationItem[]>(initialAutomations);

    const customers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allCustomers;
        return allCustomers.filter(c =>
            c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.lastOrder?.orderNumber?.includes(q));
    }, [allCustomers, search]);

    const visibleCustomers = customers.slice(0, visibleCount);
    const hasMore = visibleCount < customers.length;

    // ── حفظ الأتمتة — محاكاة نفس واجهة الـ API الحقيقي (نفس الـ delay/توست) ────
    async function handleSaveAutomation(
        type: StoreAutomationType, isEnabled: boolean, templateId: string | null, delayMinutes?: number
    ): Promise<void> {
        await new Promise(res => setTimeout(res, 500));
        toast.success(isEnabled
            ? (lang === "ar" ? "✅ تم تفعيل الأتمتة" : "✅ Automation enabled")
            : (lang === "ar" ? "تم إيقاف الأتمتة" : "Automation disabled"));

        setAutomations(prev => prev.map(a => a.type === type
            ? {
                ...a, isEnabled, templateId,
                template: templateId ? (promoTemplates.find(t => t.id === templateId) ?? a.template) : null,
                delayMinutes: delayMinutes ?? a.delayMinutes ?? 0,
            }
            : a));
    }

    return (
        <div className="space-y-8">
            {/* ── KPIs ──────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={<Package className="w-5 h-5 text-blue-600" />} label={tr("totalOrders", lang)}
                    value={store.totalOrders.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} color="bg-blue-50 dark:bg-blue-900/20" />
                <KpiCard icon={<Users className="w-5 h-5 text-purple-600" />} label={tr("totalCustomers", lang)}
                    value={store.totalCustomers.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} color="bg-purple-50 dark:bg-purple-900/20" />
                <KpiCard icon={<TrendingUp className="w-5 h-5 text-[#25D366]" />} label={tr("campaignRevenue", lang)}
                    value={formatMoney(store.campaignRevenue, lang)} sub={tr("revenueSub", lang)} color="bg-[#25D366]/10" />
                <KpiCard icon={<RefreshCw className="w-5 h-5 text-orange-500" />} label={tr("lastSync", lang)}
                    value={store.lastSyncAt ? formatDate(store.lastSyncAt, lang) : "—"}
                    sub={store.totalSynced ? `${store.totalSynced.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${tr("savedOrders", lang)}` : undefined}
                    color="bg-orange-50 dark:bg-orange-900/20" />
            </div>

            {/* ── Automations ───────────────────────────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-800 dark:text-white">{tr("automationsTitle", lang)}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                        {automations.filter(a => a.isEnabled).length} / {automations.length} {tr("enabled", lang)}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {automations.map(auto => (
                        <AutomationCard key={auto.type} automation={auto} templates={promoTemplates}
                            onSave={handleSaveAutomation} lang={lang} storeSource={store.source} customers={customers} />
                    ))}
                </div>
            </section>

            {/* ── Customers ─────────────────────────────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h2 className="text-base font-bold text-gray-800 dark:text-white">
                        {tr("customersTitle", lang)}
                        <span className="text-sm font-normal text-gray-400 mr-2">
                            ({customers.length.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")})
                        </span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <CopyPhonesButton customers={customers} lang={lang} />
                        <ExportExcelButton source={store.source} search={search} lang={lang} />
                    </div>
                </div>

                <div className="relative mb-4 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("searchPh", lang)}
                        className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30" />
                </div>

                {customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Users className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{tr("noCustomers", lang)}</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visibleCustomers.map(c => (
                                <CustomerCard key={c.phone} customer={c} onChat={onOpenChat} lang={lang} />
                            ))}
                        </div>
                        {hasMore && (
                            <div className="mt-6 text-center">
                                <button onClick={() => setVisibleCount(v => v + 6)}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    {tr("loadMore", lang)}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* ── Contact List Banner ────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-[#25D366]" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 dark:text-white">
                        {tr("listTitle", lang)} "{lang === "ar" ? `عملاء ${store.storeName}` : `${store.storeName} customers`}"
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {store.totalCustomers.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} {tr("syncedContacts", lang)}
                    </p>
                </div>
                <button onClick={() => toast.info(tr("goContactsToast", lang))}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#25D366] hover:underline flex-shrink-0">
                    {tr("goContacts", lang)}
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* ── WooCommerce Webhook Info (لن تظهر لمتجر الديمو، Shopify) ─────────── */}
            {store.source === "woocommerce" && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                <Globe className="w-4 h-4 text-purple-500" /> {tr("webhookTitle", lang)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{tr("webhookSub", lang)}</p>
                        </div>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full border border-green-200 dark:border-green-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> {tr("active", lang)}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{tr("webhookHint", lang)}</p>
                </div>
            )}
        </div>
    );
}