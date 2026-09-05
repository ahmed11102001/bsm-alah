"use client";
import { ListRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Plus,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  Layers,
  Shield,
  HelpCircle,
  FileText,
  Sliders,
  TrendingUp,
  Loader2,
  ExternalLink,
  ChevronRight,
  Search,
  Check,
  X,
  Bot,
  User,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TrainingRuleExtractionOutput } from "@/lib/schemas";

export interface AgentTrainingRuleItem {
  id: string;
  userId: string;
  contactId: string | null;
  messageId: string | null;
  feedback: string;
  contextSnapshot: any;
  type: "faq" | "policy" | "customer_issue" | "guardrail" | "sales_behavior" | null;
  content: string | null;
  extractedData: any;
  appliesTo: string | null;
  status: "pending" | "approved" | "rejected";
  confidence: number | null;
  extractionModel: string | null;
  extractionError: string | null;
  appliedTable: string | null;
  appliedRecordId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
}

interface ContextMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isTarget?: boolean;
}

const TYPE_CONFIG = {
  faq: {
    labelAr: "سؤال وجواب",
    labelEn: "FAQ",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-500/20",
    icon: HelpCircle,
  },
  customer_issue: {
    labelAr: "مشكلة خدمة عملاء",
    labelEn: "Customer Issue",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-500/20",
    icon: AlertTriangle,
  },
  policy: {
    labelAr: "سياسة متجر",
    labelEn: "Store Policy",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-500/20",
    icon: FileText,
  },
  guardrail: {
    labelAr: "سلوك وحدود الإيجنت",
    labelEn: "Guardrail",
    color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-500/20",
    icon: Shield,
  },
  sales_behavior: {
    labelAr: "استراتيجية مبيعات",
    labelEn: "Sales Behavior",
    color: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-500/20",
    icon: TrendingUp,
  },
};

export default function AgentTrainingTab({ lang }: { lang: "ar" | "en" }) {
  const isAr = lang === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rules, setRules] = useState<AgentTrainingRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review & Creation Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AgentTrainingRuleItem | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<{ id: string; name: string | null; phone: string } | null>(null);
  const [contextList, setContextList] = useState<ContextMessage[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<TrainingRuleExtractionOutput | null>(null);

  // Undo Dialog
  const [undoRule, setUndoRule] = useState<AgentTrainingRuleItem | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);

  // ── جلب القواعد التدريبية ──
  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`/api/ai-agent/training${q}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error("Failed to fetch training rules:", err);
      toast.error(isAr ? "فشل تحميل سجل التدريب" : "Failed to load training rules");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isAr]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // ── فتح المودال عند وجود query params (contactId, messageId, ruleId) ──
  useEffect(() => {
    const contactId = searchParams.get("contactId");
    const messageId = searchParams.get("messageId");
    const ruleId = searchParams.get("ruleId");

    if (ruleId) {
      // فتح مراجعة لقاعدة موجودة
      fetch(`/api/ai-agent/training/${ruleId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.rule) {
            openReviewRule(data.rule);
          }
        });
    } else if (contactId || messageId) {
      // تدريب جديد مرتبط برسالة/محادثة
      openNewTraining(contactId, messageId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── فتح تدريب جديد مع جلب السياق ──
  const openNewTraining = async (contactId?: string | null, messageId?: string | null) => {
    if (!contactId || !messageId) {
      toast.error(isAr ? "التدريب يجب أن يبدأ من رد فعلي في المحادثات" : "Training must start from an actual chat message");
      router.push("/dashboard/chat");
      return;
    }
    setSelectedRule(null);
    setFeedbackText("");
    setExtractedData(null);
    setActiveContactId(contactId || null);
    setActiveMessageId(messageId || null);
    setContextList([]);
    setModalOpen(true);

    if (contactId) {
      setLoadingContext(true);
      try {
        const q = new URLSearchParams({ contactId });
        if (messageId) q.set("messageId", messageId);
        const res = await fetch(`/api/ai-agent/training/context?${q}`);
        if (res.ok) {
          const data = await res.json();
          setActiveContact(data.contact);
          setContextList(data.contextMessages || []);
        }
      } catch (err) {
        console.error("Failed to load context:", err);
      } finally {
        setLoadingContext(false);
      }
    }
  };

  // ── فتح مراجعة قاعدة موجودة ──
  const openReviewRule = (rule: AgentTrainingRuleItem) => {
    setSelectedRule(rule);
    setFeedbackText(rule.feedback || "");
    setActiveContactId(rule.contactId);
    setActiveMessageId(rule.messageId);
    setActiveContact(rule.contact || null);
    setExtractedData(rule.extractedData || null);

    if (rule.contextSnapshot && Array.isArray(rule.contextSnapshot)) {
      setContextList(rule.contextSnapshot);
    } else {
      setContextList([]);
    }

    setModalOpen(true);
  };

  // ── استدعاء استخراج القاعدة عبر LLM ──
  const handleExtract = async () => {
    if (!activeContactId || !activeMessageId) {
      toast.error(isAr ? "التدريب يجب أن يبدأ من رد فعلي للإيجنت في المحادثات" : "Training must be linked to an agent reply");
      return;
    }

    if (!feedbackText.trim()) {
      toast.error(isAr ? "يرجى كتابة تعليقك أو توجيهك أولاً" : "Please enter your feedback first");
      return;
    }

    setExtracting(true);
    try {
      const res = await fetch("/api/ai-agent/training/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: feedbackText.trim(),
          contactId: activeContactId,
          messageId: activeMessageId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || (isAr ? "فشل استخراج القاعدة" : "Extraction failed"));
        return;
      }

      if (data.rule) {
        setSelectedRule(data.rule);
        setExtractedData(data.rule.extractedData);
        if (data.rule.contextSnapshot && Array.isArray(data.rule.contextSnapshot)) {
          setContextList(data.rule.contextSnapshot);
        }
        toast.success(isAr ? "تم استخراج القاعدة بنجاح! راجعها واعتمدها." : "Rule extracted successfully!");
        fetchRules();
      }
    } catch (err: any) {
      toast.error(isAr ? "حدث خطأ أثناء الاستخراج" : "Error during extraction");
    } finally {
      setExtracting(false);
    }
  };

  // ── اعتماد القاعدة وتطبيقها ──
  const handleApprove = async () => {
    if (!selectedRule && !extractedData) {
      toast.error(isAr ? "لا توجد قاعدة للاعتماد" : "No rule to approve");
      return;
    }

    setSubmitting(true);
    try {
      let targetRuleId = selectedRule?.id;

      // لو تم التعديل على extractedData في الواجهة نمرره كـ overrides
      const overrides = extractedData || undefined;

      if (!targetRuleId) {
        // إذا كان تم الاستخراج حديثاً ولم يتم حفظه بعد كـ ruleId
        toast.error(isAr ? "يرجى استخراج القاعدة أولاً" : "Please extract the rule first");
        return;
      }

      const res = await fetch(`/api/ai-agent/training/${targetRuleId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isAr ? "تم اعتماد القاعدة وتطبيقها بنجاح على النظام! 🚀" : "Rule approved and applied!");
        setModalOpen(false);
        fetchRules();
      } else {
        toast.error(data.error || (isAr ? "فشل اعتماد القاعدة" : "Approval failed"));
      }
    } catch (err) {
      toast.error(isAr ? "حدث خطأ أثناء الاعتماد" : "Error approving rule");
    } finally {
      setSubmitting(false);
    }
  };

  // ── رفض القاعدة ──
  const handleReject = async (ruleId?: string) => {
    const id = ruleId || selectedRule?.id;
    if (!id) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/ai-agent/training/${id}/reject`, {
        method: "POST",
      });

      if (res.ok) {
        toast.info(isAr ? "تم رفض القاعدة ولم يتم تطبيق أي تغيير." : "Rule rejected");
        setModalOpen(false);
        fetchRules();
      } else {
        const data = await res.json();
        toast.error(data.error || (isAr ? "فشل رفض القاعدة" : "Rejection failed"));
      }
    } catch (err) {
      toast.error(isAr ? "حدث خطأ أثناء رفض القاعدة" : "Error rejecting rule");
    } finally {
      setSubmitting(false);
    }
  };

  // ── التراجع عن قاعدة معتمدة ──
  const handleUndo = async () => {
    if (!undoRule) return;

    setUndoLoading(true);
    try {
      const res = await fetch(`/api/ai-agent/training/${undoRule.id}/undo`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isAr ? "تم التراجع عن تطبيق القاعدة وحذفها من النظام بنجاح" : "Rule undone successfully");
        setUndoRule(null);
        fetchRules();
      } else {
        toast.error(data.error || (isAr ? "فشل التراجع عن القاعدة" : "Undo failed"));
      }
    } catch (err) {
      toast.error(isAr ? "حدث خطأ أثناء التراجع" : "Error undoing rule");
    } finally {
      setUndoLoading(false);
    }
  };

  // فلترة القواعد بالبحث
  const filteredRules = rules.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.feedback.toLowerCase().includes(q) ||
      (r.content && r.content.toLowerCase().includes(q)) ||
      (r.contact?.name && r.contact.name.toLowerCase().includes(q)) ||
      (r.contact?.phone && r.contact.phone.includes(q)) ||
      (r.type && r.type.includes(q))
    );
  });

  const pendingCount = rules.filter((r) => r.status === "pending").length;
  const approvedCount = rules.filter((r) => r.status === "approved").length;
  const rejectedCount = rules.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* ── Banner: Back to chat if accessed via URL ── */}
      {activeContactId && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isAr
                ? `تدريب من محادثة ${activeContact?.name || activeContact?.phone || ""}`
                : `Training from conversation ${activeContact?.name || activeContact?.phone || ""}`}
            </span>
          </div>
          <button
            onClick={() => router.push(`/dashboard/chat?contactId=${activeContactId}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm border border-emerald-500/20"
          >
            <span>{isAr ? "الرجوع للمحادثة" : "Back to Chat"}</span>
            <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? "" : "rotate-180"}`} />
          </button>
        </div>
      )}

      {/* ── Header & Action ── */}
      <div className="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {isAr ? "تدريب وني (Human-in-the-Loop)" : "Wani Agent Training"}
                {pendingCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                    {pendingCount} {isAr ? "بانتظار المراجعة" : "Pending"}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isAr
                  ? "اكتب تعليقك على أي رد غير دقيق، وسيقوم الذكاء الاصطناعي باستخراج قاعدة منظمة واعتمادها فوراً في مصادر معرفة وني."
                  : "Review agent replies, provide human feedback, and approve structured rules directly."}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard/chat")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-sm shadow-emerald-500/20 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          {isAr ? "اذهب للمحادثات لاختيار رد" : "Go to chats to pick a reply"}
        </button>
      </div>

      {/* ── Filter Bar & Stats ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl w-fit border border-gray-200/50 dark:border-gray-700/50 text-xs font-semibold">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              statusFilter === "all"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {isAr ? "الكل" : "All"} ({rules.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {isAr ? "قيد المراجعة" : "Pending"} ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === "approved"
                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAr ? "معتمد ومطبق" : "Approved"} ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === "rejected"
                ? "bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            {isAr ? "مرفوض" : "Rejected"} ({rejectedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث في القواعد والتعليقات..." : "Search training rules..."}
            className="rounded-xl text-xs ps-9 bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* ── Training Rules List ── */}
      {loading ? (
        <ListRowsSkeleton rows={4} />
      ) : filteredRules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center text-gray-400 mb-3">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200 text-base mb-1">
            {isAr ? "لا توجد قواعد تدريب في هذه القائمة" : "No training rules found"}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mb-4 leading-relaxed">
            {isAr
              ? "التدريب يبدأ دائمًا من رد فعلي للإيجنت — اذهب للمحادثات، اضغط على زر 'تدريب الإيجنت' عند الرد الذي ترغب في تصحيحه لإضافة وتطبيق قاعدة جديدة."
              : "Training starts from actual agent replies — go to chats and click 'Train Agent' on the reply you want to correct."}
          </p>
          <button
            onClick={() => router.push("/dashboard/chat")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {isAr ? "اذهب للمحادثات لاختيار رد" : "Go to chats to pick a reply"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => {
            const typeInfo = rule.type ? TYPE_CONFIG[rule.type] : null;
            const TypeIcon = typeInfo?.icon || Sparkles;

            return (
              <div
                key={rule.id}
                className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-emerald-400/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {rule.status === "pending" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        {isAr ? "قيد المراجعة" : "Pending Review"}
                      </span>
                    )}
                    {rule.status === "approved" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {isAr ? "معتمد ومطبق" : "Applied"} ({rule.appliedTable})
                      </span>
                    )}
                    {rule.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        {isAr ? "مرفوض" : "Rejected"}
                      </span>
                    )}

                    {/* Rule Type Badge */}
                    {typeInfo && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeInfo.color}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {isAr ? typeInfo.labelAr : typeInfo.labelEn}
                      </span>
                    )}

                    {/* Confidence */}
                    {rule.confidence !== null && rule.confidence !== undefined && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          rule.confidence >= 0.7
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {isAr ? "ثقة" : "Confidence"}: {Math.round(rule.confidence * 100)}%
                      </span>
                    )}

                    {/* Timestamp */}
                    <span className="text-[11px] text-gray-400">
                      {new Date(rule.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Feedback text */}
                  <div>
                    <div className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-semibold line-clamp-2">
                      <span className="text-emerald-500 font-bold">💬 {isAr ? "تعليقك:" : "Feedback:"}</span>
                      <span>"{rule.feedback}"</span>
                    </div>

                    {/* Extracted Rule preview */}
                    {rule.content && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-1.5 border border-gray-100 dark:border-gray-700 font-mono whitespace-pre-wrap line-clamp-2">
                        {rule.content}
                      </div>
                    )}
                  </div>

                  {/* Conversation Source Link */}
                  {rule.contactId && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() => router.push(`/dashboard/chat?contactId=${rule.contactId}`)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>
                          {isAr
                            ? `من محادثة مع: ${rule.contact?.name || rule.contact?.phone || "عميل"}`
                            : `From chat with: ${rule.contact?.name || rule.contact?.phone || "Customer"}`}
                        </span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  {rule.status === "pending" && (
                    <>
                      <button
                        onClick={() => openReviewRule(rule)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isAr ? "مراجعة واعتماد" : "Review & Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(rule.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                        title={isAr ? "رفض" : "Reject"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {rule.status === "approved" && (
                    <button
                      onClick={() => setUndoRule(rule)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isAr ? "تراجع (Undo)" : "Undo"}
                    </button>
                  )}

                  {rule.status === "rejected" && (
                    <button
                      onClick={() => openReviewRule(rule)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition-all"
                    >
                      {isAr ? "إعادة فتح" : "Re-open"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── Review & Creation Modal ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              {selectedRule
                ? isAr
                  ? "مراجعة واعتماد قاعدة التدريب"
                  : "Review & Approve Training Rule"
                : isAr
                ? "إضافة تدريب جديد لـ وني"
                : "New Training Feedback"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isAr
                ? "راجع سياق المحادثة وتعليقك، ثم تأكد من صياغة القاعدة المستخرجة قبل اعتمادها."
                : "Check conversation context, provide feedback, and confirm the extracted rule."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. السياق (Context Snapshot / Messages) */}
            {contextList.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    {isAr ? "سياق الرسائل في المحادثة" : "Conversation Context"}
                  </span>
                  {activeContact && (
                    <span className="text-[11px] text-gray-400 font-normal">
                      {activeContact.name || activeContact.phone}
                    </span>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-3.5 border border-gray-200/80 dark:border-gray-800 space-y-2.5 max-h-52 overflow-y-auto text-xs">
                  {loadingContext ? (
                    <div className="py-6 flex items-center justify-center text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : (
                    contextList.map((m, idx) => {
                      const isAi = m.role === "assistant";
                      return (
                        <div
                          key={idx}
                          className={`flex gap-2 items-start ${isAi ? "justify-start" : "justify-end"}`}
                        >
                          {isAi && (
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-3.5 py-2 max-w-[82%] leading-relaxed ${
                              m.isTarget
                                ? "bg-amber-50 dark:bg-amber-950/50 border border-amber-400 text-amber-900 dark:text-amber-100 font-medium"
                                : isAi
                                ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                                : "bg-emerald-500 text-white"
                            }`}
                          >
                            <div className="text-[10px] font-bold opacity-70 mb-0.5">
                              {isAi
                                ? isAr
                                  ? "رد وني" + (m.isTarget ? " (الرسالة التي حدث عندها الخطأ)" : "")
                                  : "Wani"
                                : isAr
                                ? "رسالة العميل"
                                : "Customer"}
                            </div>
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          </div>
                          {!isAi && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 2. تعليق المستخدم (Feedback Textarea) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <span>💬 {isAr ? "تعليقك / التوجيه الصحيح" : "Your Feedback / Correct Instruction"}</span>
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  isAr
                    ? "مثال: لو العميل سأل عن الشحن لمحافظات الصعيد، قوله التوصيل بـ 60 ج وبيوصل خلال 3 أيام عمل..."
                    : "E.g. If customer asks about shipping to Upper Egypt, reply that it costs 60 EGP and takes 3 business days..."
                }
                className="rounded-2xl text-xs min-h-[85px] leading-relaxed"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-400">
                  {isAr ? "اكتب بلهجتك العادية، والذكاء الاصطناعي سيصيغها كقاعدة." : "Write normally, AI will extract the rule."}
                </span>
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || !feedbackText.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all"
                >
                  {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isAr ? "استخراج القاعدة المقترحة (LLM)" : "Extract Rule"}
                </button>
              </div>
            </div>

            {/* 3. القاعدة المستخرجة القابلة للتعديل (Extracted Rule Form) */}
            {extractedData && (
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      {isAr ? "القاعدة المقترحة (يمكنك التعديل عليها):" : "Extracted Rule (Editable):"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        TYPE_CONFIG[extractedData.type]?.color || ""
                      }`}
                    >
                      {isAr ? TYPE_CONFIG[extractedData.type]?.labelAr : TYPE_CONFIG[extractedData.type]?.labelEn}
                    </span>
                  </div>

                  {extractedData.confidence !== undefined && (
                    <span className="text-[11px] font-semibold text-gray-500">
                      {isAr ? "نسبة الثقة:" : "Confidence:"} {Math.round(extractedData.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* تنبيه إذا كانت الثقة منخفضة أو يوجد توضيح مطلوب */}
                {(extractedData.confidence < 0.6 || extractedData.clarificationNeeded) && (
                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 text-amber-800 dark:text-amber-200 p-3 rounded-xl text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{isAr ? "تنبيه دقة الاستخراج:" : "Accuracy Notice:"}</div>
                      <div>
                        {extractedData.clarificationNeeded ||
                          (isAr
                            ? "نسبة الثقة منخفضة نسبياً، يُفضل مراجعة الصياغة وتعديلها يدوياً قبل الاعتماد."
                            : "Confidence is low. Please review and adjust the text before approving.")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form based on type */}
                {extractedData.type === "faq" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs mb-1 block font-semibold">{isAr ? "السؤال" : "Question"}</Label>
                      <Input
                        value={extractedData.question}
                        onChange={(e) =>
                          setExtractedData((prev) => (prev && prev.type === "faq" ? { ...prev, question: e.target.value } : prev))
                        }
                        className="rounded-xl text-xs bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block font-semibold">{isAr ? "الإجابة" : "Answer"}</Label>
                      <Textarea
                        value={extractedData.answer}
                        onChange={(e) =>
                          setExtractedData((prev) => (prev && prev.type === "faq" ? { ...prev, answer: e.target.value } : prev))
                        }
                        className="rounded-xl text-xs min-h-[75px] bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                )}

                {extractedData.type === "customer_issue" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs mb-1 block font-semibold">{isAr ? "المشكلة" : "Problem"}</Label>
                      <Input
                        value={extractedData.problem}
                        onChange={(e) =>
                          setExtractedData((prev) =>
                            prev && prev.type === "customer_issue" ? { ...prev, problem: e.target.value } : prev
                          )
                        }
                        className="rounded-xl text-xs bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block font-semibold">{isAr ? "الحل / الإجراء" : "Resolution"}</Label>
                      <Textarea
                        value={extractedData.resolution}
                        onChange={(e) =>
                          setExtractedData((prev) =>
                            prev && prev.type === "customer_issue" ? { ...prev, resolution: e.target.value } : prev
                          )
                        }
                        className="rounded-xl text-xs min-h-[75px] bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                )}

                {extractedData.type === "policy" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block font-semibold">{isAr ? "عنوان السياسة" : "Policy Title"}</Label>
                        <Input
                          value={extractedData.title}
                          onChange={(e) =>
                            setExtractedData((prev) =>
                              prev && prev.type === "policy" ? { ...prev, title: e.target.value } : prev
                            )
                          }
                          className="rounded-xl text-xs bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block font-semibold">{isAr ? "نوع السياسة" : "Policy Type"}</Label>
                        <Select
                          value={extractedData.policyType}
                          onValueChange={(val: any) =>
                            setExtractedData((prev) =>
                              prev && prev.type === "policy" ? { ...prev, policyType: val } : prev
                            )
                          }
                        >
                          <SelectTrigger className="rounded-xl text-xs bg-white dark:bg-gray-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="return_policy">{isAr ? "سياسة الاسترجاع والاستبدال" : "Return & Exchange"}</SelectItem>
                            <SelectItem value="shipping_policy">{isAr ? "سياسة الشحن والتوصيل" : "Shipping Policy"}</SelectItem>
                            <SelectItem value="payment_policy">{isAr ? "طرق وسياسة الدفع" : "Payment Policy"}</SelectItem>
                            <SelectItem value="warranty_policy">{isAr ? "سياسة الضمان" : "Warranty Policy"}</SelectItem>
                            <SelectItem value="privacy_policy">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</SelectItem>
                            <SelectItem value="custom">{isAr ? "سياسة مخصصة" : "Custom Policy"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block font-semibold">{isAr ? "محتوى السياسة" : "Policy Content"}</Label>
                      <Textarea
                        value={extractedData.content}
                        onChange={(e) =>
                          setExtractedData((prev) =>
                            prev && prev.type === "policy" ? { ...prev, content: e.target.value } : prev
                          )
                        }
                        className="rounded-xl text-xs min-h-[75px] bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                )}

                {extractedData.type === "guardrail" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs mb-1 block font-semibold">{isAr ? "نص القاعدة / القيد السلوكي" : "Guardrail Rule"}</Label>
                      <Textarea
                        value={extractedData.content}
                        onChange={(e) =>
                          setExtractedData((prev) =>
                            prev && prev.type === "guardrail" ? { ...prev, content: e.target.value } : prev
                          )
                        }
                        className="rounded-xl text-xs min-h-[75px] bg-white dark:bg-gray-800 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {extractedData.type === "sales_behavior" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block font-semibold">{isAr ? "خاصية السلوك" : "Behavior Field"}</Label>
                        <Select
                          value={extractedData.field}
                          onValueChange={(val: any) =>
                            setExtractedData((prev) =>
                              prev && prev.type === "sales_behavior" ? { ...prev, field: val } : prev
                            )
                          }
                        >
                          <SelectTrigger className="rounded-xl text-xs bg-white dark:bg-gray-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="suggestAlternatives">{isAr ? "اقتراح بدائل عند نفاذ المخزون" : "Suggest Alternatives"}</SelectItem>
                            <SelectItem value="suggestUpsell">{isAr ? "اقتراح منتجات أعلى (Upsell)" : "Suggest Upsell"}</SelectItem>
                            <SelectItem value="suggestCrossSell">{isAr ? "اقتراح منتجات مكملة (Cross-sell)" : "Suggest Cross-sell"}</SelectItem>
                            <SelectItem value="suggestDiscounts">{isAr ? "ذكر الخصومات والعروض" : "Suggest Discounts"}</SelectItem>
                            <SelectItem value="maxSuggestedProducts">{isAr ? "أقصى عدد منتجات مقترحة" : "Max Suggested Products"}</SelectItem>
                            <SelectItem value="goal">{isAr ? "هدف الإيجنت الرئيسي" : "Sales Goal"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block font-semibold">{isAr ? "القيمة الجديدة" : "New Value"}</Label>
                        {typeof extractedData.value === "boolean" ? (
                          <div className="flex items-center gap-2 pt-2">
                            <Switch
                              checked={extractedData.value}
                              onCheckedChange={(c) =>
                                setExtractedData((prev) =>
                                  prev && prev.type === "sales_behavior" ? { ...prev, value: c } : prev
                                )
                              }
                            />
                            <span className="text-xs font-bold">
                              {extractedData.value ? (isAr ? "مفعّل" : "Enabled") : (isAr ? "معطّل" : "Disabled")}
                            </span>
                          </div>
                        ) : typeof extractedData.value === "number" ? (
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={extractedData.value}
                            onChange={(e) =>
                              setExtractedData((prev) =>
                                prev && prev.type === "sales_behavior" ? { ...prev, value: Number(e.target.value) } : prev
                              )
                            }
                            className="rounded-xl text-xs bg-white dark:bg-gray-800"
                          />
                        ) : (
                          <Input
                            value={String(extractedData.value)}
                            onChange={(e) =>
                              setExtractedData((prev) =>
                                prev && prev.type === "sales_behavior" ? { ...prev, value: e.target.value } : prev
                              )
                            }
                            className="rounded-xl text-xs bg-white dark:bg-gray-800"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedRule?.status === "pending" && (
                <button
                  type="button"
                  onClick={() => handleReject()}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                >
                  {isAr ? "رفض القاعدة" : "Reject"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                {isAr ? "إغلاق" : "Cancel"}
              </button>

              {extractedData && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {isAr ? "اعتماد وتطبيق القاعدة فوراً 🚀" : "Approve & Apply Rule"}
                </button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── Undo Confirmation Dialog ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!undoRule} onOpenChange={(o) => !o && setUndoRule(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-600">
              <RotateCcw className="w-5 h-5" />
              {isAr ? "تأكيد التراجع عن تطبيق القاعدة" : "Confirm Undo Rule"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              {isAr
                ? `سيتم حذف القاعدة من جدول (${undoRule?.appliedTable}) وإعادتها لقائمة المراجعة.`
                : `This will remove the applied record from ${undoRule?.appliedTable} and reset status to pending.`}
            </DialogDescription>
          </DialogHeader>

          {undoRule && (
            <div className="bg-gray-50 dark:bg-gray-800/80 p-3.5 rounded-2xl text-xs border border-gray-200/80 dark:border-gray-700 font-mono text-gray-700 dark:text-gray-300">
              {undoRule.content}
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUndoRule(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {undoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {isAr ? "تأكيد التراجع" : "Confirm Undo"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
