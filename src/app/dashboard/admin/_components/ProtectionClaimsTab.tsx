// src/app/dashboard/admin/_components/ProtectionClaimsTab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
  XCircle, Clock, Search, RefreshCw, Plus, ArrowLeft,
  ExternalLink, FileText, Check, X, Loader2, User as UserIcon,
  Phone, Calendar, DollarSign, AlertCircle, Info, Send, Eye,
  HelpCircle, Sparkles, MessageSquare, Layers, CheckSquare
} from "lucide-react";
import type {
  EvidenceSnapshot,
  ComplianceCheckItem,
  RefundCalculation,
  MessageTimelineItem,
  CampaignSummaryItem,
  AutomationSummaryItem,
} from "@/lib/protection/types";

interface ProtectionClaimItem {
  id: string;
  userId: string;
  whatsappAccountId: string;
  phoneNumber: string;
  reportedAt: string;
  banDetectedAt: string;
  status: "NEEDS_REVIEW" | "ELIGIBLE" | "NOT_ELIGIBLE" | "PENDING_EVIDENCE";
  refundAmount: number | null;
  currency: string;
  refundStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  adminNotes: string | null;
  customerNotes: string | null;
  evidenceSnapshot: EvidenceSnapshot | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    brandName: string | null;
    subscription?: {
      plan: string;
      status: string;
    } | null;
  };
  whatsappAccount: {
    id: string;
    phoneNumberId: string;
    wabaId: string;
    tokenStatus: string;
    messagingTier?: number;
  };
  reviewer?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface AccountSearchResult {
  id: string;
  phoneNumberId: string;
  wabaId: string;
  tokenStatus: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    brandName: string | null;
    subscription: {
      plan: string;
      status: string;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
    } | null;
  };
}

interface ProtectionClaimsTabProps {
  locale: string;
  dir: "rtl" | "ltr";
  onNeedsReviewCountChange?: (count: number) => void;
  openCreateRequested?: boolean;
  onResetCreateRequest?: () => void;
}

const STATUS_BADGES: Record<string, { labelAr: string; labelEn: string; bg: string; text: string; icon: any }> = {
  NEEDS_REVIEW: {
    labelAr: "يحتاج مراجعة",
    labelEn: "Needs Review",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  ELIGIBLE: {
    labelAr: "مستحق للضمان",
    labelEn: "Eligible",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  NOT_ELIGIBLE: {
    labelAr: "غير مستحق",
    labelEn: "Not Eligible",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
  PENDING_EVIDENCE: {
    labelAr: "بانتظار أدلة",
    labelEn: "Pending Evidence",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    icon: HelpCircle,
  },
};

export default function ProtectionClaimsTab({
  locale,
  dir,
  onNeedsReviewCountChange,
  openCreateRequested,
  onResetCreateRequest,
}: ProtectionClaimsTabProps) {
  const isAr = locale === "ar";

  // List State
  const [claims, setClaims] = useState<ProtectionClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest_refund">("newest");
  const [totalCount, setTotalCount] = useState(0);

  // Detail View State
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);
  const [timelineMessages, setTimelineMessages] = useState<MessageTimelineItem[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummaryItem[]>([]);
  const [automations, setAutomations] = useState<AutomationSummaryItem[]>([]);
  const [liveRefund, setLiveRefund] = useState<RefundCalculation | null>(null);

  // Decision Form State
  const [decisionStatus, setDecisionStatus] = useState<"ELIGIBLE" | "NOT_ELIGIBLE" | "PENDING_EVIDENCE">("ELIGIBLE");
  const [decisionReason, setDecisionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmountInput, setRefundAmountInput] = useState<string>("");
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  // Create Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchAccountQuery, setSearchAccountQuery] = useState("");
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [accountSearchResults, setAccountSearchResults] = useState<AccountSearchResult[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null);
  const [banDateInput, setBanDateInput] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [customerNotesInput, setCustomerNotesInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [creatingClaim, setCreatingClaim] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Handle external trigger for create
  useEffect(() => {
    if (openCreateRequested) {
      setShowCreateModal(true);
      onResetCreateRequest?.();
    }
  }, [openCreateRequested, onResetCreateRequest]);

  // Fetch Claims List
  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("sort", sortBy);

      const res = await fetch(`/api/admin/protection-claims?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims);
        setTotalCount(data.total);
        if (onNeedsReviewCountChange) {
          onNeedsReviewCountChange(data.needsReviewCount);
        }
      }
    } catch (err) {
      console.error("Failed to fetch claims:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, sortBy, onNeedsReviewCountChange]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Fetch Single Claim Details
  const fetchClaimDetails = async (id: string) => {
    setSelectedClaimId(id);
    setLoadingDetail(true);
    setDecisionError(null);
    setDecisionSuccess(null);
    try {
      const res = await fetch(`/api/admin/protection-claims/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedClaim(data.claim);
        setTimelineMessages(data.timelineMessages || []);
        setRecentCampaigns(data.recentCampaigns || []);
        setAutomations(data.automations || []);
        setLiveRefund(data.liveRefund);

        // Pre-fill decision inputs
        setDecisionStatus(data.claim.status === "NOT_ELIGIBLE" ? "NOT_ELIGIBLE" : "ELIGIBLE");
        setDecisionReason(data.claim.decisionReason || "");
        setAdminNotes(data.claim.adminNotes || "");
        const calculatedAmount = data.claim.refundAmount ?? data.liveRefund?.calculatedRefund ?? 0;
        setRefundAmountInput(calculatedAmount.toString());
      }
    } catch (err) {
      console.error("Failed to fetch claim detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Run or Re-run Protection Audit
  const handleRunAudit = async () => {
    if (!selectedClaimId) return;
    setRunningAudit(true);
    try {
      const res = await fetch(`/api/admin/protection-claims/${selectedClaimId}/audit`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchClaimDetails(selectedClaimId);
        await fetchClaims();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to run audit");
      }
    } catch (err) {
      console.error("Failed to run audit:", err);
    } finally {
      setRunningAudit(false);
    }
  };

  // Submit Admin Decision
  const handleSaveDecision = async () => {
    if (!selectedClaimId) return;
    setDecisionError(null);
    setDecisionSuccess(null);

    if (decisionStatus === "NOT_ELIGIBLE" && !decisionReason.trim()) {
      setDecisionError(isAr ? "سبب القرار إجباري عند رفض الطلب." : "Decision reason is required when rejecting a claim.");
      return;
    }

    setSavingDecision(true);
    try {
      const payload: any = {
        status: decisionStatus,
        decisionReason: decisionReason.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
      };

      if (decisionStatus === "ELIGIBLE") {
        const amt = parseFloat(refundAmountInput);
        payload.refundAmount = isNaN(amt) ? 0 : amt;
        payload.refundStatus = "APPROVED_PENDING_PROCESSING";
      } else if (decisionStatus === "NOT_ELIGIBLE") {
        payload.refundAmount = 0;
        payload.refundStatus = "NONE";
      }

      const res = await fetch(`/api/admin/protection-claims/${selectedClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDecisionSuccess(
          isAr
            ? "تم تسجيل قرار المشرف بنجاح (المبلغ المستحق قيد المعالجة الإدارية)."
            : "Admin decision saved successfully (Refund approved pending administrative processing)."
        );
        await fetchClaimDetails(selectedClaimId);
        await fetchClaims();
      } else {
        const d = await res.json();
        setDecisionError(d.error || (isAr ? "حدث خطأ أثناء حفظ القرار" : "Error saving decision"));
      }
    } catch (err) {
      console.error("Failed to save decision:", err);
      setDecisionError(isAr ? "خطأ في الاتصال بالخادم" : "Server connection error");
    } finally {
      setSavingDecision(false);
    }
  };

  // Account search for creating claim
  useEffect(() => {
    if (!searchAccountQuery.trim()) {
      setAccountSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingAccounts(true);
      try {
        const res = await fetch(
          `/api/admin/protection-claims/search-accounts?query=${encodeURIComponent(searchAccountQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setAccountSearchResults(data.accounts || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearchingAccounts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchAccountQuery]);

  // Create new claim handler
  const handleCreateClaim = async () => {
    if (!selectedAccount) {
      setCreateError(isAr ? "يرجى اختيار حساب WhatsApp مسجل أولاً" : "Please select a registered WhatsApp account");
      return;
    }
    if (!banDateInput) {
      setCreateError(isAr ? "يرجى تحديد تاريخ ووقت الحظر" : "Please specify ban date and time");
      return;
    }

    setCreatingClaim(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/protection-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappAccountId: selectedAccount.id,
          banDetectedAt: new Date(banDateInput).toISOString(),
          customerNotes: customerNotesInput.trim() || undefined,
          adminNotes: adminNotesInput.trim() || undefined,
        }),
      });

      if (res.ok) {
        const newClaim = await res.json();
        setShowCreateModal(false);
        setSelectedAccount(null);
        setSearchAccountQuery("");
        setCustomerNotesInput("");
        setAdminNotesInput("");
        await fetchClaims();
        // Open the newly created claim details view
        if (newClaim?.id) {
          fetchClaimDetails(newClaim.id);
        }
      } else {
        const d = await res.json();
        setCreateError(d.error || (isAr ? "فشل إنشاء الطلب" : "Failed to create claim"));
      }
    } catch (err) {
      console.error("Failed to create claim:", err);
      setCreateError(isAr ? "خطأ في الاتصال بالخادم" : "Server error");
    } finally {
      setCreatingClaim(false);
    }
  };

  const inp =
    "w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#25D366] bg-white transition";
  const btn =
    "flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20b557] transition disabled:opacity-50 shadow-sm";

  // ═══════════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════════════
  if (selectedClaimId) {
    if (loadingDetail) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
          <p className="text-sm text-gray-500">{isAr ? "جاري تحميل بيانات الفحص الشامل..." : "Loading Protection Audit details..."}</p>
        </div>
      );
    }

    if (!selectedClaim) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-500">{isAr ? "لم يتم العثور على الطلب" : "Claim not found"}</p>
          <button onClick={() => setSelectedClaimId(null)} className="mt-4 text-sm text-[#25D366] underline">
            {isAr ? "العودة للقائمة" : "Back to claims"}
          </button>
        </div>
      );
    }

    const snapshot: EvidenceSnapshot | null = selectedClaim.evidenceSnapshot;
    const currentStatusBadge = STATUS_BADGES[selectedClaim.status] || STATUS_BADGES.NEEDS_REVIEW;
    const StatusIcon = currentStatusBadge.icon;

    return (
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedClaimId(null);
                setSelectedClaim(null);
              }}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition text-gray-600 dark:text-gray-300"
              title={isAr ? "رجوع" : "Back"}
            >
              <ArrowLeft className={`w-5 h-5 ${isAr ? "rotate-180" : ""}`} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isAr ? `طلب حماية رقم #${selectedClaim.id.slice(-6).toUpperCase()}` : `Protection Claim #${selectedClaim.id.slice(-6).toUpperCase()}`}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentStatusBadge.bg} ${currentStatusBadge.text}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {isAr ? currentStatusBadge.labelAr : currentStatusBadge.labelEn}
                </span>
                {selectedClaim.refundStatus === "APPROVED_PENDING_PROCESSING" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                    <DollarSign className="w-3 h-3" />
                    {isAr ? "مستحق - بانتظار الصرف" : "Refund Approved - Processing"}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isAr ? "تاريخ البلاغ:" : "Reported:"} {new Date(selectedClaim.reportedAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
                {" • "}
                {isAr ? "تاريخ الحظر المدّعى:" : "Ban detected:"} {new Date(selectedClaim.banDetectedAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRunAudit}
              disabled={runningAudit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${runningAudit ? "animate-spin" : ""}`} />
              {runningAudit ? (isAr ? "جاري الفحص..." : "Running Audit...") : (isAr ? "إعادة تشغيل Protection Audit" : "Run Protection Audit")}
            </button>
          </div>
        </div>

        {/* Customer & Account Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <UserIcon className="w-4 h-4 text-[#25D366]" />
              {isAr ? "بيانات العميل" : "Customer Information"}
            </div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{selectedClaim.user?.name || "بدون اسم"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedClaim.user?.email}</p>
            {selectedClaim.user?.brandName && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                {isAr ? "النشاط:" : "Brand:"} {selectedClaim.user.brandName}
              </p>
            )}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
              <span className="text-gray-400">{isAr ? "الباقة:" : "Plan:"}</span>
              <span className="font-bold text-gray-700 dark:text-gray-300 uppercase">
                {selectedClaim.user?.subscription?.plan || "Free"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <Phone className="w-4 h-4 text-blue-500" />
              {isAr ? "حساب WhatsApp" : "WhatsApp Account"}
            </div>
            <p className="font-mono text-sm text-gray-900 dark:text-white dir-ltr">{selectedClaim.phoneNumber}</p>
            <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">WABA ID: {selectedClaim.whatsappAccount?.wabaId}</p>
            <p className="text-[11px] text-gray-400 font-mono truncate">Phone ID: {selectedClaim.whatsappAccount?.phoneNumberId}</p>
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
              <span className="text-gray-400">{isAr ? "حالة التوكن:" : "Token Status:"}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedClaim.whatsappAccount?.tokenStatus || "UNKNOWN"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              {isAr ? "الضمان والاسترداد التلقائي" : "Guarantee & Refund"}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {selectedClaim.refundAmount ?? liveRefund?.calculatedRefund ?? 0}
              </span>
              <span className="text-xs font-bold text-gray-500">{selectedClaim.currency || "EGP"}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isAr
                ? `متبقي ${liveRefund?.remainingDays ?? 0} يوم من الدورة الشهرية`
                : `${liveRefund?.remainingDays ?? 0} days remaining in current cycle`}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
              <span className="text-gray-400">{isAr ? "المراجع:" : "Reviewed by:"}</span>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {selectedClaim.reviewer?.name || selectedClaim.reviewer?.email || (isAr ? "لم يراجع بعد" : "Pending")}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Notes Banner if provided */}
        {selectedClaim.customerNotes && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold">{isAr ? "ملاحظات وتفاصيل العميل:" : "Customer Notes & Claim Details:"}</p>
              <p className="mt-1 whitespace-pre-wrap">{selectedClaim.customerNotes}</p>
            </div>
          </div>
        )}

        {/* ── System Assessment Recommendation Banner ── */}
        {snapshot && (
          <div
            className={`rounded-2xl p-5 border shadow-sm ${
              snapshot.systemAssessment === "ELIGIBLE"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
                : snapshot.systemAssessment === "NOT_ELIGIBLE"
                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    snapshot.systemAssessment === "ELIGIBLE"
                      ? "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                      : snapshot.systemAssessment === "NOT_ELIGIBLE"
                      ? "bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300"
                      : "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {snapshot.systemAssessment === "ELIGIBLE" ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : snapshot.systemAssessment === "NOT_ELIGIBLE" ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {isAr ? "تقييم النظام الآلي" : "System Assessment"}
                    </span>
                    <span className="text-base font-extrabold uppercase">
                      {snapshot.systemAssessment === "ELIGIBLE"
                        ? isAr ? "مستحق للضمان 🟢" : "ELIGIBLE 🟢"
                        : snapshot.systemAssessment === "NOT_ELIGIBLE"
                        ? isAr ? "غير مستحق 🔴" : "NOT ELIGIBLE 🔴"
                        : isAr ? "يحتاج مراجعة بشرية 🟡" : "NEEDS REVIEW 🟡"}
                    </span>
                  </div>
                  <p className="text-xs mt-1 font-medium">{snapshot.assessmentSummary}</p>
                </div>
              </div>

              <div className="text-[11px] bg-white/60 dark:bg-gray-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 sm:max-w-xs">
                <span className="font-bold block text-gray-800 dark:text-gray-200 mb-0.5">
                  {isAr ? "⚠️ تنبيه للمشرف:" : "⚠️ Admin Notice:"}
                </span>
                {isAr
                  ? "تقييم النظام هو توصية آلية مبنية على سجلات Wani. القرار المالي النهائي يعود للمشرف الإداري."
                  : "System Assessment is an automated recommendation. The Super Admin makes the final binding decision."}
              </div>
            </div>
          </div>
        )}

        {/* ── Compliance Checklist ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#25D366]" />
              {isAr ? "قائمة تدقيق الالتزام والضمان (Compliance Checklist)" : "Guarantee Compliance Checklist"}
            </h3>
            {snapshot && (
              <span className="text-[11px] text-gray-400">
                {isAr ? "فُحص في:" : "Audited at:"} {new Date(snapshot.auditedAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(snapshot?.checklist || []).map((item) => {
              const isPass = item.status === "PASS";
              const isFail = item.status === "FAIL";
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isPass
                      ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                      : isFail
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                      : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {isPass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isFail ? (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
                        {item.subtitle && <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{item.subtitle}</p>}
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{item.details}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                        isPass
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300"
                          : isFail
                          ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-300"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 24-Hour Window & Template Details ── */}
        {snapshot && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                {isAr ? "تحليل نافذة الـ 24 ساعة (24h Window Audit)" : "24h Window Dynamic Audit"}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "الرسائل المفحوصة قبل الحظر:" : "Evaluated Outbound Messages:"}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{snapshot.twentyFourHourWindow.evaluatedCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "داخل نافذة الـ 24 ساعة:" : "Within 24h of Inbound:"}</span>
                  <span className="font-semibold text-emerald-600">{snapshot.twentyFourHourWindow.insideWindowCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "قوالب معتمدة خارج النافذة:" : "Approved Templates Outside 24h:"}</span>
                  <span className="font-semibold text-blue-600">{snapshot.twentyFourHourWindow.templatesOutsideWindowCount}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">{isAr ? "مخالفات رسائل عادية خارج النافذة:" : "Freeform Violations Outside 24h:"}</span>
                  <span className={`font-bold ${snapshot.twentyFourHourWindow.violationsCount > 0 ? "text-rose-600" : "text-gray-600 dark:text-gray-400"}`}>
                    {snapshot.twentyFourHourWindow.violationsCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                {isAr ? "قوالب Meta المسجلة (Templates Compliance)" : "Meta Template Compliance"}
              </h4>
              {snapshot.templateCompliance.templatesFound.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">{isAr ? "لا توجد قوالب مسجلة لهذا الحساب" : "No templates registered"}</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {snapshot.templateCompliance.templatesFound.map((tpl, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{tpl.category} • {tpl.language}</p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tpl.status.toUpperCase() === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300"
                        }`}
                      >
                        {tpl.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Message Timeline ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            {isAr ? "سجل الرسائل الزمني قبل الحظر (Message Timeline)" : "Message Timeline (Prior to Ban)"}
          </h3>

          {timelineMessages.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">{isAr ? "لا توجد رسائل مسجلة قبل تاريخ الحظر" : "No messages found prior to ban"}</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {timelineMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    msg.direction === "inbound"
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40"
                      : msg.windowCompliance === "FAIL"
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                      : "bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        msg.direction === "inbound"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      }`}
                    >
                      {msg.direction === "inbound" ? (isAr ? "وارد" : "Inbound") : (isAr ? "صادر" : "Outbound")}
                    </span>

                    <span className="text-[10px] text-gray-400 font-mono shrink-0">
                      {new Date(msg.time).toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs text-gray-800 dark:text-gray-200 truncate">
                        {msg.contentSnippet || (msg.templateName ? `[Template: ${msg.templateName}]` : `[${msg.type}]`)}
                      </p>
                      {msg.contactPhone && (
                        <p className="text-[10px] text-gray-400 font-mono">
                          {msg.contactPhone} {msg.hoursSinceLastInbound !== null && `(Δ ${msg.hoursSinceLastInbound}h from inbound)`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">{msg.senderType}</span>
                    {msg.direction === "outbound" && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          msg.windowCompliance === "PASS"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                        }`}
                      >
                        {msg.windowCompliance}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Campaigns & Automations Summaries ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              {isAr ? "نشاط الحملات القريبة من الحظر" : "Recent Campaigns (Pre-ban)"}
            </h4>
            {recentCampaigns.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">{isAr ? "لا توجد حملات مسجلة" : "No campaigns found"}</p>
            ) : (
              <div className="space-y-1.5">
                {recentCampaigns.map((c) => (
                  <div key={c.id} className="p-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-[11px] text-end font-mono">
                      <span className="text-emerald-600">{c.sentCount} sent</span>
                      {" • "}
                      <span className="text-rose-500">{c.failedCount} failed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {isAr ? "نشاط الأتمتة (Automations)" : "Active Automations"}
            </h4>
            {automations.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">{isAr ? "لا توجد قواعد أتمتة" : "No automations found"}</p>
            ) : (
              <div className="space-y-1.5">
                {automations.map((a) => (
                  <div key={a.id} className="p-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{a.name}</p>
                      <p className="text-[10px] text-gray-400">{a.triggerType} → {a.replyType}</p>
                    </div>
                    <span className="text-[11px] font-mono text-gray-500">
                      {a.interactionCount} {isAr ? "تفاعل" : "triggers"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Refund Calculation Breakdown ── */}
        {liveRefund && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              {isAr ? "حساب قيمة الاسترداد النسبي (Prorated Refund Calculation)" : "Prorated Refund Calculation Breakdown"}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "الباقة وسعرها الشهري:" : "Plan & Price:"}</span>
                <span className="font-bold text-gray-900 dark:text-white">{liveRefund.plan} ({liveRefund.monthlyPrice} {liveRefund.currency})</span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "فترة الاشتراك الحالية:" : "Subscription Cycle:"}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {liveRefund.subscriptionStart ? new Date(liveRefund.subscriptionStart).toLocaleDateString() : "-"} →{" "}
                  {liveRefund.subscriptionEnd ? new Date(liveRefund.subscriptionEnd).toLocaleDateString() : "-"}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "الأيام المستهلكة / المتبقية:" : "Used / Remaining Days:"}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {liveRefund.usedDays} {isAr ? "مستهلك" : "used"} / <span className="font-bold text-emerald-600">{liveRefund.remainingDays} {isAr ? "متبقي" : "remaining"}</span>
                </span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "المبلغ المستحق تلقائياً:" : "Calculated Refund:"}</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {liveRefund.calculatedRefund} {liveRefund.currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Admin Decision Form ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#25D366]" />
            {isAr ? "قرار المشرف الإداري (Admin Decision)" : "Admin Decision & Guarantee Processing"}
          </h3>

          {decisionSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {decisionSuccess}
            </div>
          )}

          {decisionError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              {decisionError}
            </div>
          )}

          <div className="space-y-4">
            {/* Decision Status Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                {isAr ? "القرار الإداري:" : "Decision:"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "ELIGIBLE",
                    labelAr: "موافقة على الاسترداد (Approve Refund)",
                    labelEn: "Approve Refund",
                    activeClass: "bg-emerald-600 text-white border-emerald-600",
                  },
                  {
                    id: "PENDING_EVIDENCE",
                    labelAr: "طلب أدلة إضافية (Request Evidence)",
                    labelEn: "Request More Evidence",
                    activeClass: "bg-purple-600 text-white border-purple-600",
                  },
                  {
                    id: "NOT_ELIGIBLE",
                    labelAr: "رفض الطلب (Reject Claim)",
                    labelEn: "Reject Claim",
                    activeClass: "bg-rose-600 text-white border-rose-600",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDecisionStatus(opt.id as any)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      decisionStatus === opt.id
                        ? opt.activeClass
                        : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {isAr ? opt.labelAr : opt.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Refund Amount (when approving) */}
            {decisionStatus === "ELIGIBLE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                <div>
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-1 block">
                    {isAr ? "المبلغ المسترد (بالجنيه EGP):" : "Refund Amount (EGP):"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={refundAmountInput}
                    onChange={(e) => setRefundAmountInput(e.target.value)}
                    className={inp}
                  />
                </div>
                <div className="text-xs text-emerald-800 dark:text-emerald-300 flex flex-col justify-center">
                  <span className="font-bold">{isAr ? "تنبيه هام:" : "Important:"}</span>
                  <span>
                    {isAr
                      ? "الموافقة تسجل استحقاق العميل وتضع الطلب في حالة (Approved - Pending Processing) لحين إجراء التحويل المالي المعتمد."
                      : "Approving records eligibility and marks refund status as Approved - Pending Processing."}
                  </span>
                </div>
              </div>
            )}

            {/* Decision Reason (Mandatory when Rejecting) */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "سبب القرار (إجباري عند الرفض):" : "Decision Reason (Mandatory if Rejecting):"}{" "}
                {decisionStatus === "NOT_ELIGIBLE" && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={
                  isAr
                    ? "مثلاً: تم إرسال رسائل ترويجية خارج نافذة الـ 24 ساعة بدون قوالب معتمدة"
                    : "e.g. Non-template outbound messages were sent outside 24h window"
                }
                className={inp}
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "ملاحظات إدارية داخلية (اختياري):" : "Internal Admin Notes (Optional):"}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                placeholder={isAr ? "ملاحظات مرجعية للمشرفين..." : "Internal notes for review..."}
                className={inp}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveDecision}
                disabled={savingDecision}
                className={btn}
              >
                {savingDecision ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isAr ? "حفظ القرار الإداري" : "Submit Decision"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Audit Trail Log ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            {isAr ? "سجل تدقيق الإجراءات (Protection Audit Log)" : "Audit Trail History"}
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {(selectedClaim.auditLogs || []).map((log: any) => (
              <div key={log.id} className="p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">{log.action}</span>
                  {log.result && <span className="text-gray-500 ml-2 font-mono">[{log.result}]</span>}
                  <p className="text-[10px] text-gray-400">
                    {isAr ? "بواسطة:" : "By:"} {log.adminUser?.name || log.adminUser?.email || "Admin"}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">
                  {new Date(log.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Create Modal */}
      {showCreateModal && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm mb-6 animate-in fade-in-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#25D366]" />
              {isAr ? "إنشاء طلب فحص ضمان جديد (Create Protection Claim)" : "Create New Protection Claim"}
            </h2>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedAccount(null);
                setCreateError(null);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {createError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            {/* Account Search & Select */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "البحث عن حساب WhatsApp (بالإيميل، الهاتف، أو Account ID): *" : "Search WhatsApp Account (by email, phone, or Account ID): *"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchAccountQuery}
                  onChange={(e) => setSearchAccountQuery(e.target.value)}
                  placeholder={isAr ? "اكتب للبحث عن حساب مسجل..." : "Type to search registered accounts..."}
                  className={inp}
                />
                {searchingAccounts && (
                  <Loader2 className="w-4 h-4 animate-spin absolute top-3 end-3 text-gray-400" />
                )}
              </div>

              {accountSearchResults.length > 0 && !selectedAccount && (
                <div className="mt-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {accountSearchResults.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccount(acc);
                        setSearchAccountQuery(`${acc.user.email} (${acc.phoneNumberId})`);
                      }}
                      className="w-full p-2.5 text-start hover:bg-gray-50 dark:hover:bg-gray-700/60 transition text-xs flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{acc.user.name || "بدون اسم"} ({acc.user.email})</p>
                        <p className="text-[10px] text-gray-400 font-mono">Phone ID: {acc.phoneNumberId} • WABA: {acc.wabaId}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                        {acc.user.subscription?.plan || "Free"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedAccount && (
                <div className="mt-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-900 dark:text-emerald-300">
                      ✓ {isAr ? "الحساب المحدد:" : "Selected Account:"}
                    </span>{" "}
                    <span className="text-gray-800 dark:text-gray-200">
                      {selectedAccount.user.email} — {selectedAccount.phoneNumberId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccount(null);
                      setSearchAccountQuery("");
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    {isAr ? "تغيير" : "Change"}
                  </button>
                </div>
              )}
            </div>

            {/* Ban Date and Time */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "تاريخ ووقت الحظر المدّعى: *" : "Ban Date & Time: *"}
              </label>
              <input
                type="datetime-local"
                value={banDateInput}
                onChange={(e) => setBanDateInput(e.target.value)}
                className={inp}
              />
            </div>

            {/* Customer Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "تفاصيل وبلاغ العميل:" : "Customer Notes & Reported Context:"}
              </label>
              <textarea
                value={customerNotesInput}
                onChange={(e) => setCustomerNotesInput(e.target.value)}
                rows={2}
                placeholder={isAr ? "تفاصيل ما ذكره العميل حول وقت الحظر وطريقة الاستخدام..." : "Context provided by the customer..."}
                className={inp}
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "ملاحظات إدارية أولية:" : "Initial Admin Notes:"}
              </label>
              <input
                type="text"
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                placeholder={isAr ? "ملاحظات للمشرفين..." : "Notes for reviewers..."}
                className={inp}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleCreateClaim}
                disabled={creatingClaim || !selectedAccount}
                className={btn}
              >
                {creatingClaim ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isAr ? "إنشاء وبدء الفحص الآلي" : "Create & Run Audit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", labelAr: "الكل", labelEn: "All" },
              { id: "NEEDS_REVIEW", labelAr: "يحتاج مراجعة", labelEn: "Needs Review" },
              { id: "ELIGIBLE", labelAr: "مستحق للضمان", labelEn: "Eligible" },
              { id: "NOT_ELIGIBLE", labelAr: "غير مستحق", labelEn: "Not Eligible" },
              { id: "PENDING_EVIDENCE", labelAr: "بانتظار أدلة", labelEn: "Pending Evidence" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  statusFilter === f.id
                    ? "bg-[#25D366] text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {isAr ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className={btn}
          >
            <Plus className="w-4 h-4" />
            {isAr ? "إنشاء Claim جديد" : "New Protection Claim"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "بحث برقم الهاتف، الإيميل، أو Claim ID..." : "Search by phone, email, or Claim ID..."}
              className={inp}
            />
            <Search className="w-4 h-4 absolute top-3 end-3 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-gray-500">
              {totalCount} {isAr ? "طلب مسجل" : "claims total"}
            </span>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={inp + " w-auto text-xs py-1.5 cursor-pointer"}
            >
              <option value="newest">{isAr ? "الأحدث أولاً" : "Newest First"}</option>
              <option value="oldest">{isAr ? "الأقدم أولاً" : "Oldest First"}</option>
              <option value="highest_refund">{isAr ? "الأعلى استرداداً" : "Highest Refund"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "لا توجد طلبات حماية مطابقة" : "No protection claims found"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isAr ? "يمكنك إنشاء طلب جديد باستخدام الزر أعلاه." : "You can create a new claim using the button above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-start">{isAr ? "الطلب" : "Claim"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "العميل" : "Customer"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "رقم الهاتف" : "Phone"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "تاريخ الحظر" : "Ban Date"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "الاسترداد" : "Refund"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "المراجع" : "Reviewer"}</th>
                  <th className="px-4 py-3 text-end">{isAr ? "الإجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {claims.map((claim) => {
                  const badge = STATUS_BADGES[claim.status] || STATUS_BADGES.NEEDS_REVIEW;
                  const IconComp = badge.icon;
                  return (
                    <tr
                      key={claim.id}
                      onClick={() => fetchClaimDetails(claim.id)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                        #{claim.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{claim.user?.name || "بدون اسم"}</p>
                        <p className="text-[11px] text-gray-400">{claim.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300 dir-ltr text-start">
                        {claim.phoneNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                        {new Date(claim.banDetectedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text}`}
                        >
                          <IconComp className="w-3 h-3" />
                          {isAr ? badge.labelAr : badge.labelEn}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {claim.refundAmount !== null ? `${claim.refundAmount} ${claim.currency}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px]">
                        {claim.reviewer?.name || claim.reviewer?.email || "-"}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchClaimDetails(claim.id);
                          }}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 rounded-lg text-xs font-semibold transition"
                        >
                          {isAr ? "مراجعة وفحص" : "Review"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
