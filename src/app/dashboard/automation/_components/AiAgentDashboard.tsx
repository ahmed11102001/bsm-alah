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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Sparkles, Store, Shield, HelpCircle, FileText, Send, RefreshCw,
  Plus, Trash2, Edit3, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  Loader2, Save, ShoppingBag, ArrowRight, ArrowLeft, Zap, MessageSquare, Info,
  ExternalLink, Layers, Check, ImagePlus, X, ChevronDown, ChevronUp, Upload
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
  action?: string | null;
  reason?: string | null;
}

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

  // Modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState({ id: "", question: "", answer: "" });
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({ id: "", type: "return_policy", title: "", content: "" });
  const [showGuardrailsModal, setShowGuardrailsModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);

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
      text: isAr ? "مرحباً! أنا مساعدك الذكي التجريبي. جرب تسألني عن أي منتج أو سياسة لتجربة ردودي live ✨" : "Hello! I am your test AI assistant. Try asking me about products or policies live ✨",
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

  // ── Calculate Readiness Score ──
  const calculateReadiness = () => {
    let score = 0;
    if (agent.brandName?.trim()) score += 10;
    if (agent.businessDesc?.trim()) score += 15;
    if (agent.tone) score += 10;
    if (agent.languageMode) score += 5;
    if (productStats.total > 0 || agent.productsInfo?.trim()) score += 25;
    if (faqs.length > 0) score += 15;
    if (policies.length > 0) score += 10;
    if (guardrails.customRules?.trim() || guardrails.noInventPrices) score += 10;
    return Math.min(100, score);
  };

  const readiness = calculateReadiness();

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
        toast.success(isAr ? "تم إضافة السؤال بنجاح" : "FAQ added");
        setShowFaqModal(false);
        setFaqForm({ id: "", question: "", answer: "" });
        loadAllData();
      }
    } catch (e) {
      toast.error(isAr ? "حدث خطأ" : "Error saving FAQ");
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
        setShowPolicyModal(false);
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
      if (res.ok) {
        toast.success(isAr ? "تم حفظ القواعد والحدود" : "Guardrails saved");
        setShowGuardrailsModal(false);
      }
    } catch (e) {
      toast.error(isAr ? "حدث خطأ" : "Error saving guardrails");
    }
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
      const res = await fetch("/api/ai-agent/sales-behavior", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salesBehavior),
      });
      if (!res.ok) throw new Error();
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
    const rootUrl = websiteKnowledge.rootUrl.trim() || agent.websiteUrl.trim();
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

  // ── Add or Update Manual Product inside Onboarding ──
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
        // Update local catalog list
        const newItem: CatalogItem = { ...manualProductForm, id: saved.id || String(Date.now()) };
        if (editingProductId) {
          setCatalogItems(prev => prev.map(p => p.id === editingProductId ? newItem : p));
        } else {
          setCatalogItems(prev => [...prev, newItem]);
          setProductStats(prev => ({ ...prev, total: prev.total + 1 }));
        }
        // Reset form
        setManualProductForm({ ...emptyCatalogItem });
        setShowAddForm(false);
        setEditingProductId(null);
        setShowAdvancedFields(false);
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
        <p className="text-sm text-gray-500 dark:text-gray-400">{isAr ? "جاري تحميل مركز تدريب المساعد..." : "Loading AI Agent Hub..."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" dir={isAr ? "rtl" : "ltr"}>
      {/* ── Header & Enable Toggle ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-br from-emerald-900/10 via-emerald-800/5 to-teal-900/10 dark:from-emerald-950/40 dark:to-teal-950/30 p-6 rounded-3xl border border-emerald-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Bot className="w-6 h-6" />
            </span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isAr ? "درّب مساعدك الذكي" : "Train Your AI Agent"}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAr ? "كلما زادت معرفة المساعد بالبراند والمنتجات والسياسات، أصبحت ردوده أكثر دقة واحترافية" : "The more your AI knows about your brand, products, and policies, the more accurate its replies will be"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            {isAr ? "معالج التدريب (Onboarding)" : "Training Wizard"}
          </button>

          <button
            onClick={() => saveAgentSettings({ isEnabled: !agent.isEnabled })}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border font-bold text-sm transition-all shadow-sm ${
              agent.isEnabled
                ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
            }`}
          >
            {agent.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {agent.isEnabled ? (isAr ? "المساعد مفعّل" : "Agent Active") : (isAr ? "المساعد معطّل" : "Agent Inactive")}
          </button>
        </div>
      </div>

      {/* ── Readiness % Meter ── */}
      <div className="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-100 text-base">
              {isAr ? "نسبة جاهزية المساعد" : "Agent Readiness Score"}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {readiness}%
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {readiness >= 80 ? (isAr ? "جاهز للاستخدام والتفعيل 🚀" : "Ready for deployment 🚀") : (isAr ? "أضف المزيد من المعلومات لتحسين الردود" : "Add more info to improve replies")}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-700/60 rounded-full h-3.5 overflow-hidden p-0.5 border border-gray-200/40 dark:border-gray-600/40">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>

      {/* ── Knowledge Sources Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* 1. Brand Info */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{isAr ? "بيانات البراند" : "Brand Info"}</h3>
                  <span className="text-xs text-gray-400">{agent.brandName || (isAr ? "لم يحدد الاسم" : "No name set")}</span>
                </div>
              </div>
              {agent.brandName && agent.businessDesc ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? "مكتمل" : "Complete"}
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> {isAr ? "ناقص" : "Incomplete"}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 min-h-[3rem]">
              {agent.businessDesc || (isAr ? "أضف وصفاً شاملاً للنشاط وساعات العمل ليعرف المساعد كيف يمثل البراند." : "Add a business description so your AI represents your brand accurately.")}
            </p>
          </div>

          <Button
            onClick={() => setShowBrandModal(true)}
            variant="outline"
            className="w-full rounded-2xl text-xs font-semibold gap-2 border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
            {isAr ? "تعديل بيانات البراند" : "Edit Brand Info"}
          </Button>
        </div>

        {/* 2. AI Personality */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{isAr ? "شخصية المساعد" : "AI Personality"}</h3>
                  <span className="text-xs text-gray-400">
                    {agent.tone === "friendly" ? (isAr ? "ودود ومساعد" : "Friendly") : agent.tone === "formal" ? (isAr ? "رسمي واحترافي" : "Formal") : (isAr ? "عامية مصرية" : "Colloquial")}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? "مكتمل" : "Complete"}
              </span>
            </div>

            <div className="space-y-2 mb-4 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-400">{isAr ? "المزوّد" : "Provider"}</span>
                <span className="font-bold">{agent.provider === "gemini" ? "Google Gemini" : "ChatGPT GPT-4o mini"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-400">{isAr ? "اللغة" : "Language"}</span>
                <span className="font-bold">{agent.languageMode === "auto" ? (isAr ? "تلقائي" : "Auto") : agent.languageMode === "ar" ? "عربي" : "English"}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowOnboarding(true)}
            variant="outline"
            className="w-full rounded-2xl text-xs font-semibold gap-2 border-gray-200 dark:border-gray-700 hover:border-purple-500/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            {isAr ? "ضبط الشخصية والنموذج" : "Tune Personality"}
          </Button>
        </div>

        {/* 3. Guardrails & Limits */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{isAr ? "القواعد والحدود" : "Guardrails & Limits"}</h3>
                  <span className="text-xs text-gray-400">{isAr ? "حماية وتوجيه الردود" : "Controls & Rules"}</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? "مكتمل" : "Complete"}
              </span>
            </div>

            <div className="space-y-1.5 mb-4 text-xs text-gray-600 dark:text-gray-300">
              <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" /> {isAr ? "عدم اختراع أسعار أو منتجات" : "No hallucinated prices"}
              </p>
              <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" /> {isAr ? "تحويل الشكاوى للبشر تلقائياً" : "Auto handoff for complaints"}
              </p>
              {guardrails.customRules && (
                <p className="text-xs text-gray-400 line-clamp-1 italic">"{guardrails.customRules}"</p>
              )}
            </div>
          </div>

          <Button
            onClick={() => setShowGuardrailsModal(true)}
            variant="outline"
            className="w-full rounded-2xl text-xs font-semibold gap-2 border-gray-200 dark:border-gray-700 hover:border-rose-500/50 hover:bg-rose-50/30 dark:hover:bg-rose-950/20"
          >
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            {isAr ? "إدارة القواعد والحدود" : "Manage Guardrails"}
          </Button>
        </div>

        {/* 4. Website Knowledge */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">🌐 {isAr ? "معرفة الموقع" : "Website Knowledge"}</h3>
              <p className="text-xs text-gray-500 mt-1">{isAr ? "استخرج معلومات مفيدة من صفحات محدودة لاستخدامها كمصدر معرفة للمساعد." : "Extract useful content from selected website pages as an additional AI knowledge source."}</p>
            </div>
            <Switch checked={websiteKnowledge.isEnabled} onCheckedChange={value => updateWebsiteKnowledge({ isEnabled: value })} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={websiteKnowledge.rootUrl} onChange={event => setWebsiteKnowledge(s => ({ ...s, rootUrl: event.target.value }))} placeholder={agent.websiteUrl || "https://example.com"} dir="ltr" className="text-xs rounded-xl" />
            <Button onClick={syncWebsiteKnowledge} disabled={syncingWebsite || (!websiteKnowledge.rootUrl.trim() && !agent.websiteUrl.trim())} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold whitespace-nowrap">
              {syncingWebsite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{syncingWebsite ? (isAr ? "بنقرأ موقعك..." : "Reading your site...") : (isAr ? "استخراج المعرفة الآن" : "Extract Knowledge Now")}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">{isAr ? "العملية تعمل في الخلفية وقد تستغرق دقيقة. المواقع التي تعتمد على JavaScript بالكامل قد لا يظهر محتواها." : "Runs in the background and may take a minute. Fully JavaScript-rendered sites may not expose readable content."}</p>
          {websitePages.length > 0 && <div className="mt-3 space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-3">
            {websitePages.map(page => <div key={page.id} className="flex items-center gap-2 text-[11px]">
              <div className="flex-1 min-w-0"><div className="font-semibold truncate text-gray-700 dark:text-gray-300">{page.title || page.url}</div><div className="text-gray-400 truncate">{page.url} · {page._count.chunks} chunks · {new Date(page.lastCrawledAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</div></div>
              <button type="button" onClick={() => deleteWebsitePage(page.id)} className="text-red-500 hover:underline">{isAr ? "حذف" : "Delete"}</button>
            </div>)}
          </div>}
        </div>

        {/* 5. Sales Behavior */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{isAr ? "سلوك المبيعات" : "Sales Behavior"}</h3>
              <p className="text-xs text-gray-500 mt-1">{isAr ? "حدد هدف المساعد وطريقة اقتراح المنتجات من الكتالوج." : "Choose the assistant goal and how it suggests catalog products."}</p>
            </div>
            <Button onClick={saveSalesBehavior} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"><Save className="w-3.5 h-3.5" />{isAr ? "حفظ" : "Save"}</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
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
                <span>{label}</span><Switch checked={salesBehavior[key]} onCheckedChange={value => {
                  if (key === "suggestCrossSell" && value && !relationProducts.some(product => product.relatedProductIds.length > 0)) {
                    setShowRelationManager(true);
                    toast.error(isAr ? "Ø§Ø±Ø¨Ø· Ù…Ù†ØªØ¬Ø§Øª Ù…ÙƒÙ…Ù„Ø© Ù…Ù† Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬ Ø£ÙˆÙ„Ø§Ù‹ Ø­ØªÙ‰ ÙŠØªÙ…ÙƒÙ† Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ù…Ù† Ø§Ù‚ØªØ±Ø§Ø­Ù‡Ø§ Ø¨Ø¯Ù‚Ø©." : "Link complementary products in the catalog first so the assistant can suggest them accurately.");
                    return;
                  }
                  setSalesBehavior(s => ({ ...s, [key]: value }));
                }} />
              </div>
            ))}
          </div>
          {salesBehavior.suggestCrossSell && <p className="mt-3 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2">{isAr ? "الاقتراحات المكملة تحتاج ربط المنتجات يدويًا من الكتالوج أولًا." : "Complementary suggestions require manual product relationships in the catalog."}</p>}
          {salesBehavior.suggestCrossSell && <button type="button" onClick={() => setShowRelationManager(true)} className="text-[11px] text-emerald-600 hover:underline font-bold">{isAr ? "إدارة المنتجات المرتبطة →" : "Manage related products →"}</button>}
          {showRelationManager && !salesBehavior.suggestCrossSell && <p className="mt-3 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2 flex items-center justify-between gap-2"><span>{isAr ? "Ø§Ø±Ø¨Ø· Ù…Ù†ØªØ¬Ø§Øª Ù…ÙƒÙ…Ù„Ø© Ù…Ù† Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬ Ø£ÙˆÙ„Ø§Ù‹ Ø­ØªÙ‰ ÙŠØªÙ…ÙƒÙ† Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ù…Ù† Ø§Ù‚ØªØ±Ø§Ø­Ù‡Ø§ Ø¨Ø¯Ù‚Ø©." : "Link complementary products in the catalog first so the assistant can suggest them accurately."}</span><button type="button" onClick={() => setShowRelationManager(true)} className="shrink-0 underline font-bold">{isAr ? "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© →" : "Manage related products →"}</button></p>}
          {(salesBehavior.suggestCrossSell || showRelationManager) && relationProducts.length > 0 && <div className="mt-3 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
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
          <div className="flex items-center gap-3 mt-4 text-xs">
            <Label>{isAr ? "أقصى عدد منتجات مقترحة" : "Maximum suggested products"}</Label>
            <Select value={String(salesBehavior.maxSuggestedProducts)} onValueChange={value => setSalesBehavior(s => ({ ...s, maxSuggestedProducts: Number(value) }))}>
              <SelectTrigger className="w-20 rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        {/* 5. Product Catalog Knowledge (Featured Card) */}
        <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-emerald-950/90 via-emerald-900/90 to-teal-950/90 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-bold">
                <ShoppingBag className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{isAr ? "معرفة المنتجات (Smart Catalog Search)" : "Product Catalog Knowledge"}</h3>
                  <span className="text-xs bg-emerald-400/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
                    {productStats.total} {isAr ? "منتج متصل" : "Connected products"}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-1">
                  {isAr
                    ? "البحث الذكي يجيب أقرب 3-5 منتجات فقط لكل رسالة — الكتالوج كامل لا يُرسل للذكاء الاصطناعي لتوفير السرعة والتكلفة."
                    : "Smart search retrieves top 3-5 relevant products per message — the entire catalog is never dumped into the prompt."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => triggerProductSync()}
                disabled={syncingProducts}
                className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-2xl text-xs gap-2 px-4 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingProducts ? "animate-spin" : ""}`} />
                {syncingProducts ? (isAr ? "جاري المزامنة..." : "Syncing...") : (isAr ? "مزامنة الآن" : "Sync Now")}
              </Button>
            </div>
          </div>

          {productStats.lastSync && (
            <div className="text-[11px] text-emerald-300/70 border-t border-emerald-500/20 pt-3 flex items-center justify-between">
              <span>
                {isAr ? "آخر مزامنة:" : "Last sync:"} {new Date(productStats.lastSync.completedAt || Date.now()).toLocaleString(isAr ? "ar-EG" : "en-US")} ({productStats.lastSync.source})
              </span>
              <span className="text-emerald-400 font-semibold">
                {productStats.lastSync.productsSynced} {isAr ? "منتج مُزامن" : "products synced"}
              </span>
            </div>
          )}
        </div>

        {/* 5. FAQs Knowledge */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{isAr ? "الأسئلة الشائعة" : "FAQs"}</h3>
                  <span className="text-xs text-gray-400">{faqs.length} {isAr ? "سؤال مضاف" : "questions added"}</span>
                </div>
              </div>
              {faqs.length > 0 ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? "مكتمل" : "Complete"}
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> {isAr ? "إضفي أسئلة" : "Add FAQs"}
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4 max-h-28 overflow-y-auto">
              {faqs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">{isAr ? "أضف أسئلة تتدفق من العملاء كثرةً ليجيبها المساعد بدقة." : "Add common questions so your AI replies accurately."}</p>
              ) : (
                faqs.slice(0, 3).map(f => (
                  <div key={f.id} className="text-xs bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="truncate max-w-[180px] font-semibold text-gray-800 dark:text-gray-200">س: {f.question}</span>
                    <button onClick={() => deleteFaq(f.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button
            onClick={() => setShowFaqModal(true)}
            variant="outline"
            className="w-full rounded-2xl text-xs font-semibold gap-2 border-gray-200 dark:border-gray-700 hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
          >
            <Plus className="w-3.5 h-3.5 text-blue-500" />
            {isAr ? "إضافة / إدارة الأسئلة" : "Manage FAQs"}
          </Button>
        </div>

        {/* 6. Brand Policies */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{isAr ? "سياسات البراند" : "Brand Policies"}</h3>
                  <span className="text-xs text-gray-400">{policies.length} {isAr ? "سياسة مضافة" : "policies added"}</span>
                </div>
              </div>
              {policies.length > 0 ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? "مكتمل" : "Complete"}
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> {isAr ? "إضفي سياسة" : "Add policy"}
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4 max-h-28 overflow-y-auto">
              {policies.length === 0 ? (
                <p className="text-xs text-gray-400 italic">{isAr ? "أضف سياسة الاستبدال والاسترجاع والشحن لتجنب سوء الفهم." : "Add return and shipping policies for clear AI answers."}</p>
              ) : (
                policies.slice(0, 3).map(p => (
                  <div key={p.id} className="text-xs bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="truncate max-w-[180px] font-semibold text-gray-800 dark:text-gray-200">📋 {p.title}</span>
                    <button onClick={() => deletePolicy(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button
            onClick={() => setShowPolicyModal(true)}
            variant="outline"
            className="w-full rounded-2xl text-xs font-semibold gap-2 border-gray-200 dark:border-gray-700 hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-950/20"
          >
            <Plus className="w-3.5 h-3.5 text-teal-500" />
            {isAr ? "إضافة / إدارة السياسات" : "Manage Policies"}
          </Button>
        </div>

      </div>

      {/* ── Test Chat / AI Preview Playground (🧪 جرّب مساعدك) ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              🧪
            </span>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{isAr ? "جرّب مساعدك (Test Chat Live)" : "Test Your Agent Live"}</h3>
              <p className="text-xs text-gray-400">{isAr ? "ختبر ردود المساعد وبحث المنتجات مباشرة قبل تفعيله مع العملاء" : "Test how your AI agent replies to messages live before engaging actual customers"}</p>
            </div>
          </div>

          <Button
            onClick={() => setChatMessages([
              {
                id: "welcome",
                sender: "ai",
                text: isAr ? "مرحباً! أنا مساعدك الذكي التجريبي. جرب تسألني عن أي منتج أو سياسة لتجربة ردودي live ✨" : "Hello! I am your test AI assistant. Try asking me about products or policies live ✨",
                time: new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
              }
            ])}
            variant="ghost"
            className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isAr ? "مسح المحادثة" : "Clear Chat"}
          </Button>
        </div>

        {/* Chat Messages Screen */}
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-4 min-h-[260px] max-h-[360px] overflow-y-auto space-y-3 border border-gray-200/50 dark:border-gray-700/50">
          {chatMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${msg.sender === "user" ? "mr-auto items-end" : "ml-auto items-start"}`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-emerald-600 text-white rounded-tl-none"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tr-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Show Matched Product Card if any */}
                {msg.matchedProducts && msg.matchedProducts.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🛍️ {isAr ? "المنتج المقترح من الكتالوج:" : "Suggested Product:"}</p>
                    {msg.matchedProducts.map(prod => (
                      <div key={prod.id} className="flex items-center gap-2 bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/20">
                        {prod.images?.[0] && (
                          <img src={prod.images[0]} alt={prod.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="truncate text-[11px]">
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{prod.name}</p>
                          <p className="text-emerald-700 dark:text-emerald-300 font-semibold">{prod.price} {prod.currency || "EGP"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.action === "handoff" && (
                  <div className="mt-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/20 flex items-center gap-1">
                    ⚠️ {isAr ? "تم تحويل المحادثة لبشر" : "Handoff to human triggered"}: {msg.reason}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 mt-4">
          <Input
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendTestMessage(); }}
            placeholder={isAr ? "اكتب رسالة تجريبية... (مثال: عندكم فستان أسود؟)" : "Type a test message... (e.g. Do you have black dresses?)"}
            className="rounded-2xl text-xs py-5 bg-gray-50 dark:bg-gray-900/50"
          />
          <Button
            onClick={sendTestMessage}
            disabled={sendingTest || !inputMessage.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-5 py-5 gap-1.5 flex-shrink-0 font-bold"
          >
            {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isAr ? "إرسال" : "Send"}
          </Button>
        </div>
      </div>

      {/* ── ElevenLabs Voice Agent ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">ElevenLabs Voice Agent</h3>
              <p className="text-xs text-gray-400">{isAr ? "كل يوزر بـ Agent بصوته هو — التحاسب عليهم برا" : "Each user can use their own ElevenLabs voice agent"}</p>
            </div>
          </div>
          <button
            onClick={() => saveAgentSettings({ elevenLabsEnabled: !agent.elevenLabsEnabled })}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${
              agent.elevenLabsEnabled
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
                ? "اعمل Agent على ElevenLabs وحط الـ API Key والـ Agent ID هنا. لما تفعّل Voice Agent في محادثة معينة، هيرد بصوت الـ Agent على كل الرسائل."
                : "Create an Agent in ElevenLabs and place the API Key and Agent ID here. When you enable Voice Agent in a specific conversation, it will reply with the Agent's voice to all messages."}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">ElevenLabs API Key *</Label>
              <Input
                type="password"
                value={agent.elevenLabsApiKey}
                onChange={e => setAgent(f => ({ ...f, elevenLabsApiKey: e.target.value }))}
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                dir="ltr"
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Agent ID *</Label>
              <Input
                value={agent.elevenLabsAgentId}
                onChange={e => setAgent(f => ({ ...f, elevenLabsAgentId: e.target.value }))}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                dir="ltr"
                className="rounded-xl"
              />
              <p className="text-xs text-gray-400 mt-1">
                {isAr ? "من ElevenLabs Dashboard → Conversational AI → Agent → Copy ID" : "From ElevenLabs Dashboard → Conversational AI → Agent → Copy ID"}
              </p>
            </div>
            <Button
              onClick={() => saveAgentSettings()}
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs py-5 gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isAr ? "حفظ إعدادات Voice Agent" : "Save Voice Agent Settings"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialog: Onboarding Wizard (Modal 3 Steps) ── */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-xl rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                {isAr ? "تدريب مساعد الذكاء الاصطناعي" : "AI Agent Onboarding"}
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
                  <Input
                    value={agent.brandName}
                    onChange={e => setAgent(f => ({ ...f, brandName: e.target.value }))}
                    placeholder={isAr ? "مثال: متجر الأناقة" : "E.g. Elegance Store"}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "ساعات العمل" : "Working Hours"}</Label>
                  <Input
                    value={agent.workingHours}
                    onChange={e => setAgent(f => ({ ...f, workingHours: e.target.value }))}
                    placeholder={isAr ? "مثال: 9 ص – 10 م يومياً" : "E.g. 9 AM – 10 PM daily"}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isAr ? "وصف نشاط البيزنس والخدمات" : "Business Description"} *</Label>
                  <Textarea
                    value={agent.businessDesc}
                    onChange={e => setAgent(f => ({ ...f, businessDesc: e.target.value }))}
                    placeholder={isAr ? "اكتب تفاصيل عن بيزنسك وما يميز منتجاتك..." : "Describe your business, products, and what makes you unique..."}
                    className="min-h-[100px] resize-none text-xs"
                  />
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
                        className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all ${
                          agent.provider === p ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700"
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
                {/* Header info */}
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">
                    {isAr ? "منتجاتك وخدماتك" : "Products & Services"}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    {isAr ? "ساعد المساعد على معرفة ما تقدمه لعملائك وأسعاره وتفاصيل كل خيار." : "Help the agent learn about what you offer, pricing, and details."}
                  </p>
                </div>

                {/* Submode 1: SELECT MODE */}
                {onboardingSubMode === "select" && (
                  <div className="space-y-3 pt-2">
                    {productStats.total > 0 && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-2xl text-xs flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          {isAr ? `تم تسجيل ${productStats.total} منتج / خدمة في الكتالوج` : `${productStats.total} products/services in catalog`}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 underline cursor-pointer font-bold" onClick={() => setOnboardingSubMode("manual")}>
                          {isAr ? "إضافة المزيد" : "Add more"}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Option A: Store Sync */}
                      <button
                        onClick={() => { setSelectedStoreSource("shopify"); setOnboardingSubMode("store"); }}
                        className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group"
                      >
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🛍️</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">Shopify</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "استورد منتجاتك تلقائيًا من Shopify أو EasyOrders" : "Import products automatically"}</span>
                      </button>

                      <button
                        onClick={() => { setSelectedStoreSource("easyorders"); setOnboardingSubMode("store"); }}
                        className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group"
                      >
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">📦</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">EasyOrders</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "مصدر المنتجات" : "Product source"}</span>
                      </button>

                      <button
                        onClick={() => { setSelectedStoreSource("woocommerce"); setOnboardingSubMode("store"); }}
                        className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50/40 dark:hover:bg-violet-950/20 transition-all group"
                      >
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🟣</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">WooCommerce</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "مصدر المنتجات" : "Product source"}</span>
                      </button>

                      {/* Option B: Manual Entry */}
                      <button
                        onClick={() => setOnboardingSubMode("manual")}
                        className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group"
                      >
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">✏️</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{isAr ? "إدخال يدوي" : "Manual Entry"}</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "أضف منتجاتك أو خدماتك وأسعارها بنفسك" : "Add items & pricing yourself"}</span>
                      </button>

                      {/* Option C: Services Only / No products */}
                      <button
                        onClick={() => setOnboardingSubMode("services_only")}
                        className="flex flex-col items-center text-center p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group"
                      >
                        <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">💼</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{isAr ? "أقدم خدمات فقط" : "Services Only"}</span>
                        <span className="text-[10px] text-gray-400 mt-1">{isAr ? "بدون كتالوج — يعتمد على وصف البراند والأسئلة" : "No catalog — relies on Brand & FAQs"}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-400 italic text-center pt-2">
                      {isAr ? "المتجر مجرد مصدر اختياري لمعرفة المساعد — لا يلزمك وجود متجر لإكمال الإعداد." : "A store is optional — you don't need one to complete training."}
                    </p>
                  </div>
                )}

                {/* Submode 2: STORE SYNC MODE */}
                {onboardingSubMode === "store" && (
                  <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/30 text-right" dir={isAr ? "rtl" : "ltr"}>
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        🛍️ {isAr ? "مصادر المنتجات" : "Product Sources"}
                      </h5>
                      <button onClick={() => setOnboardingSubMode("select")} className="text-[11px] text-emerald-600 hover:underline">
                        {isAr ? "← تغيير الخيار" : "← Change option"}
                      </button>
                    </div>

                    {productStats.total > 0 ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20 text-xs">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          {isAr ? `✓ تم العثور على ${productStats.total} منتج متصل` : `✓ Found ${productStats.total} connected products`}
                        </div>
                        <p className="text-[11px] text-emerald-600/80 mt-0.5">
                          {isAr ? "سيتم تحديث المنتجات والأسعار تلقائيًا من منصتك المربوطة." : "Products & prices update automatically from connected store."}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-500/20 text-xs space-y-2">
                        <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {isAr ? "لا يوجد مصدر منتجات متصل حالياً" : "No product source connected yet"}
                        </div>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          {isAr ? "اربط Shopify أو EasyOrders لاستيراد منتجاتك تلقائياً، أو اختر الإدخال اليدوي لإضافة منتجاتك الآن." : "Connect Shopify or EasyOrders to import products automatically, or select manual entry."}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" onClick={() => window.open("/dashboard/store", "_blank")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] rounded-xl font-bold gap-1">
                            <ExternalLink className="w-3 h-3" /> {isAr ? "ربط متجر الآن" : "Connect Store"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setOnboardingSubMode("manual")} className="text-[11px] rounded-xl font-semibold">
                            ✏️ {isAr ? "التوجه للإدخال اليدوي" : "Switch to Manual Entry"}
                          </Button>
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
                          <Button onClick={syncSelectedStore} disabled={syncingProducts} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold">
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingProducts ? "animate-spin" : ""}`} />{isAr ? "مزامنة المنتجات الآن" : "Sync Products Now"}
                          </Button>
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

                {/* Submode 3: MANUAL ENTRY MODE — Mini Catalog Manager */}
                {onboardingSubMode === "manual" && (
                  <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/30" dir={isAr ? "rtl" : "ltr"}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        ✏️ {catalogItems.length > 0
                          ? (isAr ? `كتالوجك — ${catalogItems.length}` : `Your Catalog — ${catalogItems.length}`)
                          : (isAr ? "إضافة منتج أو خدمة يدويًا" : "Add Product or Service Manually")}
                      </h5>
                      <button onClick={() => setOnboardingSubMode("select")} className="text-[11px] text-emerald-600 hover:underline">
                        {isAr ? "← تغيير الخيار" : "← Change option"}
                      </button>
                    </div>

                    {/* ── Product List ── */}
                    {catalogItems.length > 0 && (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {catalogItems.map(item => (
                          <div key={item.id} className="flex items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2 hover:border-emerald-500/40 transition-all">
                            {/* Thumbnail */}
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                              <p className="text-[10px] text-gray-500">
                                {item.price ? `${item.price} ${item.currency}` : (isAr ? "بدون سعر" : "No price")}
                                {item.category ? ` · ${item.category}` : ""}
                              </p>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => handleEditCatalogItem(item)} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteCatalogItem(item)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Add/Edit Form ── */}
                    {showAddForm ? (
                      <div className="space-y-2.5 border-t border-gray-200 dark:border-gray-700 pt-3">
                        {/* Level 1: Essential Fields */}
                        <div>
                          <Label className="text-[11px] mb-1 block">{isAr ? "اسم المنتج / الخدمة *" : "Product / Service Name *"}</Label>
                          <Input
                            value={manualProductForm.name}
                            onChange={e => setManualProductForm(f => ({ ...f, name: e.target.value }))}
                            placeholder={isAr ? "مثال: فستان سهرة أحمر / باقة استشارات" : "E.g. Red Evening Dress / Consultation Package"}
                            className="text-xs rounded-xl"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] mb-1 block">{isAr ? "الوصف" : "Description"}</Label>
                          <Textarea
                            value={manualProductForm.description}
                            onChange={e => setManualProductForm(f => ({ ...f, description: e.target.value }))}
                            placeholder={isAr ? "تفاصيل المقاسات، الخامات، المميزات..." : "Details, materials, features, sizing..."}
                            className="text-xs rounded-xl min-h-[50px] resize-none"
                          />
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

                        {/* Image Upload */}
                        <div>
                          <Label className="text-[11px] mb-1 block">{isAr ? "صورة المنتج (اختياري)" : "Product Image (optional)"}</Label>
                          {manualProductForm.imageUrl ? (
                            <div className="relative w-full h-24 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
                              <img src={manualProductForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => setManualProductForm(f => ({ ...f, imageUrl: "" }))}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 cursor-pointer transition-colors text-xs text-gray-500">
                                {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                {uploadingImage ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع صورة" : "Upload Image")}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleProductImageUpload(file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <Input
                                value={manualProductForm.imageUrl}
                                onChange={e => setManualProductForm(f => ({ ...f, imageUrl: e.target.value }))}
                                placeholder={isAr ? "أو ألصق رابط صورة" : "Or paste image URL"}
                                className="text-xs rounded-xl flex-1"
                                dir="ltr"
                              />
                            </div>
                          )}
                        </div>

                        {/* Advanced Fields Toggle */}
                        <button
                          onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-600 transition-colors py-1"
                        >
                          {showAdvancedFields ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showAdvancedFields
                            ? (isAr ? "إخفاء التفاصيل الإضافية" : "Hide advanced details")
                            : (isAr ? "+ إضافة تفاصيل إضافية (رابط، تصنيف، مخزون...)" : "+ Add more details (URL, category, stock...)")}
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
                                <Select
                                  value={manualProductForm.stock === "" ? "not-tracked" : manualProductForm.stock || "available"}
                                  onValueChange={v => setManualProductForm(f => ({ ...f, stock: v === "not-tracked" ? "" : v }))}
                                >
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

                        {/* Save & Cancel Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAddManualProduct}
                            disabled={addingManualProduct || !manualProductForm.name.trim()}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-4 gap-1.5"
                          >
                            {addingManualProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            {editingProductId ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ المنتج" : "Save Product")}
                          </Button>
                          {(catalogItems.length > 0 || editingProductId) && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowAddForm(false);
                                setEditingProductId(null);
                                setManualProductForm({ ...emptyCatalogItem });
                                setShowAdvancedFields(false);
                              }}
                              className="rounded-xl text-xs px-4"
                            >
                              {isAr ? "إلغاء" : "Cancel"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Show "Add" button when form is hidden */
                      <Button
                        onClick={() => {
                          setManualProductForm({ ...emptyCatalogItem });
                          setShowAddForm(true);
                          setEditingProductId(null);
                        }}
                        variant="outline"
                        className="w-full rounded-xl text-xs font-semibold gap-1.5 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-500" />
                        {isAr ? "+ إضافة منتج أو خدمة" : "+ Add Product or Service"}
                      </Button>
                    )}

                    <p className="text-[10px] text-gray-400 italic text-center pt-1">
                      {isAr ? "يمكنك تعديل وإضافة المنتجات لاحقًا من الكتالوج." : "You can edit and add more products later from the catalog."}
                    </p>
                  </div>
                )}

                {/* Submode 4: SERVICES ONLY MODE */}
                {onboardingSubMode === "services_only" && (
                  <div className="space-y-3 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 bg-emerald-50/40 dark:bg-emerald-950/20 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">
                      💼
                    </div>
                    <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                      {isAr ? "تم ضبط الحساب كـ «نشاط خدمي / بدون منتجات»" : "Configured as 'Services / Non-catalog Business'"}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                      {isAr
                        ? "سيعتمد مساعدك الذكي تمامًا على «وصف النشاط» في الخطوة 1 والأسئلة الشائعة وسياساتك للإجابة على جميع العملاء."
                        : "Your AI agent will rely fully on your Business Description and FAQs/Policies to answer clients."}
                    </p>
                    <button onClick={() => setOnboardingSubMode("select")} className="text-[11px] text-emerald-600 hover:underline pt-1 block mx-auto font-semibold">
                      {isAr ? "← تغيير هذا الخيار" : "← Change this choice"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
            {onboardingStep > 1 ? (
              <Button variant="outline" onClick={() => setOnboardingStep(s => s - 1)} className="rounded-xl text-xs gap-1">
                {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                {isAr ? "رجوع" : "Back"}
              </Button>
            ) : <div />}

            {onboardingStep < 3 ? (
              <Button onClick={() => setOnboardingStep(s => s + 1)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1 px-5 font-bold">
                {isAr ? "التالي" : "Next"}
                {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  await saveAgentSettings({ isEnabled: true });
                  setShowOnboarding(false);
                  setOnboardingStep(1);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1 px-6 font-bold"
              >
                <Check className="w-4 h-4" />
                {isAr ? "إنهاء الإعداد وتفعيل المساعد" : "Finish & Activate Agent"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Brand Info ── */}
      <Dialog open={showBrandModal} onOpenChange={setShowBrandModal}>
        <DialogContent className="max-w-md rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">{isAr ? "بيانات البراند" : "Brand Info"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "اسم البراند" : "Brand Name"}</Label>
              <Input value={agent.brandName} onChange={e => setAgent(f => ({ ...f, brandName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "ساعات العمل" : "Working Hours"}</Label>
              <Input value={agent.workingHours} onChange={e => setAgent(f => ({ ...f, workingHours: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "وصف النشاط والمنتجات" : "Business Description"}</Label>
              <Textarea value={agent.businessDesc} onChange={e => setAgent(f => ({ ...f, businessDesc: e.target.value }))} className="min-h-[100px] text-xs" />
            </div>
          </div>
          <Button onClick={async () => { await saveAgentSettings(); setShowBrandModal(false); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
            {isAr ? "حفظ البيانات" : "Save Brand Info"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: FAQ Modal ── */}
      <Dialog open={showFaqModal} onOpenChange={setShowFaqModal}>
        <DialogContent className="max-w-md rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">{isAr ? "إضافة سؤال شائع" : "Add FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "السؤال" : "Question"} *</Label>
              <Input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder={isAr ? "مثال: فين مكانكم؟" : "E.g. Where are you located?"} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "الإجابة" : "Answer"} *</Label>
              <Textarea value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} placeholder={isAr ? "اكتب الإجابة النموذجية التي سيرد بها المساعد..." : "Write the answer..."} className="min-h-[90px] text-xs" />
            </div>
          </div>
          <Button onClick={saveFaq} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
            {isAr ? "إضافة السؤال" : "Save FAQ"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Policy Modal ── */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-md rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">{isAr ? "إضافة سياسة" : "Add Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Textarea value={policyForm.content} onChange={e => setPolicyForm(f => ({ ...f, content: e.target.value }))} placeholder={isAr ? "اكتب بنود السياسة بالتفصيل..." : "Write policy text..."} className="min-h-[100px] text-xs" />
            </div>
          </div>
          <Button onClick={savePolicy} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
            {isAr ? "حفظ السياسة" : "Save Policy"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Guardrails Modal ── */}
      <Dialog open={showGuardrailsModal} onOpenChange={setShowGuardrailsModal}>
        <DialogContent className="max-w-md rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="font-bold text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-rose-500" />
              {isAr ? "القواعد والحدود (Guardrails)" : "AI Guardrails"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer">{isAr ? "عدم التخمين إذا كانت المعلومة غير متوفرة" : "Do not guess if information is unavailable"}</Label>
              <Switch checked={guardrails.strictKnowledgeOnly} onCheckedChange={v => setGuardrails(g => ({ ...g, strictKnowledgeOnly: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer">{isAr ? "عدم اختراع أسعار غير متوفرة" : "Do not hallucinate prices"}</Label>
              <Switch checked={guardrails.noInventPrices} onCheckedChange={v => setGuardrails(g => ({ ...g, noInventPrices: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer">{isAr ? "عدم اختراع منتجات غير متوفرة" : "Do not invent non-existent products"}</Label>
              <Switch checked={guardrails.noInventProducts} onCheckedChange={v => setGuardrails(g => ({ ...g, noInventProducts: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer">{isAr ? "عدم ذكر أو مقارنة المنافسين" : "Never mention competitors"}</Label>
              <Switch checked={guardrails.noMentionCompetitors} onCheckedChange={v => setGuardrails(g => ({ ...g, noMentionCompetitors: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer">{isAr ? "تحويل الشكاوى والغضب للبشر فوراً" : "Auto handoff for complaints"}</Label>
              <Switch checked={guardrails.alwaysHandoffComplaints} onCheckedChange={v => setGuardrails(g => ({ ...g, alwaysHandoffComplaints: v }))} />
            </div>

            <div>
              <Label className="text-xs mb-1 block">{isAr ? "أقصى عدد سطور للرد" : "Max lines per reply"}</Label>
              <Input
                type="number" min={1} max={10}
                value={guardrails.maxReplyLines}
                onChange={e => setGuardrails(g => ({ ...g, maxReplyLines: Number(e.target.value) || 3 }))}
                className="rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">{isAr ? "قواعد مخصصة (Custom Rules)" : "Custom Rules"}</Label>
              <Textarea
                value={guardrails.customRules || ""}
                onChange={e => setGuardrails(g => ({ ...g, customRules: e.target.value }))}
                placeholder={isAr ? "مثال: لو سألوا عن الشحن الدولي قول مش متاح حالياً." : "E.g. If asked about international shipping, reply not available."}
                className="min-h-[80px] text-xs resize-none"
              />
            </div>
          </div>

          <Button onClick={saveGuardrails} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
            {isAr ? "حفظ القواعد والحدود" : "Save Guardrails"}
          </Button>
        </DialogContent>
      </Dialog>

    </div>
  );
}
