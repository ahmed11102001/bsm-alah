"use client";

import { useEffect, useState, useCallback } from "react";
import { saveWhatsAppSettings, syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Copy, CheckCircle2, RefreshCw, ShoppingBag, Zap,
  Loader2, CheckCircle, ChevronDown,
  MessageSquare, Webhook, ExternalLink, Shield,
  Database, Link as LinkIcon, Globe, Key, Trash2, Lock,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

type CardId = "whatsapp" | "shopify" | "easyorders" | "woocommerce" | "webhook" | "claude";

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
  bgLight: string; bgDark: string;
  borderLight: string; borderDark: string;
}

const CARD_VISUALS: CardVisual[] = [
  { id: "whatsapp",    icon: <img src="/partners/meta.svg" alt="Meta" className="w-6 h-6 object-contain" />, accentColor: "text-green-600 dark:text-green-400",   bgLight: "bg-green-50",   bgDark: "dark:bg-green-900/20",   borderLight: "border-green-200",   borderDark: "dark:border-green-800"   },
  { id: "shopify",     icon: <img src="/partners/shopify.svg" alt="Shopify" className="w-6 h-6 object-contain" />, accentColor: "text-blue-600 dark:text-blue-400",     bgLight: "bg-blue-50",    bgDark: "dark:bg-blue-900/20",    borderLight: "border-blue-200",    borderDark: "dark:border-blue-800"    },
  { id: "easyorders",  icon: <img src="/partners/easyorder.svg" alt="EasyOrders" className="w-6 h-6 object-contain" />, accentColor: "text-orange-600 dark:text-orange-400", bgLight: "bg-orange-50",  bgDark: "dark:bg-orange-900/20",  borderLight: "border-orange-200",  borderDark: "dark:border-orange-800"  },
  { id: "woocommerce", icon: <img src="/partners/woocommerce.svg" alt="WooCommerce" className="w-6 h-6 object-contain" />, accentColor: "text-purple-600 dark:text-purple-400", bgLight: "bg-purple-50",  bgDark: "dark:bg-purple-900/20",  borderLight: "border-purple-200",  borderDark: "dark:border-purple-800"  },
  { id: "webhook",     icon: <Webhook className="w-6 h-6" />, accentColor: "text-gray-600 dark:text-gray-400",     bgLight: "bg-gray-50",    bgDark: "dark:bg-gray-900/20",    borderLight: "border-gray-200",    borderDark: "dark:border-gray-800"    },
  { id: "claude",      icon: <img src="/partners/claude.svg.svg" alt="Claude" className="w-6 h-6 object-contain" />, accentColor: "text-orange-600 dark:text-orange-400", bgLight: "bg-orange-50",  bgDark: "dark:bg-orange-900/20",  borderLight: "border-orange-200",  borderDark: "dark:border-orange-800"  },
];

function IntegrationCard({ id, title, subtitle, steps, isOpen, onToggle, children, locked = false, lockMessage = "" }: {
  id: CardId; title: string; subtitle: string;
  steps: { title: string; desc: string }[];
  isOpen: boolean; onToggle: () => void;
  children: React.ReactNode;
  locked?: boolean;
  lockMessage?: string;
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
        title={locked ? lockMessage : undefined}
        className="w-full text-right p-5 flex items-center justify-between gap-3 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isOpen ? "bg-white dark:bg-gray-800 shadow-sm" : "bg-gray-100 dark:bg-gray-700"
          )}>
            <span className={v.accentColor}>{v.icon}</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              {title}
              {locked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
            </p>
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

// ─── Shopify Content — Webhook فقط، زي EasyOrders بالظبط ────────────────────
interface ShopifyStatus {
  connected:    boolean;
  storeName?:   string;
  connectedAt?: string | null;
  webhookUrl?:  string;
}

function ShopifyContent({
  storeName, setStoreName, shopDomain, setShopDomain,
  webhookUrl, status, onConnect, onRefresh, loading,
}: {
  storeName:      string;
  setStoreName:   (v: string) => void;
  shopDomain:     string;
  setShopDomain:  (v: string) => void;
  webhookUrl:     string;
  status:         ShopifyStatus | null;
  onConnect:      () => void;
  onRefresh:      () => void;
  loading:        boolean;
}) {
  async function handleDisconnect() {
    if (!confirm("هتفك ربط المتجر وهيوقف الأتمتة، متأكد؟")) return;
    const r = await fetch("/api/shopify/install", { method: "DELETE" });
    if (r.ok) { toast.success("تم فك الربط"); onRefresh(); }
    else       toast.error("فشل فك الربط");
  }

  return (
    <div className="space-y-3">

      {/* ── متجر مربوط ─────────────────────────────────────────────────────── */}
      {status?.connected && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20
                        rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="flex-1 text-xs font-medium text-green-700 dark:text-green-300">
            {status.storeName} — متصل ✅
          </p>
          <button
            onClick={handleDisconnect}
            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50
                       dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── اسم المتجر (قبل الربط فقط) ──────────────────────────────────────── */}
      {!status?.connected && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs dark:text-gray-400">اسم المتجر</Label>
            <Input
              placeholder="مثال: متجر العلاء"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="mt-1 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <Label className="text-xs dark:text-gray-400">
              دومين Shopify
              <span className="text-gray-400 font-normal mr-1">(اختياري — للتحقق)</span>
            </Label>
            <Input
              placeholder="mystore.myshopify.com"
              value={shopDomain}
              onChange={e => setShopDomain(e.target.value)}
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 text-left"
              dir="ltr"
            />
          </div>
        </div>
      )}

      {/* ── Webhook URL — يتعرض دايماً ───────────────────────────────────────── */}
      <div>
        <Label className="text-xs dark:text-gray-400 flex items-center gap-1 mb-1">
          <LinkIcon className="w-3 h-3" /> Webhook URL — انسخه وحطه في Shopify
        </Label>
        <CopyInput
          value={webhookUrl}
          placeholder={webhookUrl ? "" : "جاري التحميل..."}
        />
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-5">
            📌 <strong>Settings → Notifications → Webhooks → Create webhook</strong>
            <br />
            اختر <strong>Order creation</strong> والصق الـ URL — كرر لـ <strong>Order fulfillment</strong>
            <br />
            لتفعيل أتمتة السلة 🛒: كرر أيضاً لـ <strong>Checkout creation</strong> و <strong>Checkout update</strong>
          </p>
        </div>
      </div>

      {/* ── زر الحفظ (قبل الربط فقط) ──────────────────────────────────────── */}
      {!status?.connected && (
        <Button
          size="sm"
          onClick={onConnect}
          disabled={loading || !storeName.trim()}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            : <><ShoppingBag className="w-4 h-4" /> حفظ وتفعيل المتجر</>}
        </Button>
      )}

    </div>
  );
}

// ─── EasyOrders Content ───────────────────────────────────────────────────────
interface EasyOrdersLabels {
  storeLabel: string; storePlaceholder: string;
  apiKeyLabel: string; webhookLabel: string; webhookWarning: string;
  syncingBtn: string; syncBtn: string; apiKeyErr: string;
  syncSuccess: (synced: number, hasMore: boolean) => string;
  syncErr: string;
  connectedBadge: (store: string, total: number) => string;
  lastSync: (date: string) => string;
  loading: string;
}

function EasyOrdersContent({ apiKey, setApiKey, storeName, setStoreName, webhookUrl, syncing, status, onSync, labels, locale }: {
  apiKey: string; setApiKey: (v: string) => void;
  storeName: string; setStoreName: (v: string) => void;
  webhookUrl: string; syncing: boolean;
  status: { connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string } | null;
  onSync: () => void;
  labels: EasyOrdersLabels;
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
        <div className="mt-1"><CopyInput value={webhookUrl} placeholder={labels.loading} /></div>
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

// ─── WooCommerce Content ──────────────────────────────────────────────────────
interface WooStatus {
  connected:   boolean;
  storeName?:  string;
  totalSynced?: number;
  lastSyncAt?:  string | null;
}

function WooCommerceContent({ status, onRefresh, locale }: {
  status: WooStatus | null;
  onRefresh: () => void;
  locale: string;
}) {
  const [storeName, setStoreName] = useState("");
  const [storeUrl,  setStoreUrl]  = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const [error,     setError]     = useState("");

  const loadWebhookUrl = useCallback(async () => {
    if (urlLoaded) return;
    try {
      const r = await fetch("/api/woocommerce/URL");
      const d = await r.json();
      if (d.url) { setWebhookUrl(d.url); setUrlLoaded(true); }
    } catch {}
  }, [urlLoaded]);

  useEffect(() => { loadWebhookUrl(); }, [loadWebhookUrl]);

  async function handleConnect() {
    setError("");
    if (!storeName.trim()) { setError("أدخل اسم المتجر"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/woocommerce/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storeName: storeName.trim(), storeUrl: storeUrl.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "فشل الحفظ"); return; }
      toast.success("✅ تم حفظ بيانات المتجر — افتح WooCommerce وأضف الـ Webhook URL");
      onRefresh();
    } catch { setError("خطأ في الاتصال"); }
    finally  { setLoading(false); }
  }

  async function handleDisconnect() {
    if (!confirm("هتفك ربط المتجر وهيوقف الأتمتة، متأكد؟")) return;
    const r = await fetch("/api/woocommerce/connect", { method: "DELETE" });
    if (r.ok) { toast.success("تم فك الربط"); onRefresh(); }
    else       toast.error("فشل فك الربط");
  }

  const dateStr = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")
    : "";

  return (
    <div className="space-y-3">
      {/* Connected Badge */}
      {status?.connected && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">
              {status.storeName} — {(status.totalSynced ?? 0).toLocaleString("ar-EG")} طلب مستلم
            </p>
            {dateStr && <p className="text-[10px] text-green-600/70 dark:text-green-400/70">آخر طلب: {dateStr}</p>}
          </div>
          <button onClick={handleDisconnect} className="text-red-500 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Store Name */}
      <div>
        <Label className="text-xs dark:text-gray-400">اسم المتجر</Label>
        <Input
          placeholder="متجر WooCommerce"
          value={status?.connected ? (status.storeName ?? "") : storeName}
          onChange={e => setStoreName(e.target.value)}
          disabled={status?.connected}
          className="mt-1 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* Store URL */}
      {!status?.connected && (
        <div>
          <Label className="text-xs dark:text-gray-400 flex items-center gap-1">
            <Globe className="w-3 h-3" /> رابط المتجر (اختياري)
          </Label>
          <Input
            placeholder="https://mystore.com"
            dir="ltr"
            value={storeUrl}
            onChange={e => setStoreUrl(e.target.value)}
            className="mt-1 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      )}

      {/* Webhook URL */}
      <div>
        <Label className="text-xs dark:text-gray-400 flex items-center gap-1">
          <LinkIcon className="w-3 h-3" /> Webhook URL
        </Label>
        <div className="mt-1">
          <CopyInput value={webhookUrl} placeholder="جاري التحميل..." />
        </div>
        <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
          ⚠️ افتح WooCommerce → Settings → Advanced → Webhooks → أضف هذا الرابط لحدث &quot;Order created&quot; و &quot;Order updated&quot;
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {!status?.connected && (
        <Button
          onClick={handleConnect}
          disabled={loading}
          size="sm"
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            : <><Globe className="w-4 h-4" /> حفظ وتفعيل المتجر</>}
        </Button>
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
        <Label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Callback URL</Label>
        <div className="mt-1"><CopyInput value={webhookUrl} /></div>
      </div>
      <div>
        <Label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Verify Token</Label>
        <div className="mt-1"><CopyInput value={verifyToken} placeholder="..." /></div>
      </div>
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-700 dark:text-gray-300">{hint}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function API({ initialData, canUseStoreIntegrations = true, canUseClaude = true }: { initialData?: any; canUseStoreIntegrations?: boolean; canUseClaude?: boolean }) {
  const { t, dir, locale } = useLanguage();
  const api = t.api;

  const [openCard,     setOpenCard]     = useState<CardId | null>(null);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [waLoading,    setWaLoading]    = useState(false);
  const [eoApiKey,     setEoApiKey]     = useState("");
  const [eoStoreName,  setEoStoreName]  = useState("");
  const [eoWebhookUrl, setEoWebhookUrl] = useState("");
  const [eoUrlLoaded,  setEoUrlLoaded]  = useState(false);
  const [eoSyncing,    setEoSyncing]    = useState(false);
  const [eoStatus,     setEoStatus]     = useState<{
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string;
  } | null>(null);
  const [shopifyStatus,    setShopifyStatus]    = useState<{
    connected: boolean; storeName?: string; connectedAt?: string | null; webhookUrl?: string;
  } | null>(null);
  const [shStoreName,      setShStoreName]      = useState("");
  const [shShopDomain,     setShShopDomain]     = useState("");
  const [shWebhookUrl,     setShWebhookUrl]     = useState("");
  const [shUrlLoaded,      setShUrlLoaded]      = useState(false);
  const [shConnecting,     setShConnecting]     = useState(false);
  const [wooStatus,    setWooStatus]    = useState<{
    connected: boolean; storeName?: string; totalSynced?: number; lastSyncAt?: string | null;
  } | null>(null);
  const [verifyToken,  setVerifyToken]  = useState("");
  const [webhookUrl,   setWebhookUrl]   = useState("");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeCopied,  setClaudeCopied]  = useState<"key"|"config"|null>(null);
  const [showClaudeUpgrade, setShowClaudeUpgrade] = useState(false);

  // ── Load initial data ───────────────────────────────────────────────────────
  const loadShopifyStatus = useCallback(async () => {
    try {
      // جيب الـ Webhook URL أول حاجة وحده عشان مش يأثرش على باقي الداتا لو فشل
      const shUrlRes  = await fetch("/api/shopify/URL").catch(() => null);
      const shUrl     = shUrlRes?.ok ? await shUrlRes.json() : {};
      const webhookUrl = shUrl?.url ?? "";

      setShWebhookUrl(webhookUrl);
      setShUrlLoaded(true);

      if (shUrl?.connected) {
        setShopifyStatus({
          connected:   true,
          storeName:   shUrl.storeName,
          connectedAt: shUrl.connectedAt,
          webhookUrl,
        });
      } else {
        setShopifyStatus({ connected: false, webhookUrl });
      }

      // جيب WooCommerce من store route
      const storeRes = await fetch("/api/store").catch(() => null);
      if (!storeRes?.ok) return;
      const d = await storeRes.json();

      if (d.woocommerce) {
        setWooStatus({
          connected:   true,
          storeName:   d.woocommerce.storeName,
          totalSynced: d.woocommerce.totalSynced,
          lastSyncAt:  d.woocommerce.lastSyncAt,
        });
      } else {
        setWooStatus({ connected: false });
      }
    } catch (e) {
      console.error("[loadShopifyStatus]", e);
    }
  }, []);

  useEffect(() => {
    fetch("/api/me/webhook-config").then(r => r.json()).then(d => setVerifyToken(d.verifyToken ?? "")).catch(() => {});
    fetch("/api/easy-orders/sync").then(r => r.json()).then(d => setEoStatus(d)).catch(() => {});
    fetch("/api/me/api-key").then(r => r.ok ? r.json() : { apiKey: "" }).then(d => setClaudeApiKey(d.apiKey ?? "")).catch(() => {});
    if (typeof window !== "undefined") setWebhookUrl(`https://${window.location.host}/api/webhook`);
    loadShopifyStatus();
  }, [loadShopifyStatus]);

  const loadEoWebhookUrl = useCallback(async () => {
    if (eoUrlLoaded) return;
    try {
      const r = await fetch("/api/easy-orders/URL");
      const d = await r.json();
      if (d.url) { setEoWebhookUrl(d.url); setEoUrlLoaded(true); }
    } catch {}
  }, [eoUrlLoaded]);

  const lockMessage = locale === "ar"
    ? "ربط المتاجر متاح من باقة Professional فما فوق. قم بترقية الباقة."
    : "Store integrations are available on Professional plan and above. Please upgrade.";
  const claudeLockMessage = locale === "ar"
    ? "Claude AI غير مناسب لباقتك الحالية. قم بالترقية للاستفادة منه."
    : "Claude AI is available on Pro plan and above. Please upgrade.";
  const isStoreCardLocked = (id: CardId) =>
    !canUseStoreIntegrations && (id === "shopify" || id === "easyorders" || id === "woocommerce");
  const isClaudeCardLocked = (id: CardId) => !canUseClaude && id === "claude";
  const isCardLocked = (id: CardId) => isStoreCardLocked(id) || isClaudeCardLocked(id);
  const getCardLockMessage = (id: CardId) =>
    isClaudeCardLocked(id) ? claudeLockMessage : lockMessage;

  const handleCardClick = (id: CardId) => {
    if (isCardLocked(id)) {
      if (id === "claude") { setShowClaudeUpgrade(true); return; }
      toast.error(getCardLockMessage(id));
      return;
    }
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
    finally  { setIsSyncing(false); }
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
    finally  { setWaLoading(false); }
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
    finally  { setEoSyncing(false); }
  };

  const handleShConnect = async () => {
    if (!shStoreName.trim()) { toast.error("أدخل اسم المتجر أولاً"); return; }
    setShConnecting(true);
    try {
      const r = await fetch("/api/shopify/install", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          storeName:  shStoreName.trim(),
          shopDomain: shShopDomain.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "فشل الحفظ"); return; }
      toast.success(`✅ تم حفظ متجر ${d.storeName} — أضف الـ Webhook URL في Shopify`);
      setShStoreName("");
      loadShopifyStatus();
    } catch { toast.error("خطأ في الاتصال"); }
    finally  { setShConnecting(false); }
  };

  const handleGenerateApiKey = async () => {
    setClaudeLoading(true);
    try {
      const r = await fetch("/api/me/api-key", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error ?? "خطأ"); return; }
      setClaudeApiKey(d.apiKey);
      toast.success("تم إنشاء API Key جديد");
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setClaudeLoading(false); }
  };

  const copyClaudeText = (type: "key" | "config") => {
    const host = typeof window !== "undefined" ? window.location.host : "whatsprosystem.vercel.app";
    const text = type === "key"
      ? `Bearer ${claudeApiKey}`
      : JSON.stringify({
          mcpServers: {
            whatspro: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-fetch", `https://${host}/api/mcp`],
              env: { AUTHORIZATION: `Bearer ${claudeApiKey}` },
            },
          },
        }, null, 2);
    navigator.clipboard.writeText(text);
    setClaudeCopied(type);
    setTimeout(() => setClaudeCopied(null), 2000);
  };

  const CARD_DEFS: {
    id: CardId; title: string; subtitle: string;
    steps: { title: string; desc: string }[];
  }[] = [
    {
      id: "whatsapp",
      title:    api.cards.whatsapp.title,
      subtitle: api.cards.whatsapp.subtitle,
      steps:    api.cards.whatsapp.steps.map((s: any) => ({ title: s.title, desc: s.desc })),
    },
    {
      id: "shopify",
      title:    "ربط Shopify",
      subtitle: "عن طريق Webhook مباشرة",
      steps: [
        { title: "احفظ اسم المتجر",  desc: "أدخل اسم متجرك واضغط حفظ عشان تاخد الـ Webhook URL" },
        { title: "افتح Shopify",      desc: "Settings → Notifications → Webhooks → Create webhook" },
        { title: "الصق الـ URL",      desc: "اختر الحدث (Order creation) وألصق الـ Webhook URL" },
      ],
    },
    {
      id: "easyorders",
      title:    api.cards.easyorders.title,
      subtitle: api.cards.easyorders.subtitle,
      steps:    api.cards.easyorders.steps.map((s: any) => ({ title: s.title, desc: s.desc })),
    },
    {
      id: "woocommerce",
      title:    "ربط WooCommerce",
      subtitle: "عن طريق Webhook تلقائي",
      steps: [
        { title: "احفظ اسم المتجر",    desc: "أدخل اسم متجرك واضغط حفظ للحصول على الـ Webhook URL" },
        { title: "أضف الـ Webhook",    desc: "WooCommerce → Settings → Advanced → Webhooks → Add webhook" },
        { title: "اختر الحدث",         desc: "اختر 'Order created' + 'Order updated' وألصق الـ URL" },
      ],
    },
    {
      id: "webhook",
      title:    api.cards.webhook.title,
      subtitle: api.cards.webhook.subtitle,
      steps:    api.cards.webhook.steps.map((s: any) => ({ title: s.title, desc: s.desc })),
    },
    {
      id: "claude",
      title:    "Claude AI",
      subtitle: "اربط واتس برو بـ Claude وتحكم بكل حاجة من الشات",
      steps: [
        { title: "أنشئ API Key",        desc: "اضغط 'إنشاء مفتاح جديد' للحصول على مفتاحك الخاص" },
        { title: "افتح Claude Desktop", desc: "حمّل التطبيق من claude.ai/download ثم افتح الإعدادات" },
        { title: "الصق الـ Config",     desc: "انسخ إعدادات الربط والصقها في Settings → Developer → MCP" },
      ],
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir={dir}>
      {/* ── Claude Upgrade Modal ── */}
      {showClaudeUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowClaudeUpgrade(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 border border-orange-200 dark:border-orange-900/50"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">Claude AI — باقة Pro+</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">غير متاح للباقة المجانية وباقة Starter</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Claude AI غير مناسب لباقتك الحالية. قم بالترقية للاستفادة منه والوصول إليه مباشرة من الشات.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowClaudeUpgrade(false); window.location.href = "/checkout?plan=pro"; }}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> ترقية الآن — 599 ج/شهر
              </button>
              <button
                onClick={() => setShowClaudeUpgrade(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{api.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{api.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://youtube.com/YOUR_VIDEO"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2 dark:border-gray-700 dark:text-gray-300">
              <PlayCircle className="w-4 h-4 text-green-500" />
              شاهد طريقة الربط
            </Button>
          </a>
          <Button variant="outline" className="gap-2 dark:border-gray-700 dark:text-gray-300"
            onClick={handleSyncTemplates} disabled={isSyncing}>
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? api.syncing : api.syncBtn}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARD_DEFS.map(card => (
          <IntegrationCard
            key={card.id}
            {...card}
            isOpen={openCard === card.id}
            onToggle={() => handleCardClick(card.id)}
            locked={isCardLocked(card.id)}
            lockMessage={getCardLockMessage(card.id)}
          >
            {card.id === "whatsapp" && (
              <WhatsAppContent
                initialData={initialData}
                loading={waLoading}
                onSubmit={handleSaveWhatsApp}
                labels={{ savingBtn: api.cards.whatsapp.savingBtn, saveBtn: api.cards.whatsapp.saveBtn }}
              />
            )}
            {card.id === "shopify" && (
              <ShopifyContent
                storeName={shStoreName}
                shopDomain={shShopDomain}   setShopDomain={setShShopDomain}
                setStoreName={setShStoreName}
                webhookUrl={shWebhookUrl}
                status={shopifyStatus}
                onConnect={handleShConnect}
                onRefresh={loadShopifyStatus}
                loading={shConnecting}
              />
            )}
            {card.id === "easyorders" && (
              <EasyOrdersContent
                apiKey={eoApiKey} setApiKey={setEoApiKey}
                storeName={eoStoreName} setStoreName={setEoStoreName}
                webhookUrl={eoWebhookUrl} syncing={eoSyncing} status={eoStatus}
                onSync={handleEoSync} labels={api.cards.easyorders} locale={locale}
              />
            )}
            {card.id === "woocommerce" && (
              <WooCommerceContent status={wooStatus} onRefresh={loadShopifyStatus} locale={locale} />
            )}
            {card.id === "webhook" && (
              <WebhookContent webhookUrl={webhookUrl} verifyToken={verifyToken} hint={api.cards.webhook.hint} />
            )}
            {card.id === "claude" && (
              <div className="space-y-5 pt-1">

                {/* API Key — shows "Bearer bsm_..." for easy copy-paste */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Key className="w-3 h-3" /> API Key الخاص بك
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      dir="ltr"
                      value={claudeApiKey ? `Bearer ${claudeApiKey}` : "لم يتم إنشاء مفتاح بعد"}
                      className="font-mono text-xs bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                    <Button variant="outline" size="icon"
                      onClick={() => copyClaudeText("key")}
                      disabled={!claudeApiKey}
                      className="dark:border-gray-600 dark:text-gray-300 flex-shrink-0"
                      title="نسخ المفتاح"
                    >
                      {claudeCopied === "key"
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleGenerateApiKey}
                      disabled={claudeLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
                      title={claudeApiKey ? "تجديد المفتاح" : "إنشاء مفتاح"}
                    >
                      {claudeLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </div>
                  {claudeApiKey && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> احتفظ بهذا المفتاح سري — لا تشاركه
                    </p>
                  )}
                </div>

                {/* MCP URL — copy-ready endpoint */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> رابط الاتصال (MCP URL)
                  </label>
                  <CopyInput
                    value={typeof window !== "undefined"
                      ? `https://${window.location.host}/api/mcp`
                      : "https://whatsprosystem.vercel.app/api/mcp"}
                    placeholder="https://whatsprosystem.vercel.app/api/mcp"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    استخدم هذا الرابط + المفتاح أعلاه في إعدادات Claude Desktop
                  </p>
                </div>

                {/* Config */}
                {claudeApiKey && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Database className="w-3 h-3" /> إعدادات Claude Desktop (انسخ والصق في MCP Config)
                    </label>
                    <div className="relative">
                      <pre className="text-xs font-mono bg-gray-950 text-green-400 rounded-xl p-4 overflow-x-auto leading-relaxed" dir="ltr">
{`{
  "mcpServers": {
    "whatspro": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch",
               "https://${typeof window !== "undefined" ? window.location.host : "whatsprosystem.vercel.app"}/api/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer ${claudeApiKey}"
      }
    }
  }
}`}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyClaudeText("config")}
                        className="absolute top-2 left-2 text-xs gap-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      >
                        {claudeCopied === "config"
                          ? <><CheckCircle2 className="w-3 h-3 text-green-400" /> تم النسخ</>
                          : <><Copy className="w-3 h-3" /> نسخ</>}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Download link */}
                <a
                  href="https://claude.ai/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:underline font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  تحميل Claude Desktop
                </a>

                {/* What can Claude do */}
                <div className="rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/10 p-4">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">بعد الربط — تقدر تقول لـ Claude:</p>
                  <ul className="space-y-1">
                    {[
                      "\"اعملي تقرير عن آخر حملة\"",
                      "\"فيه كام رسالة واردة؟\"",
                      "\"اعرضلي أفضل الحملات هذا الشهر\"",
                      "\"كام جهة اتصال عندي؟\"",
                    ].map((ex, i) => (
                      <li key={i} className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-2">
                        <span className="text-orange-400">›</span> {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </IntegrationCard>
        ))}
      </div>
    </div>
  );
}
