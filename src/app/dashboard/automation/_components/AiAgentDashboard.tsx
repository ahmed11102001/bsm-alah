"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Sparkles, Store, Shield, FileText, Send, RefreshCw,
  Plus, Trash2, Edit3, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  Loader2, Save, ShoppingBag, ArrowRight, ArrowLeft, Zap, MessageSquare, Info,
  ExternalLink, Layers, Check, ImagePlus, X, ChevronDown, ChevronUp, Upload,
  MessageCircle, Globe, Users, ListChecks, Wand2,
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
  responseStyle: "short" | "natural" | "detailed";
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

interface UnifiedProduct {
  id: string;
  source: "shopify" | "easyorders" | "woocommerce" | "manual";
  externalId: string;
  name: string;
  description: string | null;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  images: string[];
  stock: number | null;
  category: string | null;
  tags: string[];
  url: string | null;
  isActive: boolean;
  updatedAt: string;
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

// تابات الصفحة الرئيسية (نفس منطق تبويبات dashboard/reports — قسم دائم لكل موضوع)
type MainTab = "overview" | "identity" | "knowledge" | "behavior";
// تابات فرعية جوه "مصادر المعرفة"
type KnowledgeTab = "catalog" | "policies" | "website";

export default function AiAgentDashboard({ lang }: { lang: "ar" | "en" }) {
  const isAr = lang === "ar";

  // ── States ──
  const [mainTab, setMainTab] = useState<MainTab>("overview");
  const [knowledgeTab, setKnowledgeTab] = useState<KnowledgeTab>("catalog");
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AiAgentSettings>({
    isEnabled: false, provider: "gemini", brandName: "", businessDesc: "",
    productsInfo: "", pricingInfo: "", workingHours: "", tone: "friendly",
    systemPrompt: "", languageMode: "auto", websiteUrl: "", websiteButtonText: "", pauseMinutes: 10,
    elevenLabsEnabled: false, elevenLabsApiKey: "", elevenLabsAgentId: "",
  });
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [guardrails, setGuardrails] = useState<GuardrailsData>({
    noInventPrices: true,
    noInventProducts: true,
    noMentionCompetitors: true,
    noSharePersonal: true,
    strictKnowledgeOnly: true,
    alwaysHandoffComplaints: true,
    responseStyle: "natural",
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
  const [products, setProducts] = useState<UnifiedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productFilter, setProductFilter] = useState<"all" | "store" | "manual">("all");
  const [productSearch, setProductSearch] = useState("");
  const [relationProducts, setRelationProducts] = useState<RelationProduct[]>([]);
  const [showRelationManager, setShowRelationManager] = useState(false);
  const [websiteKnowledge, setWebsiteKnowledge] = useState({ isEnabled: false, rootUrl: "" });
  const [websitePages, setWebsitePages] = useState<Array<{ id: string; url: string; title: string | null; lastCrawledAt: string; _count: { chunks: number } }>>([]);
  const [syncingWebsite, setSyncingWebsite] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);

  // Drawers/Modals (السياسات فقط؛ مصادر المعرفة الأخرى لها واجهاتها المباشرة)
  const [showPolicyDrawer, setShowPolicyDrawer] = useState(false);
  const [policyForm, setPolicyForm] = useState({ id: "", type: "return_policy", title: "", content: "" });

  // Catalog manual entry (نموذج الإضافة/التعديل — القائمة نفسها بقت products/setProducts الموحّدة)
  const [manualProductForm, setManualProductForm] = useState<CatalogItem>({ ...emptyCatalogItem });
  const [addingManualProduct, setAddingManualProduct] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Test Chat (Side panel ثابت — بيتفتح من أي تاب)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: isAr ? "أهلاً! أنا وني، مساعدك الذكي التجريبي. جرّب تسألني عن أي منتج أو سياسة لتجربة ردودي live ✨" : "Hey! I'm Wani, your test AI assistant. Try asking me about a product or policy to test my replies live ✨",
      time: new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);


  // ── Fetch unified products (بحث/فلترة) ──
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (productFilter === "manual") params.set("source", "manual");
      if (productSearch.trim()) params.set("search", productSearch.trim());
      const res = await fetch(`/api/ai-agent/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        let list: UnifiedProduct[] = data.products || [];
        if (productFilter === "store") list = list.filter(p => p.source !== "manual");
        setProducts(list);
        setProductStats(prev => ({ ...prev, total: data.total ?? prev.total, lastSync: data.lastSync ?? prev.lastSync }));
      }
    } finally {
      setProductsLoading(false);
    }
  }, [productFilter, productSearch]);

  useEffect(() => {
    const t = setTimeout(() => { if (mainTab === "knowledge" && knowledgeTab === "catalog") fetchProducts(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFilter, productSearch, mainTab, knowledgeTab]);

  // ── Load All Data ──
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [resAgent, resPolicies, resGuardrails, resProducts, resSales, resWebsite] = await Promise.all([
        fetch("/api/ai-agent"),
        fetch("/api/ai-agent/policies"),
        fetch("/api/ai-agent/guardrails"),
        fetch("/api/ai-agent/products?pageSize=100"),
        fetch("/api/ai-agent/sales-behavior"),
        fetch("/api/ai-agent/website-knowledge"),
      ]);

      if (resAgent.ok) {
        const data = await resAgent.json();
        setAgent(prev => ({ ...prev, ...data }));
      }
      if (resPolicies.ok) setPolicies(await resPolicies.json());
      if (resGuardrails.ok) setGuardrails(await resGuardrails.json());
      if (resProducts.ok) {
        const pData = await resProducts.json();
        setProductStats({ total: pData.total || 0, lastSync: pData.lastSync });
        setProducts(pData.products || []);
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

  // ── Readiness Checklist (بدل رقم % لوحده — كل بند بيودّي مباشرة لمكانه) ──
  const checklist: Array<{ id: string; label: string; done: boolean; weight: number; goto: MainTab; gotoSub?: KnowledgeTab }> = [
    { id: "brand", label: isAr ? "بيانات البراند" : "Brand info", done: !!agent.brandName?.trim() && !!agent.businessDesc?.trim(), weight: 20, goto: "identity" },
    { id: "personality", label: isAr ? "شخصية المساعد" : "AI personality", done: !!agent.tone && !!agent.languageMode, weight: 10, goto: "identity" },
    { id: "knowledge", label: isAr ? "مصدر معرفة واحد على الأقل (كتالوج/موقع/سياسات)" : "At least one knowledge source", done: productStats.total > 0 || !!agent.productsInfo?.trim() || websitePages.length > 0 || policies.length > 0, weight: 30, goto: "knowledge", gotoSub: "catalog" },
    { id: "policies", label: isAr ? "سياسات البراند" : "Brand policies", done: policies.length > 0, weight: 10, goto: "knowledge", gotoSub: "policies" },
    { id: "guardrails", label: isAr ? "القواعد والحدود" : "Guardrails", done: !!guardrails.customRules?.trim() || guardrails.noInventPrices, weight: 15, goto: "behavior" },
  ];
  const readiness = Math.min(100, checklist.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0));
  const missingItems = checklist.filter(item => !item.done);

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
        setShowPolicyDrawer(false);
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

  // ── Add or Update Manual Product in the catalog ──
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
        fetchProducts();
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
  const handleDeleteCatalogItem = async (item: { id: string }) => {
    try {
      await fetch(`/api/ai-agent/products?id=${item.id}`, { method: "DELETE" });
      fetchProducts();
      toast.success(isAr ? "تم حذف المنتج" : "Product deleted");
    } catch {
      toast.error(isAr ? "فشل حذف المنتج" : "Failed to delete product");
    }
  };

  // ── Start editing catalog item ──
  const handleEditCatalogItem = (item: UnifiedProduct) => {
    setManualProductForm({
      id: item.id, name: item.name, description: item.description || "",
      price: item.price != null ? String(item.price) : "", compareAtPrice: item.compareAtPrice != null ? String(item.compareAtPrice) : "",
      currency: item.currency || "EGP", imageUrl: item.images?.[0] || "", url: item.url || "",
      category: item.category || "", tags: (item.tags || []).join(", "),
      stock: item.stock != null ? String(item.stock) : "",
    });
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
        <p className="text-sm text-gray-500 dark:text-gray-400">{isAr ? "جاري تحميل وني..." : "Loading Wani..."}</p>
      </div>
    );
  }

  const MAIN_TABS: Array<{ id: MainTab; label: string; icon: any }> = [
    { id: "overview", label: isAr ? "نظرة عامة" : "Overview", icon: ListChecks },
    { id: "identity", label: isAr ? "الهوية" : "Identity", icon: Wand2 },
    { id: "knowledge", label: isAr ? "مصادر المعرفة" : "Knowledge", icon: Layers },
    { id: "behavior", label: isAr ? "السلوك والحدود" : "Behavior & Limits", icon: Shield },
  ];

  return (
    <div className="space-y-6 pb-12" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Header: هوية وني + تفعيل + جرّب المساعد ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-br from-emerald-900/10 via-emerald-800/5 to-teal-900/10 dark:from-emerald-950/40 dark:to-teal-950/30 p-6 rounded-3xl border border-emerald-500/20 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/ai wani.svg" alt="Wani" className="w-full h-full object-cover" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isAr ? "وني — مساعدك الذكي" : "Wani — Your AI Assistant"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAr ? "كلما زادت معرفة وني بالبراند والمنتجات والسياسات، أصبحت ردوده أكثر دقة" : "The more Wani knows about your brand, the more accurate its replies"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestPanel(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            {isAr ? "جرّب وني" : "Test Wani"}
          </button>

          <button
            onClick={() => saveAgentSettings({ isEnabled: !agent.isEnabled })}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border font-bold text-sm transition-all shadow-sm ${agent.isEnabled
                ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
              }`}
          >
            {agent.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {agent.isEnabled ? (isAr ? "وني مفعّل" : "Wani Active") : (isAr ? "وني معطّل" : "Wani Inactive")}
          </button>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
        {MAIN_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            className={`flex items-center gap-1.5 text-sm rounded-xl px-4 py-2 font-semibold transition-all ${mainTab === t.id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {t.id !== "overview" && checklist.some(c => c.goto === t.id && !c.done) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════ نظرة عامة ═══════════════ */}
      {mainTab === "overview" && (
        <div className="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-base">
                {isAr ? "نسبة جاهزية وني" : "Wani Readiness"}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {readiness}%
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {readiness >= 80 ? (isAr ? "جاهز للاستخدام 🚀" : "Ready 🚀") : (isAr ? "كمّل البنود الناقصة تحت" : "Finish the items below")}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700/60 rounded-full h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700" style={{ width: `${readiness}%` }} />
          </div>

          <div className="space-y-2 pt-2">
            {checklist.map(item => (
              <button
                key={item.id}
                onClick={() => { setMainTab(item.goto); if (item.gotoSub) setKnowledgeTab(item.gotoSub); }}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all text-right"
              >
                <span className="flex items-center gap-2.5 text-sm">
                  {item.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <span className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />}
                  <span className={item.done ? "text-gray-500 dark:text-gray-400 line-through" : "text-gray-800 dark:text-gray-200 font-medium"}>{item.label}</span>
                </span>
                {!item.done && <ArrowLeft className={`w-4 h-4 text-gray-300 ${isAr ? "" : "rotate-180"}`} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ الهوية ═══════════════ */}
      {mainTab === "identity" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-500" /> {isAr ? "بيانات البراند" : "Brand Info"}
            </h3>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "اسم البراند" : "Brand name"}</Label>
              <Input
                value={agent.brandName}
                onChange={e => setAgent(f => ({ ...f, brandName: e.target.value }))}
                onBlur={() => saveAgentSettings()}
                placeholder={isAr ? "مثال: متجر الأناقة" : "E.g. Elegance Store"}
                className="rounded-xl text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "وصف النشاط" : "Business description"}</Label>
              <Textarea
                value={agent.businessDesc}
                onChange={e => setAgent(f => ({ ...f, businessDesc: e.target.value }))}
                onBlur={() => saveAgentSettings()}
                placeholder={isAr ? "بنبيع إيه، وميزتنا إيه عن غيرنا..." : "What you sell, what makes you different..."}
                className="rounded-xl text-sm min-h-[90px]"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "رابط الموقع الذي يرسله وني" : "Website URL Wani shares"}</Label>
              <Input
                value={agent.websiteUrl || ""}
                onChange={e => setAgent(f => ({ ...f, websiteUrl: e.target.value }))}
                onBlur={() => saveAgentSettings()}
                placeholder="https://example.com" dir="ltr"
                className="rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> {isAr ? "شخصية وني" : "Wani's Personality"}
            </h3>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "مزوّد الذكاء الاصطناعي" : "AI Provider"}</Label>
              <Select value={agent.provider} onValueChange={v => saveAgentSettings({ provider: v as "gemini" | "openai" })}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">ChatGPT GPT-4o mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "لهجة الرد" : "Reply tone"}</Label>
              <Select value={agent.tone} onValueChange={v => saveAgentSettings({ tone: v })}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">{isAr ? "ودود ومساعد" : "Friendly"}</SelectItem>
                  <SelectItem value="formal">{isAr ? "رسمي واحترافي" : "Formal"}</SelectItem>
                  <SelectItem value="colloquial">{isAr ? "عامية مصرية" : "Colloquial"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "لغة الرد" : "Reply language"}</Label>
              <Select value={agent.languageMode} onValueChange={v => saveAgentSettings({ languageMode: v })}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{isAr ? "تلقائي (حسب رسالة العميل)" : "Auto (matches customer)"}</SelectItem>
                  <SelectItem value="ar">{isAr ? "عربي دائمًا" : "Always Arabic"}</SelectItem>
                  <SelectItem value="en">{isAr ? "إنجليزي دائمًا" : "Always English"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "مدة إيقاف وني بعد رد موظف (دقائق)" : "Pause Wani after a human reply (minutes)"}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={120} value={agent.pauseMinutes} onChange={e => setAgent(f => ({ ...f, pauseMinutes: Number(e.target.value) }))} onMouseUp={() => saveAgentSettings()} onTouchEnd={() => saveAgentSettings()} className="flex-1 accent-emerald-500" />
                <span className="w-12 text-center font-bold text-sm">{agent.pauseMinutes}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ مصادر المعرفة ═══════════════ */}
      {mainTab === "knowledge" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
            {([
              ["catalog", isAr ? "الكتالوج" : "Catalog", ShoppingBag, productStats.total],
              ["policies", isAr ? "السياسات" : "Policies", FileText, policies.length],
              ["website", isAr ? "الموقع" : "Website", Globe, websitePages.length],
            ] as const).map(([id, label, Icon, count]) => (
              <button
                key={id}
                onClick={() => setKnowledgeTab(id)}
                className={`flex items-center gap-1.5 text-sm rounded-xl px-4 py-2 font-semibold transition-all ${knowledgeTab === id
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
              >
                <Icon className="w-4 h-4" /> {label}
                {count > 0 && <span className="text-[10px] bg-gray-200 dark:bg-gray-600 px-1.5 rounded-full">{count}</span>}
              </button>
            ))}
          </div>

          {/* ── الكتالوج (Placeholder مؤقت — التصميم الكامل جاي في مرحلة تانية) ── */}
          {knowledgeTab === "catalog" && (() => {
            const storeSources = (["shopify", "easyorders", "woocommerce"] as const)
              .map(src => ({ src, count: products.filter(p => p.source === src).length }))
              .filter(s => s.count > 0);
            const manualCount = products.filter(p => p.source === "manual").length;
            const hasAnyStore = storeSources.length > 0;
            const totalKnown = products.length;
            const SOURCE_LABEL: Record<string, string> = { shopify: "Shopify", easyorders: isAr ? "إيزي أوردرز" : "EasyOrders", woocommerce: "WooCommerce", manual: isAr ? "يدوي" : "Manual" };
            const SOURCE_COLOR: Record<string, string> = {
              shopify: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
              easyorders: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
              woocommerce: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
              manual: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
            };

            return (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{isAr ? "الكتالوج" : "Catalog"}</h3>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{isAr ? `إجمالي المنتجات: ${totalKnown}` : `Total products: ${totalKnown}`}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{isAr ? "كل المنتجات في قائمة واحدة — منتجات المتجر مميزة باسم المنصة، والمنتجات اليدوية مميزة بوسم «يدوي»." : "One catalog for everything — store products show their platform, while manual products are marked Manual."}</p>

                  {/* مصادر المنتجات */}
                  <div className="border border-gray-100 dark:border-gray-700 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700 mb-4">
                    {storeSources.map(({ src, count }) => (
                      <div key={src} className="flex items-center justify-between p-3">
                        <span className="text-sm flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SOURCE_COLOR[src]}`}>{SOURCE_LABEL[src]}</span>
                          <span className="text-gray-500 dark:text-gray-400">{count} {isAr ? "منتج" : "products"}</span>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => triggerProductSync(src)} disabled={syncingProducts} className="rounded-xl text-xs gap-1.5">
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingProducts ? "animate-spin" : ""}`} /> {isAr ? "مزامنة" : "Sync"}
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SOURCE_COLOR.manual}`}>{SOURCE_LABEL.manual}</span>
                        <span className="text-gray-500 dark:text-gray-400">{manualCount} {isAr ? "منتج" : "products"}</span>
                      </span>
                      <Button size="sm" onClick={() => { setManualProductForm({ ...emptyCatalogItem }); setEditingProductId(null); setShowAddForm(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> {isAr ? "إضافة منتج" : "Add product"}
                      </Button>
                    </div>
                  </div>

                  {!hasAnyStore && (
                    <div className="text-[11px] text-gray-400 mb-4 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      {isAr ? "مفيش متجر متصل؟" : "No store connected?"}
                      <a href="/dashboard/store" className="text-emerald-600 hover:underline font-semibold">{isAr ? "اربط متجرك من هنا" : "Connect your store here"}</a>
                    </div>
                  )}

                  {totalKnown === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                      <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{isAr ? "لا يوجد متجر متصل" : "No store connected"}</p>
                      <p className="text-xs text-gray-400 mt-1 mb-4">{isAr ? "يمكنك بناء كتالوج منتجاتك يدويًا وسيستخدمه وني في الإجابة عن الأسعار والمنتجات والتوافر." : "Build your product catalog manually — Wani will use it to answer questions about prices, products, and availability."}</p>
                      <Button onClick={() => { setManualProductForm({ ...emptyCatalogItem }); setEditingProductId(null); setShowAddForm(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> {isAr ? "إضافة أول منتج" : "Add your first product"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* فلاتر + بحث */}
                      <div className="flex flex-col sm:flex-row gap-2 mb-3">
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                          {([["all", isAr ? "كل المنتجات" : "All"], ["store", isAr ? "من المتجر" : "From store"], ["manual", isAr ? "يدوية" : "Manual"]] as const).map(([id, label]) => (
                            <button key={id} onClick={() => setProductFilter(id)} className={`text-xs rounded-lg px-3 py-1.5 font-semibold transition-all ${productFilter === id ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>{label}</button>
                          ))}
                        </div>
                        <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder={isAr ? "🔎 ابحث عن منتج..." : "🔎 Search products..."} className="text-xs rounded-xl flex-1" />
                      </div>

                      {/* الجدول الموحّد */}
                      <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                        {productsLoading ? (
                          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
                        ) : products.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-8">{isAr ? "مفيش نتائج مطابقة" : "No matching products"}</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                              <tr>
                                <th className="text-right py-2.5 px-3 font-semibold text-gray-500 dark:text-gray-400">{isAr ? "المنتج" : "Product"}</th>
                                <th className="text-right py-2.5 px-3 font-semibold text-gray-500 dark:text-gray-400">{isAr ? "المصدر" : "Source"}</th>
                                <th className="text-right py-2.5 px-3 font-semibold text-gray-500 dark:text-gray-400">{isAr ? "السعر" : "Price"}</th>
                                <th className="text-right py-2.5 px-3 font-semibold text-gray-500 dark:text-gray-400" />
                              </tr>
                            </thead>
                            <tbody>
                              {products.map(p => (
                                <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                  <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[220px]">{p.name}</td>
                                  <td className="py-2.5 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SOURCE_COLOR[p.source]}`}>{SOURCE_LABEL[p.source]}</span></td>
                                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">{p.price != null ? `${p.price} ${p.currency}` : "—"}</td>
                                  <td className="py-2.5 px-3 text-left">
                                    {p.source === "manual" ? (
                                      <div className="flex items-center gap-1 justify-end">
                                        <button onClick={() => handleEditCatalogItem(p)} className="text-gray-400 hover:text-emerald-600 p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteCatalogItem(p)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-gray-300">{isAr ? "من المتجر (قراءة فقط)" : "Read-only"}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}

                  {/* بديل نصي يدوي — يظهر فقط لو مفيش أي منتج خالص (Progressive disclosure) */}
                  {totalKnown === 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      <p className="text-xs text-gray-500">{isAr ? "أو اكتب وصف نصي بديل مؤقت لحد ما تضيف منتجاتك:" : "Or add temporary fallback text until you add your products:"}</p>
                      <Textarea value={agent.productsInfo || ""} onChange={e => setAgent(f => ({ ...f, productsInfo: e.target.value }))} onBlur={() => saveAgentSettings()} placeholder={isAr ? "اكتب وصفًا مختصرًا للمنتجات أو الخدمات..." : "Describe your products or services..."} className="rounded-xl text-xs min-h-[60px]" />
                      <Textarea value={agent.pricingInfo || ""} onChange={e => setAgent(f => ({ ...f, pricingInfo: e.target.value }))} onBlur={() => saveAgentSettings()} placeholder={isAr ? "اكتب الأسعار أو قواعد التسعير..." : "Add prices or pricing rules..."} className="rounded-xl text-xs min-h-[50px]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── السياسات (List + Drawer) ── */}
          {knowledgeTab === "policies" && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{policies.length} {isAr ? "سياسة مضافة" : "policies added"}</h3>
                <Button onClick={() => { setPolicyForm({ id: "", type: "return_policy", title: "", content: "" }); setShowPolicyDrawer(true); }} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> {isAr ? "سياسة جديدة" : "New Policy"}
                </Button>
              </div>
              {policies.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">{isAr ? "أضف سياسات الشحن والاسترجاع والضمان ليعرفها وني." : "Add shipping, return, and warranty policies for Wani."}</p>
              ) : (
                <div className="space-y-2">
                  {policies.map(p => (
                    <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{p.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{p.content}</p>
                      </div>
                      <button onClick={() => deletePolicy(p.id)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── معرفة الموقع (Inline + Toggle) ── */}
          {knowledgeTab === "website" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">🌐 {isAr ? "معرفة الموقع" : "Website Knowledge"}</h3>
                  <p className="text-xs text-gray-500 mt-1">{isAr ? "استخرج معلومات مفيدة من صفحات محدودة لاستخدامها كمصدر معرفة لوني." : "Extract useful content from selected website pages as a Wani knowledge source."}</p>
                </div>
                <Switch checked={websiteKnowledge.isEnabled} onCheckedChange={value => updateWebsiteKnowledge({ isEnabled: value })} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={websiteKnowledge.rootUrl} onChange={event => setWebsiteKnowledge(s => ({ ...s, rootUrl: event.target.value }))} placeholder={agent.websiteUrl || "https://example.com"} dir="ltr" className="text-xs rounded-xl" />
                <Button onClick={syncWebsiteKnowledge} disabled={syncingWebsite || (!websiteKnowledge.rootUrl.trim() && !(agent.websiteUrl || "").trim())} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold whitespace-nowrap">
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
          )}
        </div>
      )}

      {/* ═══════════════ السلوك والحدود ═══════════════ */}
      {mainTab === "behavior" && (
        <div className="space-y-4">
          {/* سلوك المبيعات */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{isAr ? "سلوك المبيعات" : "Sales Behavior"}</h3>
                <p className="text-xs text-gray-500 mt-1">{isAr ? "حدد هدف وني وطريقة اقتراح المنتجات من الكتالوج." : "Choose Wani's goal and how it suggests catalog products."}</p>
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
                      toast.error(isAr ? "اربط منتجات مكملة من الكتالوج أولًا حتى يتمكن وني من اقتراحها بدقة." : "Link complementary products in the catalog first so Wani can suggest them accurately.");
                      return;
                    }
                    setSalesBehavior(s => ({ ...s, [key]: value }));
                  }} />
                </div>
              ))}
            </div>
            {salesBehavior.suggestCrossSell && <p className="mt-3 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2">{isAr ? "الاقتراحات المكملة تحتاج ربط المنتجات يدويًا من الكتالوج أولًا." : "Complementary suggestions require manual product relationships in the catalog."}</p>}
            {salesBehavior.suggestCrossSell && <button type="button" onClick={() => setShowRelationManager(true)} className="text-[11px] text-emerald-600 hover:underline font-bold">{isAr ? "إدارة المنتجات المرتبطة →" : "Manage related products →"}</button>}
            {showRelationManager && !salesBehavior.suggestCrossSell && <p className="mt-3 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2 flex items-center justify-between gap-2"><span>{isAr ? "اربط منتجات مكملة من الكتالوج أولًا حتى يتمكن وني من اقتراحها بدقة." : "Link complementary products in the catalog first so Wani can suggest them accurately."}</span><button type="button" onClick={() => setShowRelationManager(true)} className="shrink-0 underline font-bold">{isAr ? "إدارة المنتجات المرتبطة →" : "Manage related products →"}</button></p>}
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

          {/* القواعد والحدود (Guardrails) — نفس المستوى، مش مودال منفصل */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-500" /> {isAr ? "القواعد والحدود (Guardrails)" : "Guardrails"}
              </h3>
              <Button onClick={saveGuardrails} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"><Save className="w-3.5 h-3.5" />{isAr ? "حفظ" : "Save"}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
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
              <div className="space-y-2">
                <Label className="text-xs mb-1 block">{isAr ? "أسلوب الرد" : "Response style"}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "short" as const, ar: "مختصر", en: "Short", descAr: "إجابات مباشرة وسريعة، بدون تفاصيل زائدة", descEn: "Direct answers with only the essential information" },
                    { value: "natural" as const, ar: "طبيعي", en: "Natural", descAr: "إجابات متوازنة وواضحة بدون إطالة غير ضرورية", descEn: "Balanced, clear answers without unnecessary length" },
                    { value: "detailed" as const, ar: "مفصل", en: "Detailed", descAr: "شرح شامل وتفاصيل إضافية عندما تكون مفيدة", descEn: "Thorough explanations with useful extra detail" },
                  ]).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGuardrails(g => ({ ...g, responseStyle: option.value }))}
                      className={`rounded-xl border px-2 py-2 text-xs transition text-center ${guardrails.responseStyle === option.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-gray-200 text-gray-500 hover:border-emerald-300 dark:border-gray-700 dark:text-gray-400"
                        }`}
                    >
                      <span className="flex items-center justify-center gap-1 font-semibold">
                        <span className={`h-2.5 w-2.5 rounded-full border ${guardrails.responseStyle === option.value ? "border-emerald-500 bg-emerald-500" : "border-gray-400"}`} />
                        {isAr ? option.ar : option.en}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  {isAr
                    ? ({ short: "إجابات مباشرة وسريعة، بدون تفاصيل زائدة", natural: "إجابات متوازنة وواضحة بدون إطالة غير ضرورية", detailed: "شرح شامل وتفاصيل إضافية عندما تكون مفيدة" } as const)[guardrails.responseStyle]
                    : ({ short: "Direct answers with only the essential information", natural: "Balanced, clear answers without unnecessary length", detailed: "Thorough explanations with useful extra detail" } as const)[guardrails.responseStyle]}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-xs mb-1 block">{isAr ? "قواعد مخصصة (Custom Rules)" : "Custom Rules"}</Label>
              <Textarea value={guardrails.customRules || ""} onChange={e => setGuardrails(g => ({ ...g, customRules: e.target.value }))} placeholder={isAr ? "مثال: لو سألوا عن الشحن الدولي قول مش متاح حالياً." : "E.g. If asked about international shipping, reply not available."} className="min-h-[80px] text-xs resize-none rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* ── Side Panel: جرّب وني (متاح من أي تاب) ── */}
      <Sheet open={showTestPanel} onOpenChange={setShowTestPanel}>
        <SheetContent side={isAr ? "left" : "right"} className="w-full sm:max-w-md flex flex-col p-0" dir={isAr ? "rtl" : "ltr"}>
          <SheetHeader className="p-5 border-b border-gray-100 dark:border-gray-700">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-lg">🧪</span> {isAr ? "جرّب وني (Test Chat Live)" : "Test Wani Live"}
            </SheetTitle>
            <SheetDescription>{isAr ? "اختبر ردود وني وبحث المنتجات مباشرة قبل تفعيله مع العملاء" : "Test how Wani replies live before engaging real customers"}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/60">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "mr-auto items-end" : "ml-auto items-start"}`}>
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.sender === "user" ? "bg-emerald-600 text-white rounded-tl-none" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tr-none"}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.matchedProducts && msg.matchedProducts.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🛍️ {isAr ? "المنتج المقترح من الكتالوج:" : "Suggested Product:"}</p>
                      {msg.matchedProducts.map(prod => (
                        <div key={prod.id} className="flex items-center gap-2 bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/20">
                          {prod.images?.[0] && <img src={prod.images[0]} alt={prod.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />}
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
                  {msg.knowledgeSources && msg.knowledgeSources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                      <p className="mb-1 text-[9px] font-semibold text-gray-400">{isAr ? "مصادر المعرفة المتاحة للرد" : "Knowledge sources available for this reply"}</p>
                      <div className="flex flex-wrap gap-1">
                        {msg.knowledgeSources.map(source => (
                          <span key={source} className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 text-[9px] text-emerald-700 dark:text-emerald-300">
                            ✓ {source === "brand" ? (isAr ? "هوية البراند" : "Brand identity") : source === "catalog" ? (isAr ? "الكتالوج" : "Catalog") : source === "policies" ? (isAr ? "السياسات" : "Policies") : (isAr ? "قواعد السلوك" : "Behavior rules")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Input
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendTestMessage(); }}
              placeholder={isAr ? "اكتب رسالة تجريبية..." : "Type a test message..."}
              className="rounded-2xl text-xs py-5 bg-gray-50 dark:bg-gray-900/50"
            />
            <Button onClick={sendTestMessage} disabled={sendingTest || !inputMessage.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-4 py-5 flex-shrink-0 font-bold">
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Drawer: إضافة/تعديل سياسة ── */}
      <Sheet open={showPolicyDrawer} onOpenChange={setShowPolicyDrawer}>
        <SheetContent side={isAr ? "left" : "right"} className="w-full sm:max-w-md" dir={isAr ? "rtl" : "ltr"}>
          <SheetHeader>
            <SheetTitle>{isAr ? "إضافة سياسة" : "Add Policy"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
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
              <Textarea value={policyForm.content} onChange={e => setPolicyForm(f => ({ ...f, content: e.target.value }))} placeholder={isAr ? "اكتب بنود السياسة بالتفصيل..." : "Write policy text..."} className="min-h-[120px] text-xs" />
            </div>
            <Button onClick={() => { savePolicy(); setShowPolicyDrawer(false); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
              {isAr ? "حفظ السياسة" : "Save Policy"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Drawer: إضافة/تعديل منتج يدوي ── */}
      <Sheet open={showAddForm} onOpenChange={(open) => { setShowAddForm(open); if (!open) { setEditingProductId(null); setManualProductForm({ ...emptyCatalogItem }); } }}>
        <SheetContent side={isAr ? "left" : "right"} className="w-full sm:max-w-md overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
          <SheetHeader>
            <SheetTitle>{editingProductId ? (isAr ? "تعديل منتج" : "Edit product") : (isAr ? "إضافة منتج يدوي" : "Add manual product")}</SheetTitle>
            <SheetDescription>{isAr ? "منتجات يضيفها وني كمصدر معرفة، منفصلة عن أي متجر متصل." : "Products added here are a Wani knowledge source, separate from any connected store."}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "اسم المنتج" : "Product name"} *</Label>
              <Input value={manualProductForm.name} onChange={e => setManualProductForm(f => ({ ...f, name: e.target.value }))} placeholder={isAr ? "مثال: عطر شرقي" : "E.g. Oriental Perfume"} className="rounded-xl text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "الوصف" : "Description"}</Label>
              <Textarea value={manualProductForm.description} onChange={e => setManualProductForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl text-xs min-h-[70px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">{isAr ? "السعر" : "Price"} *</Label>
                <Input type="number" value={manualProductForm.price} onChange={e => setManualProductForm(f => ({ ...f, price: e.target.value }))} placeholder="650" className="rounded-xl text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">{isAr ? "السعر قبل الخصم" : "Compare-at price"}</Label>
                <Input type="number" value={manualProductForm.compareAtPrice} onChange={e => setManualProductForm(f => ({ ...f, compareAtPrice: e.target.value }))} placeholder="750" className="rounded-xl text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">{isAr ? "التصنيف" : "Category"}</Label>
                <Input value={manualProductForm.category} onChange={e => setManualProductForm(f => ({ ...f, category: e.target.value }))} placeholder={isAr ? "عطور" : "Perfumes"} className="rounded-xl text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">{isAr ? "متاح للبيع؟" : "Available?"}</Label>
                <Select value={manualProductForm.stock === "unavailable" ? "unavailable" : "available"} onValueChange={v => setManualProductForm(f => ({ ...f, stock: v }))}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{isAr ? "متاح" : "Available"}</SelectItem>
                    <SelectItem value="unavailable">{isAr ? "غير متاح" : "Unavailable"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "رابط المنتج (اختياري)" : "Product URL (optional)"}</Label>
              <Input value={manualProductForm.url} onChange={e => setManualProductForm(f => ({ ...f, url: e.target.value }))} dir="ltr" placeholder="https://..." className="rounded-xl text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isAr ? "صورة المنتج" : "Product image"}</Label>
              <div className="flex items-center gap-3">
                {manualProductForm.imageUrl && <img src={manualProductForm.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />}
                <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-2.5 text-xs text-gray-500 cursor-pointer hover:border-emerald-400">
                  {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingImage ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع صورة" : "Upload image")}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleProductImageUpload(e.target.files[0])} />
                </label>
              </div>
            </div>

            <button type="button" onClick={() => setShowAdvancedFields(v => !v)} className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              {showAdvancedFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {isAr ? "معلومات إضافية للمساعد" : "Extra info for the assistant"}
            </button>
            {showAdvancedFields && (
              <div>
                <Label className="text-xs mb-1 block">{isAr ? "كلمات مفتاحية (مفصولة بفاصلة)" : "Keywords (comma separated)"}</Label>
                <Input value={manualProductForm.tags} onChange={e => setManualProductForm(f => ({ ...f, tags: e.target.value }))} placeholder={isAr ? "هدايا, VIP, فاخر" : "gifts, VIP, premium"} className="rounded-xl text-sm" />
              </div>
            )}

            <Button onClick={handleAddManualProduct} disabled={addingManualProduct} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs py-5">
              {addingManualProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingProductId ? (isAr ? "حفظ التعديلات" : "Save changes") : (isAr ? "إضافة المنتج" : "Add product"))}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
