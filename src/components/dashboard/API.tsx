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
import { useLanguage } from "@/lib/language-context";

type CardId = "whatsapp" | "shopify" | "easyorders" | "webhook";

// ─── CopyInput ────────────────────────────────────────────────────────────────
function CopyInput({ value, placeholder }: { value: string; placeholder?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} placeholder={placeholder ?? ""}
        className="bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 font-mono text-xs" dir="ltr" />
      <Button variant="outline" size="icon" onClick={copy} disabled={!value}
        className="dark:border-gray-600 dark:text-gray-300">
        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────
interface CardVisual {
  id: CardId;
  icon: React.ReactNode;
  accentColor: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
}

const CARD_VISUALS: CardVisual[] = [
  { id: "whatsapp",   icon: <MessageSquare className="w-6 h-6" />, accentColor: "text-green-600 dark:text-green-400",  bgLight: "bg-green-50",  bgDark: "dark:bg-green-900/20",  borderLight: "border-green-200",  borderDark: "dark:border-green-800"  },
  { id: "shopify",    icon: <ShoppingBag   className="w-6 h-6" />, accentColor: "text-blue-600 dark:text-blue-400",    bgLight: "bg-blue-50",   bgDark: "dark:bg-blue-900/20",   borderLight: "border-blue-200",   borderDark: "dark:border-blue-800"   },
  { id: "easyorders", icon: <Zap          className="w-6 h-6" />, accentColor: "text-orange-600 dark:text-orange-400",bgLight: "bg-orange-50", bgDark: "dark:bg-orange-900/20", borderLight: "border-orange-200", borderDark: "dark:border-orange-800" },
  { id: "webhook",    icon: <Webhook       className="w-6 h-6" />, accentColor: "text-purple-600 dark:text-purple-400",bgLight: "bg-purple-50", bgDark: "dark:bg-purple-900/20", borderLight: "border-purple-200", borderDark: "dark:border-purple-800" },
];

function IntegrationCard({ id, title, subtitle, steps, videoLabel, isOpen, onToggle, children }: {
  id: CardId; title: string; subtitle: string;
  steps: { title: string; desc: string }[];
  videoLabel: string; isOpen: boolean; onToggle: () => void;
  children: React.ReactNode;
}) {
  const v = CARD_VISUALS.find(c => c.id === id)!;

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300",
      isOpen
        ? `${v.bgLight} ${v.bgDark} ${v.borderLight} ${v.borderDark}`
        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm",
      isOpen && "md:col-span-2"
    )}>
      <button onClick={onToggle}
        className="w-full text-right p-5 flex items-center justify-between gap-3 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isOpen ? "bg-white dark:bg-gray-800 shadow-sm" : "bg-gray-100 dark:bg-gray-700"
          )}>
            <span className={v.accentColor}>{v.icon}</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((step, i) => (
              <div key={i} className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    "bg-white dark:bg-gray-800 border-2",
                    v.accentColor.replace("text-", "border-").split(" ")[0],
                    v.accentColor.split(" ")[0]
                  )}>{i + 1}</span>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{step.title}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 pr-8">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-white dark:border-gray-700">
            {children}
          </div>

          <Button variant="ghost" size="sm"
            className={cn("gap-2 text-xs w-full justify-center border border-dashed",
              v.accentColor.replace("text-", "border-").split(" ")[0],
              v.accentColor.split(" ")[0]
            )}
            onClick={() => toast.info(videoLabel)}>
            <ExternalLink className="w-3 h-3" /> {videoLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── WhatsApp Content ─────────────────────────────────────────────────────────
function WhatsAppContent({ initialData, loading, onSubmit, labels }: {
  initialData?: any; loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  labels: { savingBtn: string; saveBtn: string };
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label className="text-xs dark:text-gray-400">Access Token</Label>
        <Input name="accessToken" defaultValue={initialData?.accessToken || ""} placeholder="EAA..."
          className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
      </div>
      <div>
        <Label className="text-xs dark:text-gray-400">Phone Number ID</Label>
        <Input name="phoneNumberId" defaultValue={initialData?.phoneNumberId || ""} placeholder="123456789..."
          className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
      </div>
      <div>
        <Label className="text-xs dark:text-gray-400">WABA ID</Label>
        <Input name="wabaId" defaultValue={initialData?.wabaId || ""} placeholder="987654321..."
          className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
      </div>
      <Button disabled={loading} size="sm" className="w-full gap-2">
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> {labels.savingBtn}</>
          : <><CheckCircle className="w-4 h-4" /> {labels.saveBtn}</>}
      </Button>
    </form>
  );
}

// ─── Shopify Content ──────────────────────────────────────────────────────────
function ShopifyContent({ shopUrl, setShopUrl, shopError, setShopError, loading, onConnect, labels }: {
  shopUrl: string; setShopUrl: (v: string) => void;
  shopError: string; setShopError: (v: string) => void;
  loading: boolean; onConnect: () => void;
  labels: { urlLabel: string; urlPlaceholder: string; urlExample: string; connectBtn: string };
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs dark:text-gray-400">{labels.urlLabel}</Label>
        <div className="flex gap-2 mt-1">
          <Input placeholder={labels.urlPlaceholder} dir="ltr" value={shopUrl}
            onChange={e => { setShopUrl(e.target.value); setShopError(""); }}
            onKeyDown={e => e.key === "Enter" && onConnect()} disabled={loading}
            className="dark:bg-gray-700 dark:border-gray-600" />
          <Button size="sm" onClick={onConnect} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 gap-2 whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> {labels.connectBtn}</>}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{labels.urlExample}</p>
        {shopError && <p className="text-xs text-red-500 mt-1">{shopError}</p>}
      </div>
    </div>
  );
}

// ─── EasyOrders Content ───────────────────────────────────────────────────────
function EasyOrdersContent({ apiKey, setApiKey, storeName, setStoreName, webhookUrl, syncing, status, onSync, labels, locale }: {
  apiKey: string; setApiKey: (v: string) => void;
  storeName: string; setStoreName: (v: string) => void;
  webhookUrl: string; syncing: boolean;
  status: { connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string } | null;
  onSync: () => void;
  labels: typeof import("@/lib/i18n").translations.ar.api.cards.easyorders;
  locale: string;
}) {
  const dateStr = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")
    : "";

  return (
    <div className="space-y-3">
      {status?.connected && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-300 font-medium">
            {labels.connectedBadge(status.storeName ?? "", status.totalSynced ?? 0)}
          </p>
        </div>
      )}
      <div>
        <Label className="text-xs dark:text-gray-400">{labels.storeLabel}</Label>
        <Input placeholder={labels.storePlaceholder} value={storeName} onChange={e => setStoreName(e.target.value)}
          className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
      </div>
      <div>
        <Label className="text-xs dark:text-gray-400 flex items-center gap-1">
          <Shield className="w-3 h-3" /> {labels.apiKeyLabel}
        </Label>
        <Input placeholder="eo_live_xxxxxxxxxxxx" dir="ltr" value={apiKey}
          onChange={e => setApiKey(e.target.value)} type="password"
          className="mt-1 font-mono dark:bg-gray-700 dark:border-gray-600" />
      </div>
      <div>
        <Label className="text-xs dark:text-gray-400 flex items-center gap-1">
          <LinkIcon className="w-3 h-3" /> {labels.webhookLabel}
        </Label>
        <div className="mt-1">
          <CopyInput value={webhookUrl} placeholder={labels.loading} />
        </div>
        <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">{labels.webhookWarning}</p>
      </div>
      <Button onClick={onSync} disabled={syncing || !apiKey.trim()} size="sm"
        className="w-full gap-2 bg-orange-600 hover:bg-orange-700">
        {syncing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> {labels.syncingBtn}</>
          : <><Database className="w-4 h-4" /> {labels.syncBtn}</>}
      </Button>
      {dateStr && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">{labels.lastSync(dateStr)}</p>
      )}
    </div>
  );
}

// ─── Webhook Content ──────────────────────────────────────────────────────────
function WebhookContent({ webhookUrl, verifyToken, hint }: {
  webhookUrl: string; verifyToken: string; hint: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-purple-600 dark:text-purple-400 font-bold">Callback URL</Label>
        <div className="mt-1"><CopyInput value={webhookUrl} /></div>
      </div>
      <div>
        <Label className="text-xs text-purple-600 dark:text-purple-400 font-bold">Verify Token</Label>
        <div className="mt-1"><CopyInput value={verifyToken} placeholder="..." /></div>
      </div>
      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
        <p className="text-xs text-purple-700 dark:text-purple-300">{hint}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function API({ initialData }: { initialData?: any }) {
  const { t, dir, locale } = useLanguage();
  const api = t.api;

  const [openCard,    setOpenCard]    = useState<CardId | null>(null);
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [waLoading,   setWaLoading]   = useState(false);
  const [shopUrl,     setShopUrl]     = useState("");
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError,   setShopError]   = useState("");
  const [eoApiKey,    setEoApiKey]    = useState("");
  const [eoStoreName, setEoStoreName] = useState("");
  const [eoWebhookUrl,setEoWebhookUrl]= useState("");
  const [eoUrlLoaded, setEoUrlLoaded] = useState(false);
  const [eoSyncing,   setEoSyncing]   = useState(false);
  const [eoStatus,    setEoStatus]    = useState<{
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string;
  } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl,  setWebhookUrl]  = useState("");

  useEffect(() => {
    fetch("/api/me/webhook-config").then(r => r.json()).then(d => setVerifyToken(d.verifyToken ?? "")).catch(() => {});
    fetch("/api/easy-orders/sync").then(r => r.json()).then(d => setEoStatus(d)).catch(() => {});
    if (typeof window !== "undefined") setWebhookUrl(`https://${window.location.host}/api/webhook`);
  }, []);

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

  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    try {
      const result = await syncWhatsAppTemplates();
      if (result.success) toast.success(api.syncSuccess(result.count ?? 0));
      else toast.error(result.error || api.syncError);
    } catch { toast.error(api.syncError); }
    finally { setIsSyncing(false); }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setWaLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await saveWhatsAppSettings({
        accessToken:   fd.get("accessToken")   as string,
        phoneNumberId: fd.get("phoneNumberId") as string,
        wabaId:        fd.get("wabaId")        as string,
      });
      toast.success(api.cards.whatsapp.savedMsg);
    } catch { toast.error(api.cards.whatsapp.saveErr); }
    finally { setWaLoading(false); }
  };

  const handleShopifyConnect = async () => {
    setShopError("");
    const shop = shopUrl.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!shop) { setShopError(api.cards.shopify.urlErr); return; }
    setShopLoading(true);
    try {
      const r = await fetch("/api/shopify/install", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });
      const d = await r.json();
      if (!r.ok) { setShopError(d.error ?? api.cards.shopify.serverErr); return; }
      window.location.href = d.authUrl;
    } catch { setShopError(api.cards.shopify.serverErr); }
    finally { setShopLoading(false); }
  };

  const handleEoSync = async () => {
    if (!eoApiKey.trim()) { toast.error(api.cards.easyorders.apiKeyErr); return; }
    setEoSyncing(true);
    try {
      const r = await fetch("/api/easy-orders/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: eoApiKey.trim(), storeName: eoStoreName.trim() || "متجري" }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? api.cards.easyorders.syncErr); return; }
      toast.success(api.cards.easyorders.syncSuccess(d.synced, d.hasMore));
      setEoStatus({ connected: true, storeName: d.storeName, totalSynced: d.totalSynced, lastSyncAt: new Date().toISOString() });
    } catch { toast.error(api.cards.easyorders.syncErr); }
    finally { setEoSyncing(false); }
  };

  const CARD_DEFS: { id: CardId; title: string; subtitle: string; steps: { title: string; desc: string }[]; videoLabel: string }[] = [
    { id: "whatsapp",   title: api.cards.whatsapp.title,   subtitle: api.cards.whatsapp.subtitle,   steps: api.cards.whatsapp.steps.map((s,i) => ({ title: (s as any).title, desc: (s as any).desc })),   videoLabel: api.cards.whatsapp.video   },
    { id: "shopify",    title: api.cards.shopify.title,    subtitle: api.cards.shopify.subtitle,    steps: api.cards.shopify.steps.map(s    => ({ title: (s as any).title, desc: (s as any).desc })),    videoLabel: api.cards.shopify.video    },
    { id: "easyorders", title: api.cards.easyorders.title, subtitle: api.cards.easyorders.subtitle, steps: api.cards.easyorders.steps.map(s => ({ title: (s as any).title, desc: (s as any).desc })), videoLabel: api.cards.easyorders.video },
    { id: "webhook",    title: api.cards.webhook.title,    subtitle: api.cards.webhook.subtitle,    steps: api.cards.webhook.steps.map(s    => ({ title: (s as any).title, desc: (s as any).desc })),    videoLabel: api.cards.webhook.video    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir={dir}>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{api.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{api.subtitle}</p>
        </div>
        <Button variant="outline" className="gap-2 dark:border-gray-700 dark:text-gray-300"
          onClick={handleSyncTemplates} disabled={isSyncing}>
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          {isSyncing ? api.syncing : api.syncBtn}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARD_DEFS.map(card => (
          <IntegrationCard key={card.id} {...card} isOpen={openCard === card.id} onToggle={() => handleCardClick(card.id)}>
            {card.id === "whatsapp" && (
              <WhatsAppContent initialData={initialData} loading={waLoading} onSubmit={handleSaveWhatsApp}
                labels={{ savingBtn: api.cards.whatsapp.savingBtn, saveBtn: api.cards.whatsapp.saveBtn }} />
            )}
            {card.id === "shopify" && (
              <ShopifyContent shopUrl={shopUrl} setShopUrl={setShopUrl} shopError={shopError}
                setShopError={setShopError} loading={shopLoading} onConnect={handleShopifyConnect}
                labels={api.cards.shopify} />
            )}
            {card.id === "easyorders" && (
              <EasyOrdersContent apiKey={eoApiKey} setApiKey={setEoApiKey}
                storeName={eoStoreName} setStoreName={setEoStoreName}
                webhookUrl={eoWebhookUrl} syncing={eoSyncing} status={eoStatus}
                onSync={handleEoSync} labels={api.cards.easyorders} locale={locale} />
            )}
            {card.id === "webhook" && (
              <WebhookContent webhookUrl={webhookUrl} verifyToken={verifyToken} hint={api.cards.webhook.hint} />
            )}
          </IntegrationCard>
        ))}
      </div>
    </div>
  );
}