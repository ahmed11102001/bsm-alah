"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Feather, Sparkles, Store, Shield, HelpCircle, FileText, Send, RefreshCw,
  Plus, Trash2, Edit3, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  Loader2, Save, ShoppingBag, ArrowRight, ArrowLeft, MessageSquare, Info,
  ExternalLink, Check, ImagePlus, X, ChevronDown, ChevronUp, Upload,
  LayoutDashboard, UserCog, BookOpen, Plug, Search, UserCheck,
} from "lucide-react";

interface AiAgentSettings {
  isEnabled: boolean;
  provider: "gemini" | "openai";
  brandName: string;
  businessDesc: string;
  productsInfo: string;
  pricingInfo: string;
  workingHours: string;
  tone: string;
  systemPrompt: string;
  languageMode: string;
  websiteUrl: string;
  websiteButtonText: string;
  pauseMinutes: number;
  elevenLabsEnabled: boolean;
  elevenLabsApiKey: string;
  elevenLabsAgentId: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

interface PolicyItem {
  id: string;
  type: string;
  title: string;
  content: string;
}

interface GuardrailsData {
  noInventPrices: boolean;
  noInventProducts: boolean;
  noMentionCompetitors: boolean;
  noSharePersonal: boolean;
  strictKnowledgeOnly: boolean;
  alwaysHandoffComplaints: boolean;
  maxReplyLines: number;
  customRules: string | null;
}

interface ProductStats {
  total: number;
  lastSync?: {
    source: string;
    status: string;
    productsSynced: number;
    completedAt: string;
  };
}

interface RelationProduct {
  id: string;
  name: string;
  relatedProductIds: string[];
}

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  imageUrl: string;
  url: string;
  category: string;
  tags: string;
  stock: string; // "available" | "unavailable" | number-string | ""
}

const emptyCatalogItem: CatalogItem = {
  id: "", name: "", description: "", price: "", compareAtPrice: "",
  currency: "EGP", imageUrl: "", url: "", category: "", tags: "", stock: "",
};

// Full product row as returned by GET /api/ai-agent/products (used for the unified catalog table)
interface CatalogRow {
  id: string;
  source: "shopify" | "easyorders" | "woocommerce" | "manual";
  name: string;
  price: number | null;
  currency: string;
  stock: number | null;
  category: string | null;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  matchedProducts?: Array<{
    id: string;
    name: string;
    price: number | null;
    currency: string;
    images: string[];
    url: string | null;
  }>;
  knowledgeSources?: string[];
  action?: string | null;
  reason?: string | null;
}

const SOURCE_LABEL: Record<string, { ar: string; en: string; emoji: string }> = {
  shopify: { ar: "Shopify", en: "Shopify", emoji: "🛍️" },
  easyorders: { ar: "EasyOrders", en: "EasyOrders", emoji: "📦" },
  woocommerce: { ar: "WooCommerce", en: "WooCommerce", emoji: "🟣" },
  manual: { ar: "يدوي", en: "Manual", emoji: "✏️" },
};

export default function AiAgentDashboard({ lang }: { lang: "ar" | "en" }) {
  const isAr = lang === "ar";

  // ── States ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AiAgentSettings>({
    isEnabled: false, provider: "gemini", brandName: "", businessDesc: "",
    productsInfo: "", pricingInfo: "", workingHours: "", tone: "friendly",
    systemPrompt: "", languageMode: "auto", websiteUrl: "", websiteButtonText: "", pauseMinutes: 10,
    elevenLabsEnabled: false, elevenLabsApiKey: "", elevenLabsAgentId: "",
  });
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [guardrails, setGuardrails] = useState<GuardrailsData>({
    noInventPrices: true,
    noInventProducts: true,
    noMentionCompetitors: true,
    noSharePersonal: true,
    strictKnowledgeOnly: true,
    alwaysHandoffComplaints: true,
    maxReplyLines: 3,
    customRules: null,
  });
  const [salesBehavior, setSalesBehavior] = useState({
    goal: "balanced" as "customer_service" | "balanced" | "sales_focused",
    suggestAlternatives: true,
    suggestUpsell: true,
    suggestCrossSell: false,
    suggestDiscounts: false,
    maxSuggestedProducts: 1,
  });
  const [productStats, setProductStats] = useState<ProductStats>({ total: 0 });
  const [relationProducts, setRelationProducts] = useState<RelationProduct[]>([]);
  const [showRelationManager, setShowRelationManager] = useState(false);
  const [websiteKnowledge, setWebsiteKnowledge] = useState({ isEnabled: false, rootUrl: "" });
  const [websitePages, setWebsitePages] = useState<Array<{ id: string; url: string; title: string | null; lastCrawledAt: string; _count: { chunks: number } }>>([]);
  const [syncingWebsite, setSyncingWebsite] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);

  // ── Navigation (new IA) ──
  const [activeSection, setActiveSection] = useState<"overview" | "identity" | "knowledge" | "behavior" | "channels">("overview");
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<"catalog" | "faq" | "policies" | "website">("catalog");

  // ── Catalog table (unified sources) ──
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);
  const [catalogSourceCounts, setCatalogSourceCounts] = useState<Record<string, number>>({});
  const [catalogSourceFilter, setCatalogSourceFilter] = useState<"all" | "shopify" | "easyorders" | "woocommerce" | "manual">("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [loadingCatalogRows, setLoadingCatalogRows] = useState(false);
  const [showManualProductSheet, setShowManualProductSheet] = useState(false);

  // Modals / Sheets
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [showFaqSheet, setShowFaqSheet] = useState(false);
  const [faqForm, setFaqForm] = useState({ id: "", question: "", answer: "" });
  const [showPolicySheet, setShowPolicySheet] = useState(false);
  const [policyForm, setPolicyForm] = useState({ id: "", type: "return_policy", title: "", content: "" });

  // Onboarding Step 3 Submode & Manual Catalog Manager
  const [onboardingSubMode, setOnboardingSubMode] = useState<"select" | "store" | "manual" | "services_only">("select");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [manualProductForm, setManualProductForm] = useState<CatalogItem>({ ...emptyCatalogItem });
  const [addingManualProduct, setAddingManualProduct] = useState(false);
  const [showAddForm, setShowAddForm] = useState(true);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [wooForm, setWooForm] = useState({ storeUrl: "", consumerKey: "", consumerSecret: "" });
  const [connectingWoo, setConnectingWoo] = useState(false);
  const [wooConnected, setWooConnected] = useState<{ storeName: string; productsAvailable: number } | null>(null);
  const [selectedStoreSource, setSelectedStoreSource] = useState<"shopify" | "easyorders" | "woocommerce" | null>(null);

  // Test Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: isAr ? "أهلاً! أنا Wani، جرّب تسألني عن أي منتج أو سياسة لتجربة ردودي مباشرة ✨" : "Hi! I'm Wani. Try asking about a product or policy to test my replies live ✨",
      time: new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // ── Load All Data ──
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [resAgent, resFaqs, resPolicies, resGuardrails, resProducts, resSales, resWebsite] = await Promise.all([
        fetch("/api/ai-agent"),
        fetch("/api/ai-agent/faq"),
        fetch("/api/ai-agent/policies"),
        fetch("/api/ai-agent/guardrails"),
        fetch("/api/ai-agent/products?pageSize=100"),
        fetch("/api/ai-agent/sales-behavior"),
        fetch("/api/ai-agent/website-knowledge"),
      ]);

      if (resAgent.ok) {
        const data = await resAgent.json();
        setAgent(prev => ({ ...prev, ...data }));
        // If brandName and businessDesc are missing, open onboarding
        if (!data.brandName && !data.businessDesc) {
          setShowOnboarding(true);
        }
      }
      if (resFaqs.ok) setFaqs(await resFaqs.json());
      if (resPolicies.ok) setPolicies(await resPolicies.json());
      if (resGuardrails.ok) setGuardrails(await resGuardrails.json());
      if (resProducts.ok) {
        const pData = await resProducts.json();
        setProductStats({ total: pData.total || 0, lastSync: pData.lastSync });
        setRelationProducts((pData.products || []).map((product: any) => ({ id: product.id, name: product.name, relatedProductIds: product.relatedProductIds || [] })));
        // Seed the unified catalog table + per-source counts from the same response (avoids extra calls)
        setCatalogRows((pData.products || []).map((p: any) => ({
          id: p.id, source: p.source, name: p.name, price: p.price ?? null,
          currency: p.currency || "EGP", stock: p.stock ?? null, category: p.category ?? null, isActive: p.isActive !== false,
        })));
        const counts: Record<string, number> = {};
        (pData.products || []).forEach((p: any) => { counts[p.source] = (counts[p.source] || 0) + 1; });
        setCatalogSourceCounts(counts);
      }
      if (resSales.ok) {
        const data = await resSales.json();
        setSalesBehavior(prev => ({ ...prev, ...data }));
      }
      if (resWebsite.ok) {
        const data = await resWebsite.json();
        setWebsiteKnowledge({ isEnabled: Boolean(data.settings?.isEnabled), rootUrl: data.settings?.rootUrl || "" });
        setWebsitePages(data.pages || []);
      }
    } catch (e) {
      console.error("[AiAgentDashboard] Load error:", e);
      toast.error(isAr ? "حدث خطأ أثناء تحميل البيانات" : "Failed to load AI agent data");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Reload just the catalog table when filter/search changes (server-side filter) ──
  const loadCatalogRows = useCallback(async (source: string, search: string) => {
    setLoadingCatalogRows(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (source !== "all") params.set("source", source);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/ai-agent/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCatalogRows((data.products || []).map((p: any) => ({
          id: p.id, source: p.source, name: p.name, price: p.price ?? null,
          currency: p.currency || "EGP", stock: p.stock ?? null, category: p.category ?? null, isActive: p.isActive !== false,
        })));
      }
    } catch { /* keep last known rows on error */ }
    finally { setLoadingCatalogRows(false); }
  }, []);

  useEffect(() => {
    if (loading) return; // skip on first mount, initial data already seeds this
    const t = setTimeout(() => loadCatalogRows(catalogSourceFilter, catalogSearch), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogSourceFilter, catalogSearch]);

  // ── Calculate Readiness Score ──
  const calculateReadiness = () => {
    let score = 0;
    if (agent.brandName?.trim()) score += 10;
    if (agent.businessDesc?.trim()) score += 15;
    if (agent.tone) score += 10;
    if (agent.languageMode) score += 5;
    if (productStats.total > 0 || agent.productsInfo?.trim()) score += 25;
    if (policies.length > 0) score += 15;
    if (guardrails.customRules?.trim() || guardrails.noInventPrices) score += 10;
    return Math.min(100, score);
  };

  const readiness = calculateReadiness();

  const readinessChecklist = [
    { done: Boolean(agent.brandName?.trim() && agent.businessDesc?.trim()), label: isAr ? "بيانات البراند والشخصية مكتملة" : "Brand & personality complete", jump: "identity" as const },
    { done: productStats.total > 0 || Boolean(agent.productsInfo?.trim()), label: isAr ? "لسه معندكش أي مصدر منتجات" : "No product source added yet", jump: "knowledge" as const, sub: "catalog" as const },
    { done: policies.length > 0, label: isAr ? "أضف سياسة استرجاع أو شحن واحدة على الأقل" : "Add at least one return/shipping policy", jump: "knowledge" as const, sub: "policies" as const },
  ];

  const jumpTo = (section: typeof activeSection, sub?: typeof activeKnowledgeTab) => {
    setActiveSection(section);
    if (sub) setActiveKnowledgeTab(sub);
  };

  // ── Actions ──
  const saveAgentSettings = async (updates?: Partial<AiAgentSettings>) => {
    setSaving(true);
    const payload = { ...agent, ...updates };
    try {
      const res = await fetch("/api/ai-agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setAgent(prev => ({ ...prev, ...saved }));
        toast.success(isAr ? "تم حفظ إعدادات المساعد بنجاح" : "AI Agent settings saved successfully");
      } else {
        toast.error(isAr ? "فشل حفظ الإعدادات" : "Failed to save settings");
      }
    } catch (e) {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const saveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;
    try {
      const res = await fetch("/api/ai-agent/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(faqForm),
      });
      if (res.ok) {
        toast.success(isAr ? "تمت إضافة المعلومة المخصصة" : "Custom fact added");
        setShowFaqSheet(false);
        setFaqForm({ id: "", question: "", answer: "" });
        loadAllData();
      }
    } catch (e) {
      toast.error(isAr ? "حدث خطأ أثناء حفظ المعلومة" : "Error saving custom fact");
    }
  };

  const deleteFaq = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-agent/faq?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(isAr ? "تم المحذف" : "Deleted");
        setFaqs(prev => prev.filter(f => f.id !== id));
      }
    } catch (e) {
      toast.error(isAr ? "خطأ في الحذف" : "Delete error");
    }
  };

  const savePolicy = async () => {
    if (!policyForm.title.trim() || !policyForm.content.trim()) return;
    try {
      const method = policyForm.id ? "PUT" : "POST";
      const res = await fetch("/api/ai-agent/policies", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyForm),
      });
      if (res.ok) {
        toast.success(isAr ? "تم حفظ السياسة" : "Policy saved");
        setShowPolicySheet(false);
        setPolicyForm({ id: "", type: "return_policy", title: "", content: "" });
        loadAllData();
      }
    } catch (e) {
      toast.error(isAr ? "حدث خطأ" : "Error saving policy");
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-agent/policies?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(isAr ? "تم المحذف" : "Deleted");
        setPolicies(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      toast.error(isAr ? "خطأ في الحذف" : "Delete error");
    }
  };

  const saveGuardrails = async () => {
    try {
      const res = await fetch("/api/ai-agent/guardrails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guardrails),
      });
      if (!res.ok) throw new Error();
    } catch (e) {
      toast.error(isAr ? "حدث خطأ أثناء حفظ القواعد" : "Error saving guardrails");
      throw e;
    }
  };

  const saveBehaviorSection = async () => {
    setSaving(true);
    try {
      await Promise.all([saveSalesBehaviorSilent(), saveGuardrails(), saveAgentSettingsSilent({ pauseMinutes: agent.pauseMinutes })]);
      toast.success(isAr ? "تم حفظ سلوك Wani وحدوده" : "Wani behavior and boundaries saved");
    } catch {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  // Silent variants (no toast) used when combining multiple saves into one user-facing action
  const saveSalesBehaviorSilent = async () => {
    const res = await fetch("/api/ai-agent/sales-behavior", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(salesBehavior),
    });
    if (!res.ok) throw new Error();
  };
  const saveAgentSettingsSilent = async (updates?: Partial<AiAgentSettings>) => {
    const payload = { ...agent, ...updates };
    const res = await fetch("/api/ai-agent", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    const saved = await res.json();
    setAgent(prev => ({ ...prev, ...saved }));
  };

  const triggerProductSync = async (source: "shopify" | "easyorders" | "woocommerce" | "all" = "all") => {
    setSyncingProducts(true);
    try {
      const res = await fetch("/api/ai-agent/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (res.ok) {
        toast.success(isAr ? "تم بدء مزامنة المنتجات في الخلفية" : "Product sync started in background");
      } else {
        toast.error(isAr ? "فشل بدء المزامنة" : "Failed to start sync");
      }
    } catch (e) {
      toast.error(isAr ? "خطأ أثناء المزامنة" : "Sync error");
    } finally {
      setSyncingProducts(false);
    }
  };

  const saveSalesBehavior = async () => {
    try {
      await saveSalesBehaviorSilent();
      toast.success(isAr ? "تم حفظ سلوك المبيعات" : "Sales behavior saved");
    } catch { toast.error(isAr ? "حدث خطأ أثناء حفظ سلوك المبيعات" : "Failed to save sales behavior"); }
  };

  const saveProductRelations = async (productId: string, relatedProductIds: string[]) => {
    const res = await fetch(`/api/ai-agent/products/${productId}/related`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relatedProductIds }),
    });
    if (!res.ok) { toast.error(isAr ? "تعذر حفظ روابط المنتجات" : "Failed to save product relationships"); return; }
    setRelationProducts(products => products.map(product => product.id === productId ? { ...product, relatedProductIds } : product));
    toast.success(isAr ? "تم حفظ المنتجات المكملة" : "Related products saved");
  };

  const updateWebsiteKnowledge = async (updates: Partial<typeof websiteKnowledge>) => {
    const next = { ...websiteKnowledge, ...updates };
    setWebsiteKnowledge(next);
    const res = await fetch("/api/ai-agent/website-knowledge", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    if (!res.ok) toast.error(isAr ? "تعذر حفظ إعدادات الموقع" : "Failed to save website settings");
  };

  const syncWebsiteKnowledge = async () => {
    const rootUrl = websiteKnowledge.rootUrl.trim() || (agent.websiteUrl || "").trim();
    if (!rootUrl) { toast.error(isAr ? "أدخل رابط الموقع أولًا" : "Enter your website URL first"); return; }
    setSyncingWebsite(true);
    try {
      const res = await fetch("/api/ai-agent/website-knowledge/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rootUrl }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast.success(isAr ? "بدأ استخراج معرفة الموقع في الخلفية" : "Website knowledge extraction started");
      setWebsiteKnowledge(s => ({ ...s, isEnabled: true }));
    } catch (error: any) { toast.error(error.message || (isAr ? "فشل استخراج الموقع" : "Website extraction failed")); }
    finally { setSyncingWebsite(false); }
  };

  const deleteWebsitePage = async (pageId: string) => {
    await fetch(`/api/ai-agent/website-knowledge?pageId=${pageId}`, { method: "DELETE" });
    setWebsitePages(pages => pages.filter(page => page.id !== pageId));
  };

  const connectWooCommerce = async () => {
    setConnectingWoo(true);
    try {
      const res = await fetch("/api/woocommerce/connect-rest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(wooForm) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setWooConnected({ storeName: data.storeName || new URL(wooForm.storeUrl).hostname, productsAvailable: data.productsAvailable || 0 });
      setWooForm(f => ({ ...f, consumerKey: "••••••••••••", consumerSecret: "••••••••••••" }));
      toast.success(isAr ? "تم الاتصال بنجاح" : "Connected successfully");
      setOnboardingSubMode("store");
    } catch (error: any) { toast.error(error.message || (isAr ? "تعذر الاتصال بمتجر WooCommerce. تأكد من الرابط وبيانات API والصلاحيات." : "Could not connect to WooCommerce. Check the store URL, API credentials, and permissions.")); }
    finally { setConnectingWoo(false); }
  };

  const syncSelectedStore = async () => {
    if (selectedStoreSource === "woocommerce" && wooConnected) {
      await triggerProductSync("woocommerce");
    } else {
      window.open("/dashboard/store", "_blank");
    }
  };

  // ── Upload product image to Cloudinary ──
  const handleProductImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isAr ? "الحجم الأقصى للصورة 5MB" : "Max image size is 5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/automation/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setManualProductForm(f => ({ ...f, imageUrl: data.url }));
        toast.success(isAr ? "تم رفع الصورة" : "Image uploaded");
      } else {
        toast.error(isAr ? "فشل رفع الصورة" : "Image upload failed");
      }
    } catch {
      toast.error(isAr ? "خطأ أثناء رفع الصورة" : "Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  // ── Add or Update Manual Product (used by both onboarding & the Catalog tab sheet) ──
  const handleAddManualProduct = async () => {
    if (!manualProductForm.name.trim()) {
      toast.error(isAr ? "اسم المنتج أو الخدمة مطلوب" : "Product/service name is required");
      return;
    }
    setAddingManualProduct(true);
    try {
      const res = await fetch("/api/ai-agent/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualProductForm.name.trim(),
          description: manualProductForm.description.trim() || null,
          price: manualProductForm.price ? parseFloat(manualProductForm.price) : null,
          compareAtPrice: manualProductForm.compareAtPrice ? parseFloat(manualProductForm.compareAtPrice) : null,
          currency: manualProductForm.currency || "EGP",
          images: manualProductForm.imageUrl.trim() ? [manualProductForm.imageUrl.trim()] : [],
          url: manualProductForm.url.trim() || null,
          stock: manualProductForm.stock ? (manualProductForm.stock === "available" ? 999 : manualProductForm.stock === "unavailable" ? 0 : parseInt(manualProductForm.stock, 10)) : null,
          category: manualProductForm.category.trim() || null,
          tags: manualProductForm.tags.trim() ? manualProductForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        toast.success(isAr ? "تم حفظ المنتج / الخدمة بنجاح!" : "Product / Service saved!");
        // Update local onboarding catalog list (mini-manager inside the wizard)
        const newItem: CatalogItem = { ...manualProductForm, id: saved.id || String(Date.now()) };
        if (editingProductId) {
          setCatalogItems(prev => prev.map(p => p.id === editingProductId ? newItem : p));
        } else {
          setCatalogItems(prev => [...prev, newItem]);
          setProductStats(prev => ({ ...prev, total: prev.total + 1 }));
        }
        // Reset form + close whichever surface was open
        setManualProductForm({ ...emptyCatalogItem });
        setShowAddForm(false);
        setShowManualProductSheet(false);
        setEditingProductId(null);
        setShowAdvancedFields(false);
        // Refresh the unified catalog table so the new/edited item shows up immediately
        loadCatalogRows(catalogSourceFilter, catalogSearch);
      } else {
        const errData = await res.json();
        toast.error(errData.error || (isAr ? "فشل حفظ المنتج" : "Failed to save product"));
      }
    } catch (err: any) {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving product");
    } finally {
      setAddingManualProduct(false);
    }
  };

  // ── Delete catalog item ──
  const handleDeleteCatalogItem = async (item: CatalogItem) => {
    try {
      await fetch(`/api/ai-agent/products?id=${item.id}`, { method: "DELETE" });
      setCatalogItems(prev => prev.filter(p => p.id !== item.id));
      setProductStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast.success(isAr ? "تم حذف المنتج" : "Product deleted");
      loadCatalogRows(catalogSourceFilter, catalogSearch);
    } catch {
      toast.error(isAr ? "فشل حذف المنتج" : "Failed to delete product");
    }
  };

  const handleDeleteCatalogRow = async (row: CatalogRow) => {
    try {
      await fetch(`/api/ai-agent/products?id=${row.id}`, { method: "DELETE" });
      toast.success(isAr ? "تم حذف المنتج" : "Product deleted");
      setProductStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      loadCatalogRows(catalogSourceFilter, catalogSearch);
    } catch {
      toast.error(isAr ? "فشل حذف المنتج" : "Failed to delete product");
    }
  };

  // ── Start editing catalog item ──
  const handleEditCatalogItem = (item: CatalogItem) => {
    setManualProductForm({ ...item });
    setEditingProductId(item.id);
    setShowAddForm(true);
  };

  // Opens the Catalog-tab sheet pre-filled for a manual row (name/price only available from the light table row —
  // full details are re-fetched implicitly since the form just needs name/price to start; user can fill the rest)
  const openManualSheetForRow = (row: CatalogRow) => {
    setManualProductForm({
      ...emptyCatalogItem,
      id: row.id,
      name: row.name,
      price: row.price != null ? String(row.price) : "",
      currency: row.currency,
      category: row.category || "",
      stock: row.stock != null ? String(row.stock) : "",
    });
    setEditingProductId(row.id);
    setShowManualProductSheet(true);
  };

  // ── Send Test Chat Message ──
  const sendTestMessage = async () => {
    if (!inputMessage.trim() || sendingTest) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages(prev => [...prev, newMsg]);
    setSendingTest(true);

    try {
      const history = [...chatMessages, newMsg].map(m => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const res = await fetch("/api/ai-agent/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: "ai",
          text: data.reply || (isAr ? "لم يتم إرجاع رد" : "No reply generated"),
          time: new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
          matchedProducts: data.matchedProducts,
          knowledgeSources: data.knowledgeSources,
          action: data.action,
          reason: data.reason,
        };
        setChatMessages(prev => [...prev, aiMsg]);
      } else {
        const err = await res.json();
        toast.error(err.error || (isAr ? "فشل تجربة المساعد" : "Test failed"));
      }
    } catch (e) {
      toast.error(isAr ? "حدث خطأ أثناء إرسال الرسالة" : "Error sending message");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{isAr ? "جاري تحميل Wani..." : "Loading Wani..."}</p>
      </div>
    );
  }

  // ── Shared bits ──
  const SectionTabIcon = { overview: LayoutDashboard, identity: UserCog, knowledge: BookOpen, behavior: Shield, channels: Plug };

  const TestPanel = (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl p-4 lg:sticky lg:top-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{isAr ? "اختبار Wani" : "Test Wani"}</h3>
            <p className="text-[10px] text-gray-400">{isAr ? "اختبر كيف يفهم Wani السياق ويرد داخل حدود براندك" : "Test how Wani understands context and stays within your brand rules"}</p>
          </div>
        </div>
        <button
          onClick={() => setChatMessages([{
            id: "welcome", sender: "ai",
            text: isAr ? "أهلاً! أنا Wani، جرّب تسألني عن أي منتج أو سياسة لتجربة ردودي مباشرة ✨" : "Hi! I'm Wani. Try asking about a product or policy to test my replies live ✨",
            time: new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
          }])}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title={isAr ? "مسح المحادثة" : "Clear chat"}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-3 flex-1 min-h-[280px] max-h-[420px] overflow-y-auto space-y-2.5 border border-gray-200/50 dark:border-gray-700/50">
        {chatMessages.map(msg => (
          <div key={msg.id} className={`flex flex-col max-w-[92%] ${msg.sender === "user" ? "mr-auto items-end" : "ml-auto items-start"}`}>
            <div className={`p-2.5 rounded-2xl text-[11px] leading-relaxed shadow-sm ${msg.sender === "user"
              ? "bg-emerald-600 text-white rounded-tl-none"
              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tr-none"
              }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.matchedProducts && msg.matchedProducts.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-gray-200/60 dark:border-gray-700/60 space-y-1.5">
                  {msg.matchedProducts.map(prod => (
                    <div key={prod.id} className="flex items-center gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-500/20">
                      {prod.images?.[0] && <img src={prod.images[0]} alt={prod.name} className="w-7 h-7 object-cover rounded flex-shrink-0" />}
                      <div className="truncate text-[10px]">
                        <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{prod.name}</p>
                        <p className="text-emerald-700 dark:text-emerald-300 font-semibold">{prod.price} {prod.currency || "EGP"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {msg.action === "handoff" && (
                <div className="mt-1.5 p-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold border border-amber-500/20">
                  ⚠️ {isAr ? "تحويل لبشر" : "Handoff triggered"}: {msg.reason}
                </div>
              )}
              {msg.knowledgeSources && msg.knowledgeSources.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-gray-200/60 dark:border-gray-700/60">
                  <p className="mb-1 text-[9px] font-semibold text-gray-400">{isAr ? "المعرفة المتاحة لهذا الرد" : "Knowledge available for this reply"}</p>
                  <div className="flex flex-wrap gap-1">
                    {msg.knowledgeSources.map(source => (
                      <span key={source} className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 text-[9px] text-emerald-700 dark:text-emerald-300">
                        ✓ {source === "brand" ? (isAr ? "هوية البراند" : "Brand identity") : source === "catalog" ? (isAr ? "الكتالوج" : "Catalog") : source === "policies" ? (isAr ? "السياسات" : "Policies") : source === "custom_answers" ? (isAr ? "معلومات مخصصة" : "Custom facts") : (isAr ? "قواعد السلوك" : "Behavior rules")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <Input
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") sendTestMessage(); }}
          placeholder={isAr ? "جرّب سؤال..." : "Try a question..."}
          className="rounded-xl text-xs"
        />
        <Button onClick={sendTestMessage} disabled={sendingTest || !inputMessage.trim()} size="icon" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex-shrink-0">
          {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-12" dir={isAr ? "rtl" : "ltr"}>
      {/* ── Top bar: Wani identity, readiness, enable toggle ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-br from-emerald-900/10 via-emerald-800/5 to-teal-900/10 dark:from-emerald-950/40 dark:to-teal-950/30 p-5 rounded-3xl border border-emerald-500/20 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-sm">
            <Feather className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Wani</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {readiness}%
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isAr ? "مساعدك الذكي على واتساب — كل ما زادت معرفته، زادت دقة ردوده" : "Your smart WhatsApp assistant — the more it knows, the more accurate its replies"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            {isAr ? "معالج الإعداد السريع" : "Quick setup wizard"}
          </button>

          <button
            onClick={() => saveAgentSettings({ isEnabled: !agent.isEnabled })}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border font-bold text-sm transition-all shadow-sm ${agent.isEnabled
              ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
              : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
              }`}
          >
            {agent.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {agent.isEnabled ? (isAr ? "مفعّل" : "Active") : (isAr ? "معطّل" : "Inactive")}
          </button>
        </div>
      </div>

      {/* ── Main content + persistent test panel ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="flex-1 min-w-0 w-full">
          <Tabs value={activeSection} onValueChange={v => setActiveSection(v as typeof activeSection)}>
          <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" />{isAr ? "نظرة عامة" : "Overview"}</TabsTrigger>
              <TabsTrigger value="identity" className="gap-1.5"><UserCog className="w-3.5 h-3.5" />{isAr ? "هوية البراند" : "Brand identity"}</TabsTrigger>
              <TabsTrigger value="knowledge" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" />{isAr ? "معرفة Wani" : "Wani's knowledge"}</TabsTrigger>
              <TabsTrigger value="behavior" className="gap-1.5"><Shield className="w-3.5 h-3.5" />{isAr ? "سلوك Wani" : "Wani's behavior"}</TabsTrigger>
              <TabsTrigger value="channels" className="gap-1.5"><Plug className="w-3.5 h-3.5" />{isAr ? "القنوات" : "Channels"}</TabsTrigger>
            </TabsList>

            {/* ═══════════════ OVERVIEW ═══════════════ */}
            <TabsContent value="overview" className="space-y-4">
              <div className="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{isAr ? "الناقص عشان Wani يشتغل بأفضل شكل" : "What's left for Wani to work at its best"}</span>
                  <span className="text-xs text-gray-400">{readiness >= 80 ? (isAr ? "جاهز 🚀" : "Ready 🚀") : ""}</span>
                </div>
                <Progress value={readiness} className="h-2.5 mb-4" />
                <div className="space-y-2">
                  {readinessChecklist.filter(i => !i.done).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => jumpTo(item.jump, item.sub)}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{item.label}</span>
                      {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  {readinessChecklist.every(i => i.done) && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />{isAr ? "كل الأساسيات مكتملة 🎉" : "All the essentials are done 🎉"}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={() => jumpTo("knowledge", "catalog")} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-right hover:border-emerald-400 transition-colors">
                  <div className="text-xs text-gray-400 mb-1">{isAr ? "منتجات متصلة" : "Products connected"}</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{productStats.total}</div>
                </button>
                <button onClick={() => jumpTo("knowledge", "faq")} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-right hover:border-emerald-400 transition-colors">
                  <div className="text-xs text-gray-400 mb-1">{isAr ? "أجوبة مخصصة (اختياري)" : "Custom answers (optional)"}</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{faqs.length}</div>
                </button>
                <button onClick={() => jumpTo("knowledge", "policies")} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-right hover:border-emerald-400 transition-colors">
                  <div className="text-xs text-gray-400 mb-1">{isAr ? "سياسات" : "Policies"}</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{policies.length}</div>
                </button>
              </div>
            </TabsContent>

            {/* ═══════════════ IDENTITY (Inline, no modal) ═══════════════ */}
            <TabsContent value="identity">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">{isAr ? "من هو Wani بالنسبة لعملائك" : "Who Wani is to your customers"}</h3>
                  <p className="text-xs text-gray-400">{isAr ? "قسم واحد دائم — أي تعديل هنا يُحفظ ويُستخدم مباشرة في الردود" : "One permanent section — changes here save directly and feed every reply"}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">{isAr ? "اسم البراند" : "Brand name"}</Label>
                    <Input value={agent.brandName} onChange={e => setAgent(f => ({ ...f, brandName: e.target.value }))} placeholder={isAr ? "مثال: متجر الأناقة" : "E.g. Elegance Store"} className="rounded-xl text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">{isAr ? "ساعات العمل" : "Working hours"}</Label>
                    <Input value={agent.workingHours} onChange={e => setAgent(f => ({ ...f, workingHours: e.target.value }))} placeholder={isAr ? "مثال: 9 ص – 10 م يومياً" : "E.g. 9 AM – 10 PM daily"} className="rounded-xl text-xs" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "وصف نشاط البيزنس والخدمات" : "Business description"}</Label>
                  <Textarea value={agent.businessDesc} onChange={e => setAgent(f => ({ ...f, businessDesc: e.target.value }))} placeholder={isAr ? "اكتب تفاصيل عن بيزنسك وما يميز منتجاتك..." : "Describe your business, products, and what makes you unique..."} className="min-h-[90px] text-xs rounded-xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                  <div className="pt-3">
                    <Label className="text-xs mb-1.5 block">{isAr ? "المزوّد" : "Provider"}</Label>
                    <Select value={agent.provider} onValueChange={v => setAgent(f => ({ ...f, provider: v as "gemini" | "openai" }))}>
                      <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">ChatGPT GPT-4o mini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-3">
                    <Label className="text-xs mb-1.5 block">{isAr ? "لهجة الرد" : "Reply tone"}</Label>
                    <Select value={agent.tone} onValueChange={v => setAgent(f => ({ ...f, tone: v }))}>
                      <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">{isAr ? "ودود ومساعد" : "Friendly & Helpful"}</SelectItem>
                        <SelectItem value="formal">{isAr ? "رسمي واحترافي" : "Formal & Professional"}</SelectItem>
                        <SelectItem value="egyptian">{isAr ? "عامية مصرية خفيفة" : "Egyptian Colloquial"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-3">
                    <Label className="text-xs mb-1.5 block">{isAr ? "وضع اللغة" : "Language mode"}</Label>
                    <Select value={agent.languageMode} onValueChange={v => setAgent(f => ({ ...f, languageMode: v }))}>
                      <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{isAr ? "تلقائي (حسب لغة العميل)" : "Auto (Customer language)"}</SelectItem>
                        <SelectItem value="ar">{isAr ? "عربي دائماً" : "Always Arabic"}</SelectItem>
                        <SelectItem value="en">{isAr ? "English always" : "Always English"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={() => saveAgentSettings()} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold gap-2">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isAr ? "حفظ" : "Save"}
                </Button>
              </div>
            </TabsContent>

            {/* ═══════════════ KNOWLEDGE (Catalog Section+actions / FAQ+Policies List+Drawer / Website Inline) ═══════════════ */}
            <TabsContent value="knowledge">
              <div className="mb-4 rounded-3xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Sparkles className="w-4 h-4" /></span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{isAr ? "علّم Wani عن البراند، مش سؤال بسؤال" : "Teach Wani your brand, not one question at a time"}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{isAr ? "Wani يفهم سؤال العميل باستخدام الكتالوج والموقع والسياسات وهوية البراند، ثم يكوّن الرد المناسب داخل القواعد التي تحددها." : "Wani uses your catalog, website, policies, and brand identity to understand each customer message and compose a suitable reply within your rules."}</p>
                  </div>
                </div>
              </div>
              <Tabs value={activeKnowledgeTab} onValueChange={v => setActiveKnowledgeTab(v as typeof activeKnowledgeTab)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="catalog" className="gap-1.5"><ShoppingBag className="w-3.5 h-3.5" />{isAr ? "الكتالوج" : "Catalog"}</TabsTrigger>
                  <TabsTrigger value="faq" className="gap-1.5"><HelpCircle className="w-3.5 h-3.5" />{isAr ? "أجوبة مخصصة" : "Custom answers"}</TabsTrigger>
                  <TabsTrigger value="policies" className="gap-1.5"><FileText className="w-3.5 h-3.5" />{isAr ? "السياسات" : "Policies"}</TabsTrigger>
                  <TabsTrigger value="website" className="gap-1.5">🌐{isAr ? "الموقع" : "Website"}</TabsTrigger>
                </TabsList>

                {/* ── CATALOG: Section + Actions, unified sources ── */}
                <TabsContent value="catalog" className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{isAr ? "مصادر المنتجات" : "Product sources"}</h3>
                      <span className="text-xs text-gray-400">{isAr ? "منتج يعرفه المساعد" : "products Wani knows"}: <b className="text-gray-700 dark:text-gray-200">{productStats.total}</b></span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-1">
                      {(["shopify", "easyorders", "woocommerce"] as const).map(src => (
                        <div key={src} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30">
                          <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <span>{SOURCE_LABEL[src].emoji}</span>{SOURCE_LABEL[src].ar}
                            <Badge variant="outline" className="text-[10px]">{catalogSourceCounts[src] || 0} {isAr ? "منتج" : "items"}</Badge>
                          </span>
                          <Button size="sm" variant="outline" onClick={() => triggerProductSync(src)} disabled={syncingProducts} className="text-[11px] rounded-xl h-7 gap-1">
                            <RefreshCw className={`w-3 h-3 ${syncingProducts ? "animate-spin" : ""}`} />{isAr ? "مزامنة" : "Sync"}
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30">
                        <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <span>✏️</span>{isAr ? "يدوي" : "Manual"}
                          <Badge variant="outline" className="text-[10px]">{catalogSourceCounts.manual || 0} {isAr ? "منتج" : "items"}</Badge>
                        </span>
                        <Button size="sm" onClick={() => { setManualProductForm({ ...emptyCatalogItem }); setEditingProductId(null); setShowManualProductSheet(true); }} className="text-[11px] rounded-xl h-7 gap-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                          <Plus className="w-3 h-3" />{isAr ? "إضافة" : "Add"}
                        </Button>
                      </div>
                    </div>

                    {productStats.total === 0 && (
                      <div className="mt-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                        {isAr ? "لا يوجد متجر متصل ولا منتجات يدوية بعد. تقدر تبني كتالوجك يدويًا من زرار «إضافة» فوق، أو تربط متجرك من صفحة التكاملات." : "No connected store and no manual products yet. Build your catalog manually with the button above, or connect a store from Integrations."}
                      </div>
                    )}
                  </div>

                  {productStats.total > 0 && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(["all", "shopify", "easyorders", "woocommerce", "manual"] as const).map(f => (
                            <button
                              key={f}
                              onClick={() => setCatalogSourceFilter(f)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${catalogSourceFilter === f ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                }`}
                            >
                              {f === "all" ? (isAr ? "الكل" : "All") : SOURCE_LABEL[f].ar}
                            </button>
                          ))}
                        </div>
                        <div className="relative flex-1 sm:max-w-xs sm:mr-auto">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                          <Input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder={isAr ? "ابحث عن منتج..." : "Search products..."} className="rounded-xl text-xs pr-8" />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">{isAr ? "المنتج" : "Product"}</TableHead>
                              <TableHead className="text-xs">{isAr ? "المصدر" : "Source"}</TableHead>
                              <TableHead className="text-xs">{isAr ? "السعر" : "Price"}</TableHead>
                              <TableHead className="text-xs w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingCatalogRows ? (
                              <TableRow><TableCell colSpan={4} className="text-center text-xs text-gray-400 py-6"><Loader2 className="w-4 h-4 animate-spin inline" /></TableCell></TableRow>
                            ) : catalogRows.length === 0 ? (
                              <TableRow><TableCell colSpan={4} className="text-center text-xs text-gray-400 py-6">{isAr ? "لا توجد نتائج" : "No results"}</TableCell></TableRow>
                            ) : catalogRows.map(row => (
                              <TableRow key={row.id}>
                                <TableCell className="text-xs font-semibold text-gray-800 dark:text-gray-200">{row.name}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[10px]">{SOURCE_LABEL[row.source]?.ar || row.source}</Badge></TableCell>
                                <TableCell className="text-xs">{row.price != null ? `${row.price} ${row.currency}` : "—"}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 justify-end">
                                    {row.source === "manual" && (
                                      <button onClick={() => openManualSheetForRow(row)} className="p-1 text-gray-400 hover:text-emerald-600"><Edit3 className="w-3.5 h-3.5" /></button>
                                    )}
                                    <button onClick={() => handleDeleteCatalogRow(row)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {isAr ? "منتجات المتجر: الاسم والسعر والمخزون تُحدَّث تلقائيًا من مصدرها ولا تُعدَّل هنا مباشرة." : "Store-sourced products: name/price/stock sync from their source and aren't edited here directly."}
                      </p>
                    </div>
                  )}

                  {productStats.total === 0 && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5">
                      <Label className="text-xs mb-1.5 block">{isAr ? "وصف بديل للمنتجات (يُستخدم فقط لو مفيش كتالوج متصل)" : "Fallback products description (used only while no catalog is connected)"}</Label>
                      <Textarea value={agent.productsInfo || ""} onChange={e => setAgent(f => ({ ...f, productsInfo: e.target.value }))} placeholder={isAr ? "اكتب وصفًا مختصرًا للمنتجات أو الخدمات..." : "Describe your products or services..."} className="rounded-xl text-xs min-h-[70px] mb-3" />
                      <Label className="text-xs mb-1.5 block">{isAr ? "وصف بديل للأسعار" : "Fallback pricing description"}</Label>
                      <Textarea value={agent.pricingInfo || ""} onChange={e => setAgent(f => ({ ...f, pricingInfo: e.target.value }))} placeholder={isAr ? "اكتب الأسعار أو قواعد التسعير..." : "Add prices or pricing rules..."} className="rounded-xl text-xs min-h-[60px] mb-3" />
                      <Button onClick={() => saveAgentSettings()} disabled={saving} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{isAr ? "حفظ" : "Save"}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* ── Custom answers: optional supplementary knowledge ── */}
                <TabsContent value="faq">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5">
                    <div className="mb-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {isAr ? "أضف معلومة محددة لا توجد في الكتالوج أو الموقع أو السياسات. سيستخدمها Wani كمرجع إضافي عند الحاجة، وليست قائمة ردود محفوظة." : "Add a specific fact that is not covered by your catalog, website, or policies. Wani uses it as an extra reference when relevant—not as a list of scripted replies."}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{faqs.length} {isAr ? "معلومة إضافية" : "custom facts"}</h3>
                      <Button size="sm" onClick={() => { setFaqForm({ id: "", question: "", answer: "" }); setShowFaqSheet(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold gap-1.5">
                        <Plus className="w-3.5 h-3.5" />{isAr ? "إضافة معلومة" : "Add custom fact"}
                      </Button>
                    </div>
                    {faqs.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-4 text-center">{isAr ? "اختياري — استخدمه للمعلومات الخاصة التي لا توجد في مصادر المعرفة الأخرى." : "Optional — use this for brand facts not covered by your other knowledge sources."}</p>
                    ) : (
                      <div className="space-y-2">
                        {faqs.map(f => (
                          <div key={f.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">س: {f.question}</p>
                              <p className="text-[11px] text-gray-500 truncate">ج: {f.answer}</p>
                            </div>
                            <button onClick={() => deleteFaq(f.id)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── POLICIES: List + Drawer ── */}
                <TabsContent value="policies">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{policies.length} {isAr ? "سياسة مضافة" : "policies added"}</h3>
                      <Button size="sm" onClick={() => { setPolicyForm({ id: "", type: "return_policy", title: "", content: "" }); setShowPolicySheet(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold gap-1.5">
                        <Plus className="w-3.5 h-3.5" />{isAr ? "إضافة سياسة" : "Add Policy"}
                      </Button>
                    </div>
                    {policies.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-4 text-center">{isAr ? "أضف سياسة الاستبدال والاسترجاع والشحن لتجنب سوء الفهم." : "Add return and shipping policies for clear answers."}</p>
                    ) : (
                      <div className="space-y-2">
                        {policies.map(p => (
                          <div key={p.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">📋 {p.title}</span>
                            <button onClick={() => deletePolicy(p.id)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── WEBSITE: Inline ── */}
                <TabsContent value="website">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">{isAr ? "رابط الموقع الذي يرسله Wani للعميل" : "Website URL Wani shares with customers"}</Label>
                        <Input value={agent.websiteUrl || ""} onChange={e => setAgent(f => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://example.com" dir="ltr" className="rounded-xl text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">{isAr ? "نص زر الموقع المقترح" : "Website button text"}</Label>
                        <Input value={agent.websiteButtonText || ""} onChange={e => setAgent(f => ({ ...f, websiteButtonText: e.target.value }))} placeholder={isAr ? "تصفح المنتجات" : "Browse products"} className="rounded-xl text-xs" />
                      </div>
                    </div>
                    <Button onClick={() => saveAgentSettings()} disabled={saving} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold gap-1.5">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{isAr ? "حفظ" : "Save"}
                    </Button>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{isAr ? "استخراج معرفة الموقع" : "Website knowledge extraction"}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{isAr ? "استخرج معلومات مفيدة من صفحات محددة لاستخدامها كمصدر معرفة إضافي." : "Extract useful content from selected pages as an extra knowledge source."}</p>
                        </div>
                        <Switch checked={websiteKnowledge.isEnabled} onCheckedChange={value => updateWebsiteKnowledge({ isEnabled: value })} />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input value={websiteKnowledge.rootUrl} onChange={event => setWebsiteKnowledge(s => ({ ...s, rootUrl: event.target.value }))} placeholder={agent.websiteUrl || "https://example.com"} dir="ltr" className="text-xs rounded-xl" />
                        <Button onClick={syncWebsiteKnowledge} disabled={syncingWebsite || (!websiteKnowledge.rootUrl.trim() && !(agent.websiteUrl || "").trim())} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold whitespace-nowrap">
                          {syncingWebsite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{syncingWebsite ? (isAr ? "بنقرأ موقعك..." : "Reading your site...") : (isAr ? "استخراج المعرفة الآن" : "Extract now")}
                        </Button>
                      </div>
                      {websitePages.length > 0 && <div className="mt-3 space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-3">
                        {websitePages.map(page => <div key={page.id} className="flex items-center gap-2 text-[11px]">
                          <div className="flex-1 min-w-0"><div className="font-semibold truncate text-gray-700 dark:text-gray-300">{page.title || page.url}</div><div className="text-gray-400 truncate">{page.url} · {page._count.chunks} chunks</div></div>
                          <button type="button" onClick={() => deleteWebsitePage(page.id)} className="text-red-500 hover:underline">{isAr ? "حذف" : "Delete"}</button>
                        </div>)}
                      </div>}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* ═══════════════ BEHAVIOR & GUARDRAILS (Section, merged) ═══════════════ */}
            <TabsContent value="behavior" className="space-y-4">
              <div className="rounded-3xl border border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-950/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><Shield className="w-4 h-4" /></span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{isAr ? "هنا تحدد كيف يفكر Wani في الرد" : "Define how Wani decides what to say"}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{isAr ? "لا تحفظ إجابات جاهزة؛ حدّد الأولويات والحدود، وسيستخدم Wani المعرفة المتاحة والسياق ليكوّن ردًا مناسبًا." : "You are not scripting replies. Set priorities and boundaries, and Wani will use the available knowledge and conversation context to compose the right response."}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">{isAr ? "أولوية Wani وطريقة التصرف" : "Wani's priorities and decision style"}</h3>
                  <p className="text-xs text-gray-400">{isAr ? "يختلف سلوك المساعد فعليًا حسب الهدف الذي تختاره، وليس مجرد إعداد شكلي." : "Wani's behavior changes based on this goal—it is not just a cosmetic setting."}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {(["customer_service", "balanced", "sales_focused"] as const).map(goal => (
                    <label key={goal} className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 p-2.5 text-xs cursor-pointer">
                      <input type="radio" name="sales-goal" checked={salesBehavior.goal === goal} onChange={() => setSalesBehavior(s => ({ ...s, goal }))} />
                      {goal === "customer_service" ? (isAr ? "خدمة العملاء" : "Customer service") : goal === "balanced" ? (isAr ? "متوازن (موصى به)" : "Balanced (recommended)") : (isAr ? "زيادة المبيعات" : "Sales focused")}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {([
                    ["suggestAlternatives", isAr ? "اقتراح بدائل مناسبة" : "Suggest suitable alternatives"],
                    ["suggestUpsell", isAr ? "اقتراح منتج أعلى سعرًا" : "Suggest a higher-value option"],
                    ["suggestCrossSell", isAr ? "اقتراح منتجات مكملة" : "Suggest complementary products"],
                    ["suggestDiscounts", isAr ? "ذكر العروض والخصومات الموجودة فقط" : "Mention existing discounts only"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                      <span>{label}</span>
                      <Switch checked={salesBehavior[key]} onCheckedChange={value => {
                        if (key === "suggestCrossSell" && value && !relationProducts.some(product => product.relatedProductIds.length > 0)) {
                          setShowRelationManager(true);
                          toast.error(isAr ? "اربط منتجات مكملة من الكتالوج أولًا حتى يتمكن المساعد من اقتراحها بدقة." : "Link complementary products in the catalog first so the assistant can suggest them accurately.");
                          return;
                        }
                        setSalesBehavior(s => ({ ...s, [key]: value }));
                      }} />
                    </div>
                  ))}
                </div>
                {salesBehavior.suggestCrossSell && <p className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2">{isAr ? "الاقتراحات المكملة تحتاج ربط المنتجات يدويًا من الكتالوج أولًا." : "Complementary suggestions require manual product relationships in the catalog."}</p>}
                {salesBehavior.suggestCrossSell && <button type="button" onClick={() => setShowRelationManager(true)} className="text-[11px] text-emerald-600 hover:underline font-bold">{isAr ? "إدارة المنتجات المرتبطة →" : "Manage related products →"}</button>}
                {(salesBehavior.suggestCrossSell || showRelationManager) && relationProducts.length > 0 && <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{isAr ? "ربط المنتجات المكملة" : "Link complementary products"}</div>
                  {relationProducts.slice(0, 20).map(product => (
                    <div key={product.id} className="flex items-center gap-2">
                      <span className="text-[11px] flex-1 truncate text-gray-600 dark:text-gray-400">{product.name}</span>
                      <select multiple value={product.relatedProductIds} onChange={event => saveProductRelations(product.id, Array.from(event.target.selectedOptions).map(option => option.value))} className="w-48 min-h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[10px] p-1">
                        {relationProducts.filter(other => other.id !== product.id).map(other => <option key={other.id} value={other.id}>{other.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>}
                <div className="flex items-center gap-3 text-xs">
                  <Label>{isAr ? "أقصى عدد منتجات مقترحة" : "Maximum suggested products"}</Label>
                  <Select value={String(salesBehavior.maxSuggestedProducts)} onValueChange={value => setSalesBehavior(s => ({ ...s, maxSuggestedProducts: Number(value) }))}>
                    <SelectTrigger className="w-20 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{isAr ? "الحدود والحماية" : "Guardrails"}</h3>
                {([
                  ["strictKnowledgeOnly", isAr ? "عدم التخمين إذا كانت المعلومة غير متوفرة" : "Do not guess if information is unavailable"],
                  ["noInventPrices", isAr ? "عدم اختراع أسعار غير متوفرة" : "Do not hallucinate prices"],
                  ["noInventProducts", isAr ? "عدم اختراع منتجات غير متوفرة" : "Do not invent non-existent products"],
                  ["noMentionCompetitors", isAr ? "عدم ذكر أو مقارنة المنافسين" : "Never mention competitors"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <span>{label}</span>
                    <Switch checked={guardrails[key]} onCheckedChange={v => setGuardrails(g => ({ ...g, [key]: v }))} />
                  </div>
                ))}
                <div>
                  <Label className="text-xs mb-1 block">{isAr ? "أقصى عدد سطور للرد" : "Max lines per reply"}</Label>
                  <Input type="number" min={1} max={10} value={guardrails.maxReplyLines} onChange={e => setGuardrails(g => ({ ...g, maxReplyLines: Number(e.target.value) || 3 }))} className="rounded-xl text-xs w-24" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">{isAr ? "قواعد مخصصة" : "Custom rules"}</Label>
                  <Textarea value={guardrails.customRules || ""} onChange={e => setGuardrails(g => ({ ...g, customRules: e.target.value }))} placeholder={isAr ? "مثال: لو سألوا عن الشحن الدولي قول مش متاح حالياً." : "E.g. If asked about international shipping, reply not available."} className="min-h-[70px] text-xs rounded-xl" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-emerald-500" />{isAr ? "التصعيد للبشر" : "Handoff to humans"}</h3>
                <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                  <span>{isAr ? "تحويل الشكاوى والغضب للبشر فوراً" : "Auto handoff for complaints"}</span>
                  <Switch checked={guardrails.alwaysHandoffComplaints} onCheckedChange={v => setGuardrails(g => ({ ...g, alwaysHandoffComplaints: v }))} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "مدة إيقاف Wani بعد رد موظف (بالدقائق)" : "Pause Wani after a human reply (minutes)"}</Label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={120} value={agent.pauseMinutes} onChange={e => setAgent(f => ({ ...f, pauseMinutes: Number(e.target.value) }))} className="flex-1 accent-emerald-500" />
                    <span className="w-10 text-center font-bold text-xs">{agent.pauseMinutes}</span>
                  </div>
                </div>
              </div>

              <Button onClick={saveBehaviorSection} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold gap-2">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isAr ? "حفظ سلوك Wani وحدوده" : "Save Wani behavior & boundaries"}
              </Button>
            </TabsContent>

            {/* ═══════════════ CHANNELS (Voice — separate, optional) ═══════════════ */}
            <TabsContent value="channels">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">ElevenLabs Voice Agent</h3>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-semibold">{isAr ? "اختياري" : "Optional"}</span>
                      </div>
                      <p className="text-xs text-gray-400">{isAr ? "قناة رد صوتي إضافية — منفصلة عن معرفة Wani الأساسية" : "An extra voice-reply channel — separate from Wani's core knowledge"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => saveAgentSettings({ elevenLabsEnabled: !agent.elevenLabsEnabled })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${agent.elevenLabsEnabled
                      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
                      }`}
                  >
                    {agent.elevenLabsEnabled ? <ToggleRight className="w-4 h-4 text-purple-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                    {agent.elevenLabsEnabled ? (isAr ? "مفعّل" : "Enabled") : (isAr ? "معطّل" : "Disabled")}
                  </button>
                </div>

                {agent.elevenLabsEnabled && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-3.5 text-xs text-purple-700 dark:text-purple-300">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {isAr
                        ? "اعمل Agent على ElevenLabs وحط الـ API Key والـ Agent ID هنا. لما تفعّل Voice Agent، هيرد بصوت الـ Agent على الرسائل."
                        : "Create an Agent in ElevenLabs and place the API Key and Agent ID here. Once enabled, it replies with the Agent's voice."}
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">ElevenLabs API Key *</Label>
                      <Input type="password" value={agent.elevenLabsApiKey} onChange={e => setAgent(f => ({ ...f, elevenLabsApiKey: e.target.value }))} placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" dir="ltr" className="rounded-xl" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Agent ID *</Label>
                      <Input value={agent.elevenLabsAgentId} onChange={e => setAgent(f => ({ ...f, elevenLabsAgentId: e.target.value }))} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" dir="ltr" className="rounded-xl" />
                      <p className="text-xs text-gray-400 mt-1">{isAr ? "من ElevenLabs Dashboard → Conversational AI → Agent → Copy ID" : "From ElevenLabs Dashboard → Conversational AI → Agent → Copy ID"}</p>
                    </div>
                    <Button onClick={() => saveAgentSettings()} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs py-5 gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isAr ? "حفظ إعدادات Voice Agent" : "Save Voice Agent Settings"}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Persistent test panel ── */}
        <div className="w-full lg:w-[340px] flex-shrink-0">
          {TestPanel}
        </div>
      </div>

      {/* ── Sheet: Add/Edit custom fact ── */}
      <Sheet open={showFaqSheet} onOpenChange={setShowFaqSheet}>
        <SheetContent side="left" className="rounded-l-none" dir={isAr ? "rtl" : "ltr"}>
          <SheetHeader>
          <SheetTitle>{isAr ? "إضافة معلومة مخصصة" : "Add custom fact"}</SheetTitle>
          <SheetDescription className="sr-only">{isAr ? "معلومة إضافية يستخدمها Wani كمرجع عند الحاجة" : "An extra fact Wani can use as a reference when relevant"}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "المعلومة أو السياق" : "Fact or context"} *</Label>
              <Input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder={isAr ? "مثال: لدينا فرع في مدينة نصر" : "E.g. We have a branch in Nasr City"} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "التفاصيل" : "Details"} *</Label>
              <Textarea value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} placeholder={isAr ? "اكتب التفاصيل التي يجب أن يعرفها Wani..." : "Add the details Wani should know..."} className="min-h-[110px] text-xs" />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={saveFaq} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
              {isAr ? "حفظ المعلومة" : "Save fact"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Add/Edit Policy (List + Drawer) ── */}
      <Sheet open={showPolicySheet} onOpenChange={setShowPolicySheet}>
        <SheetContent side="left" className="rounded-l-none" dir={isAr ? "rtl" : "ltr"}>
          <SheetHeader>
            <SheetTitle>{isAr ? "إضافة سياسة" : "Add Policy"}</SheetTitle>
            <SheetDescription className="sr-only">{isAr ? "نموذج إضافة سياسة" : "Form to add a policy"}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "نوع السياسة" : "Policy Type"}</Label>
              <Select value={policyForm.type} onValueChange={v => setPolicyForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="return_policy">{isAr ? "سياسة الاستبدال والاسترجاع" : "Return Policy"}</SelectItem>
                  <SelectItem value="shipping_policy">{isAr ? "سياسة الشحن والتوصيل" : "Shipping Policy"}</SelectItem>
                  <SelectItem value="payment_policy">{isAr ? "سياسة الدفع" : "Payment Policy"}</SelectItem>
                  <SelectItem value="warranty_policy">{isAr ? "سياسة الضمان" : "Warranty Policy"}</SelectItem>
                  <SelectItem value="custom">{isAr ? "سياسة مخصصة" : "Custom Policy"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "عنوان السياسة" : "Policy Title"} *</Label>
              <Input value={policyForm.title} onChange={e => setPolicyForm(f => ({ ...f, title: e.target.value }))} placeholder={isAr ? "مثال: الاسترجاع خلال 14 يوماً" : "E.g. Returns within 14 days"} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "تفاصيل السياسة" : "Policy Content"} *</Label>
              <Textarea value={policyForm.content} onChange={e => setPolicyForm(f => ({ ...f, content: e.target.value }))} placeholder={isAr ? "اكتب بنود السياسة بالتفصيل..." : "Write policy text..."} className="min-h-[110px] text-xs" />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={savePolicy} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
              {isAr ? "حفظ السياسة" : "Save Policy"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Add/Edit Manual Product (Catalog tab) ── */}
      <Sheet open={showManualProductSheet} onOpenChange={open => { setShowManualProductSheet(open); if (!open) { setManualProductForm({ ...emptyCatalogItem }); setEditingProductId(null); setShowAdvancedFields(false); } }}>
        <SheetContent side="left" className="rounded-l-none overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
          <SheetHeader>
            <SheetTitle>{editingProductId ? (isAr ? "تعديل منتج" : "Edit product") : (isAr ? "إضافة منتج يدوي" : "Add manual product")}</SheetTitle>
            <SheetDescription className="sr-only">{isAr ? "نموذج بيانات المنتج" : "Product data form"}</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <div>
              <Label className="text-[11px] mb-1 block">{isAr ? "اسم المنتج / الخدمة *" : "Product / Service Name *"}</Label>
              <Input value={manualProductForm.name} onChange={e => setManualProductForm(f => ({ ...f, name: e.target.value }))} placeholder={isAr ? "مثال: فستان سهرة أحمر" : "E.g. Red Evening Dress"} className="text-xs rounded-xl" />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block">{isAr ? "الوصف" : "Description"}</Label>
              <Textarea value={manualProductForm.description} onChange={e => setManualProductForm(f => ({ ...f, description: e.target.value }))} placeholder={isAr ? "تفاصيل المقاسات، الخامات، المميزات..." : "Details, materials, features..."} className="text-xs rounded-xl min-h-[50px] resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-[11px] mb-1 block">{isAr ? "السعر" : "Price"}</Label>
                <Input type="number" value={manualProductForm.price} onChange={e => setManualProductForm(f => ({ ...f, price: e.target.value }))} placeholder="350" className="text-xs rounded-xl" />
              </div>
              <div>
                <Label className="text-[11px] mb-1 block">{isAr ? "العملة" : "Currency"}</Label>
                <Select value={manualProductForm.currency} onValueChange={v => setManualProductForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EGP">EGP</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] mb-1 block">{isAr ? "صورة المنتج (اختياري)" : "Product Image (optional)"}</Label>
              {manualProductForm.imageUrl ? (
                <div className="relative w-full h-24 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
                  <img src={manualProductForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setManualProductForm(f => ({ ...f, imageUrl: "" }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 cursor-pointer transition-colors text-xs text-gray-500">
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingImage ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع صورة" : "Upload Image")}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleProductImageUpload(file); e.target.value = ""; }} />
                  </label>
                  <Input value={manualProductForm.imageUrl} onChange={e => setManualProductForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder={isAr ? "أو ألصق رابط صورة" : "Or paste image URL"} className="text-xs rounded-xl flex-1" dir="ltr" />
                </div>
              )}
            </div>

            <button onClick={() => setShowAdvancedFields(!showAdvancedFields)} className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-600 transition-colors py-1">
              {showAdvancedFields ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showAdvancedFields ? (isAr ? "إخفاء التفاصيل الإضافية" : "Hide advanced details") : (isAr ? "+ إضافة تفاصيل إضافية (رابط، تصنيف، مخزون...)" : "+ Add more details (URL, category, stock...)")}
            </button>

            {showAdvancedFields && (
              <div className="space-y-2 p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] mb-0.5 block">{isAr ? "السعر قبل الخصم" : "Compare at Price"}</Label>
                    <Input type="number" value={manualProductForm.compareAtPrice} onChange={e => setManualProductForm(f => ({ ...f, compareAtPrice: e.target.value }))} placeholder="500" className="text-xs rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-[10px] mb-0.5 block">{isAr ? "المخزون" : "Stock"}</Label>
                    <Select value={manualProductForm.stock === "" ? "not-tracked" : manualProductForm.stock || "available"} onValueChange={v => setManualProductForm(f => ({ ...f, stock: v === "not-tracked" ? "" : v }))}>
                      <SelectTrigger className="text-xs rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">{isAr ? "متوفر" : "In Stock"}</SelectItem>
                        <SelectItem value="unavailable">{isAr ? "غير متوفر" : "Out of Stock"}</SelectItem>
                        <SelectItem value="not-tracked">{isAr ? "غير متابع" : "Not Tracked"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] mb-0.5 block">{isAr ? "رابط المنتج / صفحة الموقع" : "Product URL / Website Link"}</Label>
                  <Input value={manualProductForm.url} onChange={e => setManualProductForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com/product/..." dir="ltr" className="text-xs rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] mb-0.5 block">{isAr ? "التصنيف" : "Category"}</Label>
                    <Input value={manualProductForm.category} onChange={e => setManualProductForm(f => ({ ...f, category: e.target.value }))} placeholder={isAr ? "ملابس، إلكترونيات..." : "Clothing, Electronics..."} className="text-xs rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-[10px] mb-0.5 block">{isAr ? "كلمات مفتاحية" : "Tags"}</Label>
                    <Input value={manualProductForm.tags} onChange={e => setManualProductForm(f => ({ ...f, tags: e.target.value }))} placeholder={isAr ? "سهرة, أحمر, نسائي" : "evening, red, women"} className="text-xs rounded-xl" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button onClick={handleAddManualProduct} disabled={addingManualProduct || !manualProductForm.name.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5 gap-1.5">
              {addingManualProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editingProductId ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ المنتج" : "Save Product")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Dialog: Onboarding Wizard (unchanged — optional first-run / re-run guided setup) ── */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-xl rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                {isAr ? "إعداد Wani السريع" : "Wani Quick Setup"}
              </DialogTitle>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
                {isAr ? `الخطوة ${onboardingStep} من 3` : `Step ${onboardingStep} of 3`}
              </span>
            </div>
            <DialogDescription className="text-xs">
              {onboardingStep === 1 && (isAr ? "الخطوة 1: معلومات البراند وطبيعة النشاط" : "Step 1: Brand Info & Business Description")}
              {onboardingStep === 2 && (isAr ? "الخطوة 2: شخصية المساعد ولهجة الرد" : "Step 2: Personality & Reply Tone")}
              {onboardingStep === 3 && (isAr ? "الخطوة 3: بيانات المنتجات والخدمات" : "Step 3: Products & Services Info")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "اسم البراند" : "Brand Name"} *</Label>
                  <Input value={agent.brandName} onChange={e => setAgent(f => ({ ...f, brandName: e.target.value }))} placeholder={isAr ? "مثال: متجر الأناقة" : "E.g. Elegance Store"} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "ساعات العمل" : "Working Hours"}</Label>
                  <Input value={agent.workingHours} onChange={e => setAgent(f => ({ ...f, workingHours: e.target.value }))} placeholder={isAr ? "مثال: 9 ص – 10 م يومياً" : "E.g. 9 AM – 10 PM daily"} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "وصف نشاط البيزنس والخدمات" : "Business Description"} *</Label>
                  <Textarea value={agent.businessDesc} onChange={e => setAgent(f => ({ ...f, businessDesc: e.target.value }))} placeholder={isAr ? "اكتب تفاصيل عن بيزنسك وما يميز منتجاتك..." : "Describe your business, products, and what makes you unique..."} className="min-h-[100px] resize-none text-xs" />
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "مزوّد الذكاء الاصطناعي" : "AI Provider"}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["gemini", "openai"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setAgent(f => ({ ...f, provider: p }))}
                        className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all ${agent.provider === p ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700"
                          }`}
                      >
                        <span>{p === "gemini" ? "Google Gemini" : "ChatGPT GPT-4o mini"}</span>
                        {agent.provider === p && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "لهجة الرد" : "Reply Tone"}</Label>
                  <Select value={agent.tone} onValueChange={v => setAgent(f => ({ ...f, tone: v }))}>
                    <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">{isAr ? "ودود ومساعد" : "Friendly & Helpful"}</SelectItem>
                      <SelectItem value="formal">{isAr ? "رسمي واحترافي" : "Formal & Professional"}</SelectItem>
                      <SelectItem value="egyptian">{isAr ? "عامية مصرية خفيفة" : "Egyptian Colloquial"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "وضع اللغة" : "Language Mode"}</Label>
                  <Select value={agent.languageMode} onValueChange={v => setAgent(f => ({ ...f, languageMode: v }))}>
                    <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{isAr ? "تلقائي (حسب لغة العميل)" : "Auto (Customer language)"}</SelectItem>
                      <SelectItem value="ar">{isAr ? "عربي دائماً" : "Always Arabic"}</SelectItem>
                      <SelectItem value="en">{isAr ? "English always" : "Always English"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-4 py-1">
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">{isAr ? "منتجاتك وخدماتك" : "Products & Services"}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{isAr ? "ساعد Wani على معرفة ما تقدمه لعملائك وأسعاره وتفاصيل كل خيار." : "Help Wani learn about what you offer, pricing, and details."}</p>
                </div>

                {onboardingSubMode === "select" && (
                  <div className="space-y-3 pt-2">
                    {productStats.total > 0 && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-2xl text-xs flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{isAr ? `تم تسجيل ${productStats.total} منتج / خدمة في الكتالوج` : `${productStats.total} products/services in catalog`}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 underline cursor-pointer font-bold" onClick={() => setOnboardingSubMode("manual")}>{isAr ? "إضافة المزيد" : "Add more"}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <button onClick={() => { setSelectedStoreSource("shopify"); setOnboardingSubMode("store"); }} className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group">
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🛍️</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">Shopify</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "استورد منتجاتك تلقائيًا" : "Import products automatically"}</span>
                      </button>
                      <button onClick={() => { setSelectedStoreSource("easyorders"); setOnboardingSubMode("store"); }} className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group">
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">📦</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">EasyOrders</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "مصدر المنتجات" : "Product source"}</span>
                      </button>
                      <button onClick={() => { setSelectedStoreSource("woocommerce"); setOnboardingSubMode("store"); }} className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50/40 dark:hover:bg-violet-950/20 transition-all group">
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🟣</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">WooCommerce</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "مصدر المنتجات" : "Product source"}</span>
                      </button>
                      <button onClick={() => setOnboardingSubMode("manual")} className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group">
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">✏️</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{isAr ? "إدخال يدوي" : "Manual Entry"}</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "أضف منتجاتك أو خدماتك وأسعارها بنفسك" : "Add items & pricing yourself"}</span>
                      </button>
                      <button onClick={() => setOnboardingSubMode("services_only")} className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group">
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">💼</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{isAr ? "أقدم خدمات فقط" : "Services Only"}</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "بدون كتالوج — يعتمد على معرفة البراند والسياسات" : "No catalog — relies on brand knowledge and policies"}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 italic text-center pt-2">{isAr ? "المتجر مجرد مصدر اختياري لمعرفة Wani — لا يلزمك وجود متجر لإكمال الإعداد." : "A store is optional — you don't need one to complete training."}</p>
                  </div>
                )}

                {onboardingSubMode === "store" && (
                  <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/30 text-right" dir={isAr ? "rtl" : "ltr"}>
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">🛍️ {isAr ? "مصادر المنتجات" : "Product Sources"}</h5>
                      <button onClick={() => setOnboardingSubMode("select")} className="text-[11px] text-emerald-600 hover:underline">{isAr ? "← تغيير الخيار" : "← Change option"}</button>
                    </div>
                    {productStats.total > 0 ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20 text-xs">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">{isAr ? `✓ تم العثور على ${productStats.total} منتج متصل` : `✓ Found ${productStats.total} connected products`}</div>
                        <p className="text-[11px] text-emerald-600/80 mt-0.5">{isAr ? "سيتم تحديث المنتجات والأسعار تلقائيًا من منصتك المربوطة." : "Products & prices update automatically from connected store."}</p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-500/20 text-xs space-y-2">
                        <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{isAr ? "لا يوجد مصدر منتجات متصل حالياً" : "No product source connected yet"}</div>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">{isAr ? "اربط Shopify أو EasyOrders لاستيراد منتجاتك تلقائياً، أو اختر الإدخال اليدوي." : "Connect Shopify or EasyOrders to import products automatically, or select manual entry."}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" onClick={() => window.open("/dashboard/store", "_blank")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] rounded-xl font-bold gap-1"><ExternalLink className="w-3 h-3" /> {isAr ? "ربط متجر الآن" : "Connect Store"}</Button>
                          <Button size="sm" variant="outline" onClick={() => setOnboardingSubMode("manual")} className="text-[11px] rounded-xl font-semibold">✏️ {isAr ? "التوجه للإدخال اليدوي" : "Switch to Manual Entry"}</Button>
                        </div>
                      </div>
                    )}
                    {selectedStoreSource && selectedStoreSource !== "woocommerce" && <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{selectedStoreSource === "shopify" ? "Shopify" : "EasyOrders"}</div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{isAr ? "اربط المتجر من صفحة التكاملات، ثم استخدم المزامنة لجلب المنتجات." : "Connect this store from Integrations, then sync its products."}</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => window.open("/dashboard/store", "_blank")} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] rounded-xl">{isAr ? "ربط المتجر" : "Connect Store"}</Button>
                        <Button size="sm" variant="outline" onClick={() => triggerProductSync(selectedStoreSource)} disabled={syncingProducts} className="flex-1 text-[11px] rounded-xl"><RefreshCw className={`w-3 h-3 ${syncingProducts ? "animate-spin" : ""}`} />{isAr ? "مزامنة" : "Sync"}</Button>
                      </div>
                    </div>}
                    {selectedStoreSource === "woocommerce" && <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{isAr ? "ربط متجر WooCommerce" : "Connect WooCommerce Store"}</div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{isAr ? "أدخل بيانات API الخاصة بمتجرك لجلب المنتجات والأسعار والمخزون تلقائيًا." : "Enter your store API details to import products, prices, and stock automatically."}</p>
                      {wooConnected ? (
                        <div className="space-y-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 p-3 text-xs">
                          <div className="font-bold text-emerald-700 dark:text-emerald-300">✓ {isAr ? "تم الاتصال بنجاح" : "Connected successfully"}</div>
                          <div className="text-emerald-700/80 dark:text-emerald-300/80">{isAr ? "المتجر" : "Store"}: {wooConnected.storeName}</div>
                          <div className="text-emerald-700/80 dark:text-emerald-300/80">{isAr ? "المنتجات المتاحة" : "Available products"}: {wooConnected.productsAvailable}</div>
                          <Button onClick={syncSelectedStore} disabled={syncingProducts} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"><RefreshCw className={`w-3.5 h-3.5 ${syncingProducts ? "animate-spin" : ""}`} />{isAr ? "مزامنة المنتجات الآن" : "Sync Products Now"}</Button>
                          <Button variant="outline" onClick={() => { setWooConnected(null); setWooForm({ storeUrl: "", consumerKey: "", consumerSecret: "" }); }} className="w-full rounded-xl text-xs">{isAr ? "تغيير بيانات الاتصال" : "Change connection details"}</Button>
                        </div>
                      ) : <>
                        <Input value={wooForm.storeUrl} onChange={e => setWooForm(f => ({ ...f, storeUrl: e.target.value }))} placeholder="https://store.example.com" dir="ltr" className="text-xs rounded-xl" />
                        <Input value={wooForm.consumerKey} onChange={e => setWooForm(f => ({ ...f, consumerKey: e.target.value }))} placeholder="ck_..." dir="ltr" className="text-xs rounded-xl" />
                        <Input type="password" value={wooForm.consumerSecret} onChange={e => setWooForm(f => ({ ...f, consumerSecret: e.target.value }))} placeholder="cs_..." dir="ltr" className="text-xs rounded-xl" />
                        <Button onClick={connectWooCommerce} disabled={connectingWoo || !wooForm.storeUrl || !wooForm.consumerKey || !wooForm.consumerSecret} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold">
                          {connectingWoo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}{isAr ? "اختبار اتصال WooCommerce" : "Test WooCommerce Connection"}
                        </Button>
                      </>}
                    </div>}
                  </div>
                )}

                {onboardingSubMode === "manual" && (
                  <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/30" dir={isAr ? "rtl" : "ltr"}>
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">✏️ {catalogItems.length > 0 ? (isAr ? `كتالوجك — ${catalogItems.length}` : `Your Catalog — ${catalogItems.length}`) : (isAr ? "إضافة منتج أو خدمة يدويًا" : "Add Product or Service Manually")}</h5>
                      <button onClick={() => setOnboardingSubMode("select")} className="text-[11px] text-emerald-600 hover:underline">{isAr ? "← تغيير الخيار" : "← Change option"}</button>
                    </div>
                    {catalogItems.length > 0 && (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {catalogItems.map(item => (
                          <div key={item.id} className="flex items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2 hover:border-emerald-500/40 transition-all">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-gray-400" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                              <p className="text-[10px] text-gray-500">{item.price ? `${item.price} ${item.currency}` : (isAr ? "بدون سعر" : "No price")}{item.category ? ` · ${item.category}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => handleEditCatalogItem(item)} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteCatalogItem(item)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAddForm ? (
                      <div className="space-y-2.5 border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div>
                          <Label className="text-[11px] mb-1 block">{isAr ? "اسم المنتج / الخدمة *" : "Product / Service Name *"}</Label>
                          <Input value={manualProductForm.name} onChange={e => setManualProductForm(f => ({ ...f, name: e.target.value }))} placeholder={isAr ? "مثال: فستان سهرة أحمر / باقة استشارات" : "E.g. Red Evening Dress / Consultation Package"} className="text-xs rounded-xl" />
                        </div>
                        <div>
                          <Label className="text-[11px] mb-1 block">{isAr ? "الوصف" : "Description"}</Label>
                          <Textarea value={manualProductForm.description} onChange={e => setManualProductForm(f => ({ ...f, description: e.target.value }))} placeholder={isAr ? "تفاصيل المقاسات، الخامات، المميزات..." : "Details, materials, features, sizing..."} className="text-xs rounded-xl min-h-[50px] resize-none" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <Label className="text-[11px] mb-1 block">{isAr ? "السعر" : "Price"}</Label>
                            <Input type="number" value={manualProductForm.price} onChange={e => setManualProductForm(f => ({ ...f, price: e.target.value }))} placeholder="350" className="text-xs rounded-xl" />
                          </div>
                          <div>
                            <Label className="text-[11px] mb-1 block">{isAr ? "العملة" : "Currency"}</Label>
                            <Select value={manualProductForm.currency} onValueChange={v => setManualProductForm(f => ({ ...f, currency: v }))}>
                              <SelectTrigger className="text-xs rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EGP">EGP</SelectItem>
                                <SelectItem value="SAR">SAR</SelectItem>
                                <SelectItem value="AED">AED</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[11px] mb-1 block">{isAr ? "صورة المنتج (اختياري)" : "Product Image (optional)"}</Label>
                          {manualProductForm.imageUrl ? (
                            <div className="relative w-full h-24 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
                              <img src={manualProductForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                              <button onClick={() => setManualProductForm(f => ({ ...f, imageUrl: "" }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 cursor-pointer transition-colors text-xs text-gray-500">
                                {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                {uploadingImage ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع صورة" : "Upload Image")}
                                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleProductImageUpload(file); e.target.value = ""; }} />
                              </label>
                              <Input value={manualProductForm.imageUrl} onChange={e => setManualProductForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder={isAr ? "أو ألصق رابط صورة" : "Or paste image URL"} className="text-xs rounded-xl flex-1" dir="ltr" />
                            </div>
                          )}
                        </div>
                        <button onClick={() => setShowAdvancedFields(!showAdvancedFields)} className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-600 transition-colors py-1">
                          {showAdvancedFields ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showAdvancedFields ? (isAr ? "إخفاء التفاصيل الإضافية" : "Hide advanced details") : (isAr ? "+ إضافة تفاصيل إضافية (رابط، تصنيف، مخزون...)" : "+ Add more details (URL, category, stock...)")}
                        </button>
                        {showAdvancedFields && (
                          <div className="space-y-2 p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] mb-0.5 block">{isAr ? "السعر قبل الخصم" : "Compare at Price"}</Label>
                                <Input type="number" value={manualProductForm.compareAtPrice} onChange={e => setManualProductForm(f => ({ ...f, compareAtPrice: e.target.value }))} placeholder="500" className="text-xs rounded-xl" />
                              </div>
                              <div>
                                <Label className="text-[10px] mb-0.5 block">{isAr ? "المخزون" : "Stock"}</Label>
                                <Select value={manualProductForm.stock === "" ? "not-tracked" : manualProductForm.stock || "available"} onValueChange={v => setManualProductForm(f => ({ ...f, stock: v === "not-tracked" ? "" : v }))}>
                                  <SelectTrigger className="text-xs rounded-xl"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="available">{isAr ? "متوفر" : "In Stock"}</SelectItem>
                                    <SelectItem value="unavailable">{isAr ? "غير متوفر" : "Out of Stock"}</SelectItem>
                                    <SelectItem value="not-tracked">{isAr ? "غير متابع" : "Not Tracked"}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] mb-0.5 block">{isAr ? "رابط المنتج / صفحة الموقع" : "Product URL / Website Link"}</Label>
                              <Input value={manualProductForm.url} onChange={e => setManualProductForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com/product/..." dir="ltr" className="text-xs rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] mb-0.5 block">{isAr ? "التصنيف" : "Category"}</Label>
                                <Input value={manualProductForm.category} onChange={e => setManualProductForm(f => ({ ...f, category: e.target.value }))} placeholder={isAr ? "ملابس، إلكترونيات..." : "Clothing, Electronics..."} className="text-xs rounded-xl" />
                              </div>
                              <div>
                                <Label className="text-[10px] mb-0.5 block">{isAr ? "كلمات مفتاحية" : "Tags"}</Label>
                                <Input value={manualProductForm.tags} onChange={e => setManualProductForm(f => ({ ...f, tags: e.target.value }))} placeholder={isAr ? "سهرة, أحمر, نسائي" : "evening, red, women"} className="text-xs rounded-xl" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button onClick={handleAddManualProduct} disabled={addingManualProduct || !manualProductForm.name.trim()} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-4 gap-1.5">
                            {addingManualProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            {editingProductId ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ المنتج" : "Save Product")}
                          </Button>
                          {(catalogItems.length > 0 || editingProductId) && (
                            <Button variant="outline" onClick={() => { setShowAddForm(false); setEditingProductId(null); setManualProductForm({ ...emptyCatalogItem }); setShowAdvancedFields(false); }} className="rounded-xl text-xs px-4">{isAr ? "إلغاء" : "Cancel"}</Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => { setManualProductForm({ ...emptyCatalogItem }); setShowAddForm(true); setEditingProductId(null); }} variant="outline" className="w-full rounded-xl text-xs font-semibold gap-1.5 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500">
                        <Plus className="w-3.5 h-3.5 text-emerald-500" />{isAr ? "+ إضافة منتج أو خدمة" : "+ Add Product or Service"}
                      </Button>
                    )}
                    <p className="text-[10px] text-gray-400 italic text-center pt-1">{isAr ? "يمكنك تعديل وإضافة المنتجات لاحقًا من الكتالوج." : "You can edit and add more products later from the catalog."}</p>
                  </div>
                )}

                {onboardingSubMode === "services_only" && (
                  <div className="space-y-3 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 bg-emerald-50/40 dark:bg-emerald-950/20 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">💼</div>
                    <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">{isAr ? "تم ضبط الحساب كـ «نشاط خدمي / بدون منتجات»" : "Configured as 'Services / Non-catalog Business'"}</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">{isAr ? "سيعتمد Wani على هوية البراند وسياساتك ومصادر المعرفة المتاحة لفهم العملاء والرد داخل حدود نشاطك." : "Wani will use your brand identity, policies, and available knowledge sources to understand customers and reply within your business boundaries."}</p>
                    <button onClick={() => setOnboardingSubMode("select")} className="text-[11px] text-emerald-600 hover:underline pt-1 block mx-auto font-semibold">{isAr ? "← تغيير هذا الخيار" : "← Change this choice"}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
            {onboardingStep > 1 ? (
              <Button variant="outline" onClick={() => setOnboardingStep(s => s - 1)} className="rounded-xl text-xs gap-1">{isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}{isAr ? "رجوع" : "Back"}</Button>
            ) : <div />}
            {onboardingStep < 3 ? (
              <Button onClick={() => setOnboardingStep(s => s + 1)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1 px-5 font-bold">{isAr ? "التالي" : "Next"}{isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}</Button>
            ) : (
              <Button onClick={async () => { await saveAgentSettings({ isEnabled: true }); setShowOnboarding(false); setOnboardingStep(1); loadCatalogRows(catalogSourceFilter, catalogSearch); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1 px-6 font-bold">
                <Check className="w-4 h-4" />{isAr ? "إنهاء الإعداد وتفعيل Wani" : "Finish & Activate Wani"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
