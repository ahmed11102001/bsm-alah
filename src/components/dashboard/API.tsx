"use client";

import { useEffect, useState, useCallback } from "react";
import { saveWhatsAppSettings, syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Copy, CheckCircle2, RefreshCw, ShoppingBag, Zap,
  ArrowRight, Loader2, CheckCircle, ChevronDown,
  MessageSquare, Webhook, ExternalLink, Shield,
  Database, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── أنواع البيانات ───────────────────────────────────────────────────────────
type CardId = "whatsapp" | "shopify" | "easyorders" | "webhook";

interface CardDef {
  id:          CardId;
  icon:        React.ReactNode;
  title:       string;
  subtitle:    string;
  accentColor: string;
  bgColor:     string;
  steps:       { n: number; title: string; desc: string }[];
  videoLabel:  string;
}

const CARDS: CardDef[] = [
  {
    id:          "whatsapp",
    icon:        <MessageSquare className="w-6 h-6" />,
    title:       "واتساب ميتا",
    subtitle:    "ربط حساب Business API",
    accentColor: "text-green-600",
    bgColor:     "bg-green-50 border-green-200",
    steps: [
      { n: 1, title: "افتح Meta Developers", desc: "روح على developers.facebook.com وابدأ تطبيق واتساب جديد" },
      { n: 2, title: "احصل على الـ Tokens",  desc: "انسخ Access Token و Phone Number ID و WABA ID من لوحة التحكم" },
      { n: 3, title: "الصق البيانات هنا",    desc: "ادخل البيانات في الخانات أدناه واضغط حفظ" },
    ],
    videoLabel: "مشاهدة طريقة ربط واتساب ميتا",
  },
  {
    id:          "shopify",
    icon:        <ShoppingBag className="w-6 h-6" />,
    title:       "شوبيفاي",
    subtitle:    "ربط متجر Shopify",
    accentColor: "text-blue-600",
    bgColor:     "bg-blue-50 border-blue-200",
    steps: [
      { n: 1, title: "أدخل رابط متجرك",   desc: "الرابط بيكون على الشكل: your-store.myshopify.com" },
      { n: 2, title: "وافق على التثبيت",  desc: "هيتفتحلك صفحة شوبيفاي — وافق على صلاحيات التطبيق" },
      { n: 3, title: "بدء سحب البيانات",  desc: "بعد الموافقة هيتم سحب بيانات العملاء والطلبات تلقائياً" },
    ],
    videoLabel: "مشاهدة طريقة ربط شوبيفاي",
  },
  {
    id:          "easyorders",
    icon:        <Zap className="w-6 h-6" />,
    title:       "إيزي أوردرز",
    subtitle:    "ربط يدوي آمن بالـ API",
    accentColor: "text-orange-600",
    bgColor:     "bg-orange-50 border-orange-200",
    steps: [
      { n: 1, title: "احصل على الـ API Key",  desc: "من داشبورد إيزي أوردرز: الإعدادات ← التكاملات ← API Key" },
      { n: 2, title: "أضف الـ Webhook URL",   desc: "في إيزي أوردرز: الإعدادات ← الويب هوك — الصق الرابط الموجود أدناه" },
      { n: 3, title: "ابدأ المزامنة",          desc: "ادخل الـ API Key واضغط 'بدء المزامنة' لجلب الطلبات السابقة" },
    ],
    videoLabel: "مشاهدة طريقة ربط إيزي أوردرز",
  },
  {
    id:          "webhook",
    icon:        <Webhook className="w-6 h-6" />,
    title:       "الويب هوك",
    subtitle:    "ربط Meta Developers",
    accentColor: "text-purple-600",
    bgColor:     "bg-purple-50 border-purple-200",
    steps: [
      { n: 1, title: "افتح Meta Developers",      desc: "في تطبيقك، روح Webhooks ← WhatsApp" },
      { n: 2, title: "أضف الـ Callback URL",      desc: "انسخ الرابط من أدناه والصقه في خانة Callback URL" },
      { n: 3, title: "أضف الـ Verify Token",      desc: "انسخ الـ Token من أدناه والصقه في خانة Verify Token واضغط Verify" },
    ],
    videoLabel: "مشاهدة طريقة إعداد الويب هوك",
  },
];

// ─── مكون CopyInput ───────────────────────────────────────────────────────────
function CopyInput({ value, placeholder }: { value: string; placeholder?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={value}
        placeholder={placeholder ?? "جاري التحميل..."}
        className="bg-white font-mono text-xs"
        dir="ltr"
      />
      <Button variant="outline" size="icon" onClick={copy} disabled={!value}>
        {copied
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

// ─── المكون الرئيسي ────────────────────────────────────────────────────────────
export default function API({ initialData }: { initialData?: any }) {
  const [openCard,     setOpenCard]     = useState<CardId | null>(null);
  const [isSyncing,    setIsSyncing]    = useState(false);

  // WhatsApp
  const [waLoading,    setWaLoading]    = useState(false);

  // Shopify
  const [shopUrl,      setShopUrl]      = useState("");
  const [shopLoading,  setShopLoading]  = useState(false);
  const [shopError,    setShopError]    = useState("");

  // EasyOrders
  const [eoApiKey,     setEoApiKey]     = useState("");
  const [eoStoreName,  setEoStoreName]  = useState("");
  const [eoWebhookUrl, setEoWebhookUrl] = useState("");
  const [eoUrlLoaded,  setEoUrlLoaded]  = useState(false);
  const [eoSyncing,    setEoSyncing]    = useState(false);
  const [eoStatus,     setEoStatus]     = useState<{
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string;
  } | null>(null);

  // Webhook
  const [verifyToken,  setVerifyToken]  = useState("");
  const [webhookUrl,   setWebhookUrl]   = useState("");

  // ── جلب البيانات الأولية ───────────────────────────────────────────────────
  useEffect(() => {
    // Webhook verify token
    fetch("/api/me/webhook-config")
      .then(r => r.json())
      .then(d => setVerifyToken(d.verifyToken ?? ""))
      .catch(() => {});

    // EasyOrders status
    fetch("/api/easy-orders/sync")
      .then(r => r.json())
      .then(d => setEoStatus(d))
      .catch(() => {});

    if (typeof window !== "undefined") {
      setWebhookUrl(`https://${window.location.host}/api/webhook`);
    }
  }, []);

  // ── جلب Webhook URL عند فتح كارت EasyOrders ──────────────────────────────
  const loadEoWebhookUrl = useCallback(async () => {
    if (eoUrlLoaded) return;
    try {
      const r = await fetch("/api/easy-orders/URL");
      const d = await r.json();
      if (d.url) { setEoWebhookUrl(d.url); setEoUrlLoaded(true); }
    } catch {}
  }, [eoUrlLoaded]);

  const handleCardClick = (id: CardId) => {
    setOpenCard(prev => prev === id ? null : id);
    if (id === "easyorders") loadEoWebhookUrl();
  };

  // ── مزامنة القوالب ────────────────────────────────────────────────────────
  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    try {
      const result = await syncWhatsAppTemplates();
      if (result.success) toast.success(`تمت مزامنة ${result.count} قالب`);
      else toast.error(result.error || "فشلت المزامنة");
    } catch { toast.error("خطأ غير متوقع"); }
    finally { setIsSyncing(false); }
  };

  // ── حفظ إعدادات واتساب ───────────────────────────────────────────────────
  const handleSaveWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWaLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await saveWhatsAppSettings({
        accessToken:   fd.get("accessToken")   as string,
        phoneNumberId: fd.get("phoneNumberId") as string,
        wabaId:        fd.get("wabaId")        as string,
      });
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch { toast.error("حدث خطأ أثناء الحفظ"); }
    finally { setWaLoading(false); }
  };

  // ── ربط شوبيفاي ──────────────────────────────────────────────────────────
  const handleShopifyConnect = async () => {
    setShopError("");
    const shop = shopUrl.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!shop) { setShopError("أدخل رابط المتجر أولاً"); return; }
    setShopLoading(true);
    try {
      const r = await fetch("/api/shopify/install", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shop }),
      });
      const d = await r.json();
      if (!r.ok) { setShopError(d.error ?? "حدث خطأ"); return; }
      window.location.href = d.authUrl;
    } catch { setShopError("تعذر الاتصال بالسيرفر"); }
    finally { setShopLoading(false); }
  };

  // ── مزامنة إيزي أوردرز ───────────────────────────────────────────────────
  const handleEoSync = async () => {
    if (!eoApiKey.trim()) { toast.error("أدخل الـ API Key أولاً"); return; }
    setEoSyncing(true);
    try {
      const r = await fetch("/api/easy-orders/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          apiKey:    eoApiKey.trim(),
          storeName: eoStoreName.trim() || "متجري",
        }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "فشلت المزامنة"); return; }
      toast.success(`✅ تم مزامنة ${d.synced} طلب${d.hasMore ? " — يوجد المزيد" : ""}`);
      setEoStatus({ connected: true, storeName: d.storeName, totalSynced: d.totalSynced, lastSyncAt: new Date().toISOString() });
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setEoSyncing(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الربط والـ API</h1>
          <p className="text-gray-500 text-sm mt-1">اربط حساباتك وإدر التكاملات</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleSyncTemplates} disabled={isSyncing}>
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          {isSyncing ? "جاري المزامنة..." : "تحديث القوالب"}
        </Button>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map(card => (
          <IntegrationCard
            key={card.id}
            card={card}
            isOpen={openCard === card.id}
            onToggle={() => handleCardClick(card.id)}
          >
            {/* ─── محتوى كل كارت ─────────────────────────────────────── */}

            {card.id === "whatsapp" && (
              <WhatsAppContent
                initialData={initialData}
                loading={waLoading}
                onSubmit={handleSaveWhatsApp}
              />
            )}

            {card.id === "shopify" && (
              <ShopifyContent
                shopUrl={shopUrl}
                setShopUrl={setShopUrl}
                shopError={shopError}
                setShopError={setShopError}
                loading={shopLoading}
                onConnect={handleShopifyConnect}
              />
            )}

            {card.id === "easyorders" && (
              <EasyOrdersContent
                apiKey={eoApiKey}
                setApiKey={setEoApiKey}
                storeName={eoStoreName}
                setStoreName={setEoStoreName}
                webhookUrl={eoWebhookUrl}
                syncing={eoSyncing}
                status={eoStatus}
                onSync={handleEoSync}
              />
            )}

            {card.id === "webhook" && (
              <WebhookContent
                webhookUrl={webhookUrl}
                verifyToken={verifyToken}
              />
            )}
          </IntegrationCard>
        ))}
      </div>
    </div>
  );
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────
function IntegrationCard({
  card, isOpen, onToggle, children,
}: {
  card: CardDef;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300",
        isOpen ? card.bgColor : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm",
        isOpen && "md:col-span-2"
      )}
    >
      {/* Card Header — قابل للنقر */}
      <button
        onClick={onToggle}
        className="w-full text-right p-5 flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isOpen ? "bg-white shadow-sm" : "bg-gray-100"
          )}>
            <span className={card.accentColor}>{card.icon}</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">{card.title}</p>
            <p className="text-xs text-gray-500">{card.subtitle}</p>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-5">

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {card.steps.map(step => (
              <div key={step.n} className="bg-white/70 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    "bg-white border-2",
                    card.accentColor.replace("text-", "border-"),
                    card.accentColor
                  )}>{step.n}</span>
                  <p className="text-xs font-semibold">{step.title}</p>
                </div>
                <p className="text-xs text-gray-500 pr-8">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div className="bg-white/80 rounded-xl p-4 border border-white">
            {children}
          </div>

          {/* Watch Tutorial Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-2 text-xs w-full justify-center border border-dashed", card.accentColor.replace("text-", "border-"), card.accentColor)}
            onClick={() => toast.info("قريباً — جاري تصوير الفيديوهات التعليمية")}
          >
            <ExternalLink className="w-3 h-3" />
            {card.videoLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── WhatsApp Content ─────────────────────────────────────────────────────────
function WhatsAppContent({ initialData, loading, onSubmit }: {
  initialData?: any;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label className="text-xs">Access Token</Label>
        <Input name="accessToken" defaultValue={initialData?.accessToken || ""} placeholder="EAA..." className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Phone Number ID</Label>
        <Input name="phoneNumberId" defaultValue={initialData?.phoneNumberId || ""} placeholder="123456789..." className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">WABA ID</Label>
        <Input name="wabaId" defaultValue={initialData?.wabaId || ""} placeholder="987654321..." className="mt-1" />
      </div>
      <Button disabled={loading} size="sm" className="w-full gap-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><CheckCircle className="w-4 h-4" /> حفظ الإعدادات</>}
      </Button>
    </form>
  );
}

// ─── Shopify Content ──────────────────────────────────────────────────────────
function ShopifyContent({ shopUrl, setShopUrl, shopError, setShopError, loading, onConnect }: {
  shopUrl: string; setShopUrl: (v: string) => void;
  shopError: string; setShopError: (v: string) => void;
  loading: boolean; onConnect: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">رابط المتجر</Label>
        <div className="flex gap-2 mt-1">
          <Input
            placeholder="your-store.myshopify.com"
            dir="ltr"
            value={shopUrl}
            onChange={e => { setShopUrl(e.target.value); setShopError(""); }}
            onKeyDown={e => e.key === "Enter" && onConnect()}
            disabled={loading}
          />
          <Button size="sm" onClick={onConnect} disabled={loading} className="bg-blue-600 hover:bg-blue-700 gap-2 whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> ربط</>}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">مثال: bsm-store.myshopify.com</p>
        {shopError && <p className="text-xs text-red-500 mt-1">{shopError}</p>}
      </div>
    </div>
  );
}

// ─── EasyOrders Content ───────────────────────────────────────────────────────
function EasyOrdersContent({ apiKey, setApiKey, storeName, setStoreName, webhookUrl, syncing, status, onSync }: {
  apiKey: string; setApiKey: (v: string) => void;
  storeName: string; setStoreName: (v: string) => void;
  webhookUrl: string;
  syncing: boolean;
  status: { connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string } | null;
  onSync: () => void;
}) {
  return (
    <div className="space-y-3">

      {/* Connected badge */}
      {status?.connected && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-medium text-green-700">{status.storeName}</span>
            <span className="text-green-600"> — {status.totalSynced?.toLocaleString()} طلب محفوظ</span>
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs">اسم المتجر (اختياري)</Label>
        <Input
          placeholder="مثال: متجر العلاء"
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs flex items-center gap-1">
          <Shield className="w-3 h-3" /> API Key من إيزي أوردرز
        </Label>
        <Input
          placeholder="eo_live_xxxxxxxxxxxx"
          dir="ltr"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          type="password"
          className="mt-1 font-mono"
        />
      </div>

      <div>
        <Label className="text-xs flex items-center gap-1">
          <LinkIcon className="w-3 h-3" /> رابط الـ Webhook (الصقه في إيزي أوردرز)
        </Label>
        <div className="mt-1">
          <CopyInput value={webhookUrl} placeholder="جاري التحميل..." />
        </div>
        <p className="text-[10px] text-orange-600 mt-1">⚠️ هذا الرابط خاص بك — لا تشاركه</p>
      </div>

      <Button
        onClick={onSync}
        disabled={syncing || !apiKey.trim()}
        size="sm"
        className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
      >
        {syncing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري المزامنة...</>
          : <><Database className="w-4 h-4" /> بدء المزامنة وحفظ البيانات</>}
      </Button>

      {status?.lastSyncAt && (
        <p className="text-[10px] text-gray-400 text-center">
          آخر مزامنة: {new Date(status.lastSyncAt).toLocaleString("ar-EG")}
        </p>
      )}
    </div>
  );
}

// ─── Webhook Content ──────────────────────────────────────────────────────────
function WebhookContent({ webhookUrl, verifyToken }: { webhookUrl: string; verifyToken: string }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-purple-600 font-bold">Callback URL</Label>
        <div className="mt-1">
          <CopyInput value={webhookUrl} />
        </div>
      </div>
      <div>
        <Label className="text-xs text-purple-600 font-bold">Verify Token</Label>
        <div className="mt-1">
          <CopyInput value={verifyToken} placeholder="جاري التحميل..." />
        </div>
      </div>
      <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
        <p className="text-xs text-purple-700">
          استخدم هذين الرابط في إعدادات Webhook داخل Meta Developers لاستقبال تقارير الرسائل.
        </p>
      </div>
    </div>
  );
}
