// src/app/dashboard/admin/_components/ProtectionClaimsTab.tsx
"use client";
import { DetailPanelSkeleton, TableRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
  XCircle, Clock, Search, RefreshCw, Plus, ArrowLeft,
  ExternalLink, FileText, Check, X, Loader2, User as UserIcon,
  Phone, Calendar, DollarSign, AlertCircle, Info, Send, Eye,
  HelpCircle, Sparkles, MessageSquare, Layers, CheckSquare,
  Upload, Edit3, ChevronDown, ChevronUp, Trash2
} from "lucide-react";
import type {
  EvidenceSnapshot,
  ComplianceCheckItem,
  RefundCalculation,
  MessageTimelineItem,
  CampaignSummaryItem,
  AutomationSummaryItem,
  CustomerEvidenceItem,
} from "@/lib/protection/types";

interface ProtectionClaimItem {
  id: string;
  userId: string;
  whatsappAccountId: string;
  phoneNumber: string;
  reportedAt: string;
  banDetectedAt: string;
  banStatus?: string;
  status: "NEEDS_REVIEW" | "ELIGIBLE" | "NOT_ELIGIBLE" | "PENDING_EVIDENCE";
  calculatedRefund?: number | null;
  overrideRefund?: number | null;
  overrideReason?: string | null;
  refundAmount: number | null;
  currency: string;
  refundStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  adminNotes: string | null;
  customerNotes: string | null;
  evidenceSnapshot: EvidenceSnapshot | null;
  evidenceFiles?: CustomerEvidenceItem[] | null;
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
    labelAr: "ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©",
    labelEn: "Needs Review",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  ELIGIBLE: {
    labelAr: "Ù…Ø³ØªØ­Ù‚ Ù„Ù„Ø¶Ù…Ø§Ù†",
    labelEn: "Eligible",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  NOT_ELIGIBLE: {
    labelAr: "ØºÙŠØ± Ù…Ø³ØªØ­Ù‚",
    labelEn: "Not Eligible",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
  PENDING_EVIDENCE: {
    labelAr: "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø£Ø¯Ù„Ø©",
    labelEn: "Pending Evidence",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    icon: HelpCircle,
  },
};

const BAN_STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  CUSTOMER_REPORTED: { ar: "Ø¨Ù„Ø§Øº Ø¹Ù…ÙŠÙ„", en: "Customer Reported", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  EVIDENCE_PROVIDED: { ar: "ØªÙ… ØªÙ‚Ø¯ÙŠÙ… Ø£Ø¯Ù„Ø©", en: "Evidence Provided", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  VERIFIED: { ar: "ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚", en: "Verified", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  NOT_VERIFIED: { ar: "Ù„Ù… ÙŠØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚", en: "Not Verified", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
};

const EVIDENCE_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  BAN_SCREENSHOT: { ar: "Ù„Ù‚Ø·Ø© Ø´Ø§Ø´Ø© Ø§Ù„Ø­Ø¸Ø±", en: "Meta Ban Screenshot" },
  META_RESTRICTION: { ar: "Ø¯Ù„ÙŠÙ„ ØªÙ‚ÙŠÙŠØ¯ Meta", en: "Meta Restriction Evidence" },
  OPT_IN_PROOF: { ar: "Ø¥Ø«Ø¨Ø§Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©", en: "Opt-in Evidence" },
  NO_EXTERNAL_PROVIDER_DECLARATION: { ar: "Ø¥Ù‚Ø±Ø§Ø± Ø¹Ø¯Ù… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø²ÙˆØ¯ Ø¢Ø®Ø±", en: "No External Provider Declaration" },
  OTHER: { ar: "Ø£Ø¯Ù„Ø© Ø£Ø®Ø±Ù‰", en: "Other Supporting Evidence" },
};

/** Safely format a date string, never show "Invalid Date" */
function formatDate(d: string | Date | null | undefined, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "Unknown time";
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
      timeZone: "Africa/Cairo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...opts,
    });
  } catch {
    return "Unknown time";
  }
}

/** Short date only */
function formatShortDate(d: string | Date | null | undefined, locale: string): string {
  if (!d) return "Unknown";
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      timeZone: "Africa/Cairo",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

/** Time only */
function formatTime(d: string | Date | null | undefined, locale: string): string {
  if (!d) return "--:--";
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

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
  const [timelineMessages, setTimelineMessages] = useState<any[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummaryItem[]>([]);
  const [automations, setAutomations] = useState<AutomationSummaryItem[]>([]);
  const [liveRefund, setLiveRefund] = useState<RefundCalculation | null>(null);

  // Decision Form State
  const [decisionStatus, setDecisionStatus] = useState<"ELIGIBLE" | "NOT_ELIGIBLE" | "PENDING_EVIDENCE">("ELIGIBLE");
  const [decisionReason, setDecisionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [evidenceRequested, setEvidenceRequested] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  // Confirmation Dialog
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);

  // Override Refund
  const [showOverride, setShowOverride] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Ban Status
  const [updatingBanStatus, setUpdatingBanStatus] = useState(false);

  // Evidence Upload
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState("BAN_SCREENSHOT");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setShowOverride(false);
    setShowEvidenceForm(false);
    setShowConfirmApprove(false);
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

  // Submit Admin Decision (with confirmation check for ELIGIBLE with UNKNOWN)
  const handleSaveDecision = async (confirmed = false) => {
    if (!selectedClaimId) return;
    setDecisionError(null);
    setDecisionSuccess(null);

    if (decisionStatus === "NOT_ELIGIBLE" && !decisionReason.trim()) {
      setDecisionError(isAr ? "Ø³Ø¨Ø¨ Ø§Ù„Ù‚Ø±Ø§Ø± Ø¥Ø¬Ø¨Ø§Ø±ÙŠ Ø¹Ù†Ø¯ Ø±ÙØ¶ Ø§Ù„Ø·Ù„Ø¨." : "Decision reason is required when rejecting a claim.");
      return;
    }

    // Check for UNKNOWN/NEEDS_EVIDENCE on approval â†’ show confirmation
    if (decisionStatus === "ELIGIBLE" && !confirmed) {
      const snapshot: EvidenceSnapshot | null = selectedClaim?.evidenceSnapshot;
      if (snapshot?.checklist) {
        const unclearChecks = snapshot.checklist.filter(
          (c) => c.status === "UNKNOWN" || c.status === "NEEDS EVIDENCE" || c.status === "NEEDS_EVIDENCE"
        );
        if (unclearChecks.length > 0 || snapshot.systemAssessment === "NEEDS_REVIEW") {
          setShowConfirmApprove(true);
          return;
        }
      }
    }

    setSavingDecision(true);
    setShowConfirmApprove(false);
    try {
      const payload: any = {
        status: decisionStatus,
        decisionReason: decisionReason.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
        confirmOverride: confirmed || false,
      };

      if (decisionStatus === "ELIGIBLE") {
        const calc = liveRefund?.calculatedRefund ?? selectedClaim?.calculatedRefund ?? 0;
        payload.refundAmount = selectedClaim?.overrideRefund ?? calc;
        payload.refundStatus = "APPROVED_PENDING_PROCESSING";
      } else if (decisionStatus === "NOT_ELIGIBLE") {
        payload.refundAmount = 0;
        payload.refundStatus = "NONE";
      } else if (decisionStatus === "PENDING_EVIDENCE") {
        payload.evidenceRequested = evidenceRequested.trim() || undefined;
      }

      const res = await fetch(`/api/admin/protection-claims/${selectedClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDecisionSuccess(
          isAr
            ? "ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø´Ø±Ù Ø¨Ù†Ø¬Ø§Ø­ (Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø³ØªØ­Ù‚ Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©)."
            : "Admin decision saved successfully (Refund approved pending administrative processing)."
        );
        await fetchClaimDetails(selectedClaimId);
        await fetchClaims();
      } else {
        const d = await res.json();
        setDecisionError(d.error || (isAr ? "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ù‚Ø±Ø§Ø±" : "Error saving decision"));
      }
    } catch (err) {
      console.error("Failed to save decision:", err);
      setDecisionError(isAr ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù…" : "Server connection error");
    } finally {
      setSavingDecision(false);
    }
  };

  // Ban Status Update
  const handleBanStatusUpdate = async (newStatus: string) => {
    if (!selectedClaimId) return;
    setUpdatingBanStatus(true);
    try {
      const res = await fetch(`/api/admin/protection-claims/${selectedClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action: "update_ban_status", banStatus: newStatus }),
      });
      if (res.ok) {
        await fetchClaimDetails(selectedClaimId);
      }
    } catch (err) {
      console.error("Ban status update failed:", err);
    } finally {
      setUpdatingBanStatus(false);
    }
  };

  // Refund Override
  const handleOverrideSubmit = async () => {
    if (!selectedClaimId || !overrideAmount.trim() || !overrideReason.trim()) return;
    setSavingOverride(true);
    try {
      const res = await fetch(`/api/admin/protection-claims/${selectedClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _action: "refund_override",
          overrideRefund: parseFloat(overrideAmount),
          overrideReason: overrideReason.trim(),
        }),
      });
      if (res.ok) {
        setShowOverride(false);
        setOverrideAmount("");
        setOverrideReason("");
        await fetchClaimDetails(selectedClaimId);
      }
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setSavingOverride(false);
    }
  };

  // Evidence Upload
  const handleEvidenceSubmit = async () => {
    if (!selectedClaimId) return;
    setUploadingEvidence(true);
    try {
      if (evidenceFile) {
        const form = new FormData();
        form.append("file", evidenceFile);
        form.append("type", evidenceType);
        form.append("note", evidenceNote);
        form.append("name", evidenceFile.name);
        const res = await fetch(`/api/admin/protection-claims/${selectedClaimId}/evidence`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error || "Upload failed");
        }
      } else {
        const res = await fetch(`/api/admin/protection-claims/${selectedClaimId}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: evidenceType, note: evidenceNote || undefined }),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error || "Failed to add evidence");
        }
      }
      setShowEvidenceForm(false);
      setEvidenceFile(null);
      setEvidenceNote("");
      setEvidenceType("BAN_SCREENSHOT");
      await fetchClaimDetails(selectedClaimId);
    } catch (err) {
      console.error("Evidence submit failed:", err);
    } finally {
      setUploadingEvidence(false);
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
      setCreateError(isAr ? "ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø­Ø³Ø§Ø¨ WhatsApp Ù…Ø³Ø¬Ù„ Ø£ÙˆÙ„Ø§Ù‹" : "Please select a registered WhatsApp account");
      return;
    }
    if (!banDateInput) {
      setCreateError(isAr ? "ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ ØªØ§Ø±ÙŠØ® ÙˆÙˆÙ‚Øª Ø§Ù„Ø­Ø¸Ø±" : "Please specify ban date and time");
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
        if (newClaim?.id) {
          fetchClaimDetails(newClaim.id);
        }
      } else {
        const d = await res.json();
        setCreateError(d.error || (isAr ? "ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨" : "Failed to create claim"));
      }
    } catch (err) {
      console.error("Failed to create claim:", err);
      setCreateError(isAr ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù…" : "Server error");
    } finally {
      setCreatingClaim(false);
    }
  };

  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);

  const handleDeleteClaim = async (claimId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmMsg = isAr
      ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø·Ù„Ø¨ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§ØªØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡."
      : "Are you sure you want to permanently delete this protection claim from the database? This action cannot be undone.";
    if (!window.confirm(confirmMsg)) return;

    setDeletingClaimId(claimId);
    try {
      const res = await fetch(`/api/admin/protection-claims/${claimId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setClaims((prev) => prev.filter((c) => c.id !== claimId));
        setTotalCount((prev) => Math.max(0, prev - 1));
        const target = claims.find((c) => c.id === claimId);
        if (target?.status === "NEEDS_REVIEW" && onNeedsReviewCountChange) {
          const remainingNeedsReview = claims.filter((c) => c.id !== claimId && c.status === "NEEDS_REVIEW").length;
          onNeedsReviewCountChange(remainingNeedsReview);
        }
        if (selectedClaimId === claimId) {
          setSelectedClaimId(null);
          setSelectedClaim(null);
        }
      } else {
        const d = await res.json();
        alert(d.error || (isAr ? "ÙØ´Ù„ Ø­Ø°Ù Ø§Ù„Ø·Ù„Ø¨" : "Failed to delete claim"));
      }
    } catch (err) {
      console.error("Failed to delete claim:", err);
      alert(isAr ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù…" : "Server error");
    } finally {
      setDeletingClaimId(null);
    }
  };

  const inp =
    "w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white transition";
  const btn =
    "flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 shadow-sm";

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DETAIL VIEW
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (selectedClaimId) {
    if (loadingDetail) {
      return <DetailPanelSkeleton />;
    }

    if (!selectedClaim) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-500">{isAr ? "Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø·Ù„Ø¨" : "Claim not found"}</p>
          <button onClick={() => setSelectedClaimId(null)} className="mt-4 text-sm text-primary underline">
            {isAr ? "Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ù‚Ø§Ø¦Ù…Ø©" : "Back to claims"}
          </button>
        </div>
      );
    }

    const snapshot: EvidenceSnapshot | null = selectedClaim.evidenceSnapshot;
    const currentStatusBadge = STATUS_BADGES[selectedClaim.status] || STATUS_BADGES.NEEDS_REVIEW;
    const StatusIcon = currentStatusBadge.icon;
    const banStatusInfo = BAN_STATUS_LABELS[selectedClaim.banStatus || "CUSTOMER_REPORTED"] || BAN_STATUS_LABELS.CUSTOMER_REPORTED;
    const evidenceFiles: CustomerEvidenceItem[] = (selectedClaim.evidenceFiles as CustomerEvidenceItem[]) || [];

    // Effective refund = override or calculated
    const effectiveRefund = selectedClaim.overrideRefund ?? selectedClaim.calculatedRefund ?? liveRefund?.calculatedRefund ?? 0;

    return (
      <div className="space-y-6">
        {/* â”€â”€ Confirmation Dialog for Approve with UNKNOWN â”€â”€ */}
        {showConfirmApprove && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowConfirmApprove(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  {isAr ? "ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯" : "Confirm Refund Approval"}
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                {isAr
                  ? "Ø¨Ø¹Ø¶ ÙØ­ÙˆØµØ§Øª Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ù…Ø§ Ø²Ø§Ù„Øª ØªØ­ØªØ§Ø¬ ØªØ­Ù‚Ù‚ ÙŠØ¯ÙˆÙŠ:"
                  : "Some compliance checks still require manual verification:"}
              </p>
              <div className="space-y-1.5 mb-4">
                {(snapshot?.checklist || [])
                  .filter((c) => c.status === "UNKNOWN" || c.status === "NEEDS EVIDENCE" || c.status === "NEEDS_EVIDENCE")
                  .map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{c.title}:</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{c.status}</span>
                    </div>
                  ))}
              </div>
              {snapshot?.systemAssessment === "NEEDS_REVIEW" && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-4 font-semibold">
                  {isAr ? "ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ø­Ø§Ù„ÙŠ: NEEDS REVIEW ðŸŸ¡" : "System assessment is currently: NEEDS REVIEW ðŸŸ¡"}
                </p>
              )}
              <p className="text-xs text-gray-500 mb-4">
                {isAr ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ø£Ù†Ùƒ ØªØ±ÙŠØ¯ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯ØŸ" : "Are you sure you want to approve this refund?"}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowConfirmApprove(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {isAr ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
                </button>
                <button
                  onClick={() => handleSaveDecision(true)}
                  disabled={savingDecision}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {isAr ? "ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯" : "Confirm Approve Refund"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedClaimId(null);
                setSelectedClaim(null);
              }}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition text-gray-600 dark:text-gray-300"
              title={isAr ? "Ø±Ø¬ÙˆØ¹" : "Back"}
            >
              <ArrowLeft className={`w-5 h-5 ${isAr ? "rotate-180" : ""}`} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isAr ? `Ø·Ù„Ø¨ Ø­Ù…Ø§ÙŠØ© Ø±Ù‚Ù… #${selectedClaim.id.slice(-6).toUpperCase()}` : `Protection Claim #${selectedClaim.id.slice(-6).toUpperCase()}`}
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
                    {isAr ? "Ù…Ø³ØªØ­Ù‚ - Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØµØ±Ù" : "Refund Approved - Processing"}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isAr ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ù„Ø§Øº:" : "Reported:"} {formatDate(selectedClaim.reportedAt, locale)}
                {" â€¢ "}
                {isAr ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø­Ø¸Ø± Ø§Ù„Ù…Ø¯Ù‘Ø¹Ù‰:" : "Claimed ban date:"} {formatDate(selectedClaim.banDetectedAt, locale)}
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
              {runningAudit ? (isAr ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ÙØ­Øµ..." : "Running Audit...") : (isAr ? "Ø¥Ø¹Ø§Ø¯Ø© ØªØ´ØºÙŠÙ„ Protection Audit" : "Run Protection Audit")}
            </button>
            <button
              onClick={() => handleDeleteClaim(selectedClaim.id)}
              disabled={deletingClaimId === selectedClaim.id}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 transition disabled:opacity-50"
              title={isAr ? "Ø­Ø°Ù Ø§Ù„Ø·Ù„Ø¨ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹" : "Delete Claim"}
            >
              {deletingClaimId === selectedClaim.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isAr ? "Ø­Ø°Ù Ø§Ù„Ø·Ù„Ø¨" : "Delete Claim"}
            </button>
          </div>
        </div>

        {/* â”€â”€ Key Summary Bar: Status, Ban, Assessment, Refund â”€â”€ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{isAr ? "Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨" : "Claim Status"}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${currentStatusBadge.bg} ${currentStatusBadge.text}`}>
              <StatusIcon className="w-3 h-3" />
              {isAr ? currentStatusBadge.labelAr : currentStatusBadge.labelEn}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{isAr ? "Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø¸Ø±" : "Ban Status"}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${banStatusInfo.color}`}>
              {isAr ? banStatusInfo.ar : banStatusInfo.en}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{isAr ? "ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù†Ø¸Ø§Ù…" : "Assessment"}</span>
            <span className={`text-xs font-extrabold ${
              snapshot?.systemAssessment === "ELIGIBLE" ? "text-emerald-600" :
              snapshot?.systemAssessment === "NOT_ELIGIBLE" ? "text-rose-600" : "text-amber-600"
            }`}>
              {snapshot?.systemAssessment || "â€”"}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{isAr ? "Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø­Ø³ÙˆØ¨" : "Calculated Refund"}</span>
            <span className="text-sm font-black text-emerald-600">{effectiveRefund} {selectedClaim.currency || "EGP"}</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{isAr ? "Ø§Ù„Ø£ÙŠØ§Ù… Ø§Ù„Ù…ØªØ¨Ù‚ÙŠØ©" : "Days Remaining"}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{liveRefund?.remainingDays ?? 0}</span>
          </div>
        </div>

        {/* Customer & Account + Ban Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <UserIcon className="w-4 h-4 text-primary" />
              {isAr ? "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¹Ù…ÙŠÙ„" : "Customer Information"}
            </div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{selectedClaim.user?.name || "Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedClaim.user?.email}</p>
            {selectedClaim.user?.brandName && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                {isAr ? "Ø§Ù„Ù†Ø´Ø§Ø·:" : "Brand:"} {selectedClaim.user.brandName}
              </p>
            )}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
              <span className="text-gray-400">{isAr ? "Ø§Ù„Ø¨Ø§Ù‚Ø©:" : "Plan:"}</span>
              <span className="font-bold text-gray-700 dark:text-gray-300 uppercase">
                {selectedClaim.user?.subscription?.plan || "Free"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <Phone className="w-4 h-4 text-blue-500" />
              {isAr ? "Ø­Ø³Ø§Ø¨ WhatsApp" : "WhatsApp Account"}
            </div>
            <p className="font-mono text-sm text-gray-900 dark:text-white dir-ltr">{selectedClaim.phoneNumber}</p>
            <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">WABA ID: {selectedClaim.whatsappAccount?.wabaId}</p>
            <p className="text-[11px] text-gray-400 font-mono truncate">Phone ID: {selectedClaim.whatsappAccount?.phoneNumberId}</p>
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
              <span className="text-gray-400">{isAr ? "Ø­Ø§Ù„Ø© Ø§Ù„ØªÙˆÙƒÙ†:" : "Token Status:"}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedClaim.whatsappAccount?.tokenStatus || "UNKNOWN"}
              </span>
            </div>
          </div>

          {/* Ban Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                {isAr ? "Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø¸Ø±" : "Ban Verification Status"}
              </div>
            </div>
            <div className="mb-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${banStatusInfo.color}`}>
                {isAr ? banStatusInfo.ar : banStatusInfo.en}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">
              {isAr ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø­Ø¸Ø± Ø§Ù„Ù…Ø¯Ù‘Ø¹Ù‰:" : "Claimed Ban Date:"}{" "}
              <span className="font-mono font-semibold">{formatDate(selectedClaim.banDetectedAt, locale)}</span>
            </p>
            <select
              value={selectedClaim.banStatus || "CUSTOMER_REPORTED"}
              onChange={(e) => handleBanStatusUpdate(e.target.value)}
              disabled={updatingBanStatus}
              className={inp + " text-xs py-1.5"}
            >
              {Object.entries(BAN_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{isAr ? label.ar : label.en}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Notes Banner */}
        {selectedClaim.customerNotes && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold">{isAr ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª ÙˆØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¹Ù…ÙŠÙ„:" : "Customer Notes & Claim Details:"}</p>
              <p className="mt-1 whitespace-pre-wrap">{selectedClaim.customerNotes}</p>
            </div>
          </div>
        )}

        {/* â”€â”€ System Assessment Recommendation Banner â”€â”€ */}
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
                      {isAr ? "ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ø¢Ù„ÙŠ" : "System Assessment"}
                    </span>
                    <span className="text-base font-extrabold uppercase">
                      {snapshot.systemAssessment === "ELIGIBLE"
                        ? isAr ? "Ù…Ø³ØªØ­Ù‚ Ù„Ù„Ø¶Ù…Ø§Ù† ðŸŸ¢" : "ELIGIBLE ðŸŸ¢"
                        : snapshot.systemAssessment === "NOT_ELIGIBLE"
                        ? isAr ? "ØºÙŠØ± Ù…Ø³ØªØ­Ù‚ ðŸ”´" : "NOT ELIGIBLE ðŸ”´"
                        : isAr ? "ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¨Ø´Ø±ÙŠØ© ðŸŸ¡" : "NEEDS REVIEW ðŸŸ¡"}
                    </span>
                  </div>
                  <p className="text-xs mt-1 font-medium">{snapshot.assessmentSummary}</p>
                  {/* Audit Period */}
                  {snapshot.auditPeriod && (
                    <p className="text-[11px] mt-1 opacity-75">
                      {isAr ? "ÙØªØ±Ø© Ø§Ù„ÙØ­Øµ:" : "Audit period:"}{" "}
                      {formatShortDate(snapshot.auditPeriod.from, locale)} â†’ {formatShortDate(snapshot.auditPeriod.to, locale)}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[11px] bg-white/60 dark:bg-gray-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 sm:max-w-xs">
                <span className="font-bold block text-gray-800 dark:text-gray-200 mb-0.5">
                  {isAr ? "âš ï¸ ØªÙ†Ø¨ÙŠÙ‡ Ù„Ù„Ù…Ø´Ø±Ù:" : "âš ï¸ Admin Notice:"}
                </span>
                {isAr
                  ? "ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù†Ø¸Ø§Ù… Ù‡Ùˆ ØªÙˆØµÙŠØ© Ø¢Ù„ÙŠØ© Ù…Ø¨Ù†ÙŠØ© Ø¹Ù„Ù‰ Ø³Ø¬Ù„Ø§Øª Wani. Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø§Ù„ÙŠ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ ÙŠØ¹ÙˆØ¯ Ù„Ù„Ù…Ø´Ø±Ù Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ."
                  : "System Assessment is an automated recommendation. The Super Admin makes the final binding decision."}
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ Compliance Checklist â”€â”€ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              {isAr ? "Ù‚Ø§Ø¦Ù…Ø© ØªØ¯Ù‚ÙŠÙ‚ Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… ÙˆØ§Ù„Ø¶Ù…Ø§Ù† (Compliance Checklist)" : "Guarantee Compliance Checklist"}
            </h3>
            {snapshot && (
              <span className="text-[11px] text-gray-400">
                {isAr ? "ÙÙØ­Øµ ÙÙŠ:" : "Audited at:"} {formatDate(snapshot.auditedAt, locale)}
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

        {/* â”€â”€ Sending Limits & Activity Summary â”€â”€ */}
        {snapshot && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-500" />
                {isAr ? "Ù…Ù„Ø®Øµ Ù†Ø´Ø§Ø· Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ (Activity Summary)" : "Sending Activity Summary"}
              </h4>
              <div className="space-y-2 text-xs">
                {snapshot.auditPeriod && (
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-mono text-[11px]">
                    {isAr ? "ÙØªØ±Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„:" : "Audit period:"}{" "}
                    {formatShortDate(snapshot.auditPeriod.from, locale)} â†’ {formatShortDate(snapshot.auditPeriod.to, locale)}
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„ØµØ§Ø¯Ø±Ø©:" : "Total Outbound:"}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{snapshot.waniActivity?.totalOutboundCount ?? 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "Ø¢Ø®Ø± 24 Ø³Ø§Ø¹Ø© Ù‚Ø¨Ù„ Ø§Ù„Ø­Ø¸Ø±:" : "Last 24h Before Ban:"}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{snapshot.waniActivity?.last24hOutboundCount ?? 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "Ø¢Ø®Ø± Ø±Ø³Ø§Ù„Ø© ØµØ§Ø¯Ø±Ø©:" : "Last Outbound:"}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{formatDate(snapshot.waniActivity?.lastOutboundAt, locale)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">{isAr ? "Messaging Tier:" : "Messaging Tier:"}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{snapshot.sendingLimits?.tier ?? "â€”"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                {isAr ? "ØªØ­Ù„ÙŠÙ„ Ù†Ø§ÙØ°Ø© Ø§Ù„Ù€ 24 Ø³Ø§Ø¹Ø© (24h Window Audit)" : "24h Window Dynamic Audit"}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ù…ÙØ­ÙˆØµØ© Ù‚Ø¨Ù„ Ø§Ù„Ø­Ø¸Ø±:" : "Evaluated Outbound Messages:"}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{snapshot.twentyFourHourWindow.evaluatedCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "Ø¯Ø§Ø®Ù„ Ù†Ø§ÙØ°Ø© Ø§Ù„Ù€ 24 Ø³Ø§Ø¹Ø©:" : "Within 24h of Inbound:"}</span>
                  <span className="font-semibold text-emerald-600">{snapshot.twentyFourHourWindow.insideWindowCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{isAr ? "Ù‚ÙˆØ§Ù„Ø¨ Ù…Ø¹ØªÙ…Ø¯Ø© Ø®Ø§Ø±Ø¬ Ø§Ù„Ù†Ø§ÙØ°Ø©:" : "Approved Templates Outside 24h:"}</span>
                  <span className="font-semibold text-blue-600">{snapshot.twentyFourHourWindow.templatesOutsideWindowCount}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">{isAr ? "Ù…Ø®Ø§Ù„ÙØ§Øª Ø±Ø³Ø§Ø¦Ù„ Ø¹Ø§Ø¯ÙŠØ© Ø®Ø§Ø±Ø¬ Ø§Ù„Ù†Ø§ÙØ°Ø©:" : "Freeform Violations Outside 24h:"}</span>
                  <span className={`font-bold ${snapshot.twentyFourHourWindow.violationsCount > 0 ? "text-rose-600" : "text-gray-600 dark:text-gray-400"}`}>
                    {snapshot.twentyFourHourWindow.violationsCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ Template Compliance â”€â”€ */}
        {snapshot && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              {isAr ? "Ù‚ÙˆØ§Ù„Ø¨ Meta Ø§Ù„Ù…Ø³Ø¬Ù„Ø© (Templates Compliance)" : "Meta Template Compliance"}
            </h4>
            {snapshot.templateCompliance.templatesFound.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">{isAr ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙˆØ§Ù„Ø¨ Ù…Ø³Ø¬Ù„Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø­Ø³Ø§Ø¨" : "No templates registered"}</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {snapshot.templateCompliance.templatesFound.map((tpl, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{tpl.category} â€¢ {tpl.language}</p>
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
        )}

        {/* â”€â”€ Message Timeline (Enriched) â”€â”€ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            {isAr ? "Ø³Ø¬Ù„ Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ø²Ù…Ù†ÙŠ Ù‚Ø¨Ù„ Ø§Ù„Ø­Ø¸Ø± (Message Timeline)" : "Message Timeline (Prior to Ban)"}
          </h3>

          {timelineMessages.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">{isAr ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø³Ø§Ø¦Ù„ Ù…Ø³Ø¬Ù„Ø© Ù‚Ø¨Ù„ ØªØ§Ø±ÙŠØ® Ø§Ù„Ø­Ø¸Ø±" : "No messages found prior to ban"}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {timelineMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border text-xs ${
                    msg.direction === "inbound"
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40"
                      : msg.windowCompliance === "FAIL"
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                      : "bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                          msg.direction === "inbound"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                        }`}
                      >
                        {msg.direction === "inbound" ? "IN" : "OUT"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
                            {formatDate(msg.createdAt || msg.time, locale)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded font-semibold uppercase text-gray-600 dark:text-gray-300">
                            {msg.type}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase font-mono">{msg.senderType}</span>
                        </div>

                        {/* Source info */}
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="font-semibold">{isAr ? "Ø§Ù„Ù…ØµØ¯Ø±:" : "Source:"}</span>{" "}
                          <span className={`font-medium ${msg.source?.includes("Campaign") ? "text-emerald-600" : msg.source?.includes("Automation") ? "text-purple-600" : "text-gray-500"}`}>
                            {msg.source || "Unknown"}
                          </span>
                        </p>

                        {/* Content snippet */}
                        {msg.contentSnippet && (
                          <p className="text-[11px] text-gray-800 dark:text-gray-200 truncate mt-0.5">
                            {msg.contentSnippet}
                          </p>
                        )}

                        {/* Automation details */}
                        {msg.automationName && (
                          <div className="mt-1 text-[10px] text-purple-600 dark:text-purple-400">
                            <span className="font-bold">Automation:</span> {msg.automationName}
                            {msg.automationTriggerType && <> â€¢ Trigger: {msg.automationTriggerType}</>}
                            {msg.automationReplyType && <> â€¢ Reply: {msg.automationReplyType}</>}
                          </div>
                        )}

                        {/* Meta Message ID */}
                        {msg.whatsappId && (
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                            Meta ID: {msg.whatsappId}
                          </p>
                        )}

                        {/* Contact & Window info */}
                        {msg.contactPhone && (
                          <p className="text-[10px] text-gray-400 font-mono">
                            {msg.contactPhone} {msg.hoursSinceLastInbound !== null && `(Î” ${msg.hoursSinceLastInbound}h)`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {msg.status && (
                        <span className="text-[10px] text-gray-400 font-mono uppercase">{msg.status}</span>
                      )}
                      {msg.direction === "outbound" && msg.windowCompliance && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            msg.windowCompliance === "PASS"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                              : msg.windowCompliance === "FAIL"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                          }`}
                        >
                          {msg.windowCompliance}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* â”€â”€ Campaigns & Automations Summaries â”€â”€ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              {isAr ? "Ù†Ø´Ø§Ø· Ø§Ù„Ø­Ù…Ù„Ø§Øª Ø§Ù„Ù‚Ø±ÙŠØ¨Ø© Ù…Ù† Ø§Ù„Ø­Ø¸Ø±" : "Recent Campaigns (Pre-ban)"}
            </h4>
            {recentCampaigns.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">{isAr ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ù…Ù„Ø§Øª Ù…Ø³Ø¬Ù„Ø©" : "No campaigns found"}</p>
            ) : (
              <div className="space-y-1.5">
                {recentCampaigns.map((c: any) => (
                  <div key={c.id} className="p-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{formatShortDate(c.createdAt, locale)}</p>
                    </div>
                    <div className="text-[11px] text-end font-mono">
                      <span className="text-emerald-600">{c.sentCount} sent</span>
                      {" â€¢ "}
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
              {isAr ? "Ù†Ø´Ø§Ø· Ø§Ù„Ø£ØªÙ…ØªØ© (Automations)" : "Active Automations"}
            </h4>
            {automations.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">{isAr ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙˆØ§Ø¹Ø¯ Ø£ØªÙ…ØªØ©" : "No automations found"}</p>
            ) : (
              <div className="space-y-1.5">
                {automations.map((a: any) => (
                  <div key={a.id} className="p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{a.name}</p>
                        <p className="text-[10px] text-gray-400">{a.triggerType} â†’ {a.replyType}</p>
                      </div>
                      <span className="text-[11px] font-mono text-gray-500">
                        {a.interactionCount} {isAr ? "ØªÙØ§Ø¹Ù„" : "triggers"}
                      </span>
                    </div>
                    {a.matchedMessagesCount > 0 && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-mono">
                        {a.matchedMessagesCount} {isAr ? "Ø±Ø³Ø§Ù„Ø© Ù…Ø±ØªØ¨Ø·Ø©" : "linked messages"}
                      </p>
                    )}
                    {a.lastTriggeredAt && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {isAr ? "Ø¢Ø®Ø± ØªÙØ¹ÙŠÙ„:" : "Last triggered:"} {formatDate(a.lastTriggeredAt, locale)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Customer Evidence Section â”€â”€ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              {isAr ? "Ø£Ø¯Ù„Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„ (Customer Evidence)" : "Customer Evidence"}
            </h3>
            <button
              onClick={() => setShowEvidenceForm(!showEvidenceForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              {isAr ? "Ø¥Ø¶Ø§ÙØ© Ø¯Ù„ÙŠÙ„" : "Add Evidence"}
            </button>
          </div>

          {showEvidenceForm && (
            <div className="mb-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                  {isAr ? "Ù†ÙˆØ¹ Ø§Ù„Ø¯Ù„ÙŠÙ„:" : "Evidence Type:"}
                </label>
                <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className={inp + " text-xs"}>
                  {Object.entries(EVIDENCE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{isAr ? label.ar : label.en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                  {isAr ? "Ù…Ù„Ù (Ø§Ø®ØªÙŠØ§Ø±ÙŠ):" : "File (optional):"}
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="text-xs text-gray-600 dark:text-gray-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                  {isAr ? "Ù…Ù„Ø§Ø­Ø¸Ø©:" : "Note:"}
                </label>
                <input
                  type="text"
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  placeholder={isAr ? "Ù…Ù„Ø§Ø­Ø¸Ø© Ø­ÙˆÙ„ Ø§Ù„Ø¯Ù„ÙŠÙ„..." : "Note about this evidence..."}
                  className={inp}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowEvidenceForm(false)} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                  {isAr ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
                </button>
                <button onClick={handleEvidenceSubmit} disabled={uploadingEvidence} className={btn + " text-xs py-1.5"}>
                  {uploadingEvidence ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isAr ? "Ø±ÙØ¹" : "Upload"}
                </button>
              </div>
            </div>
          )}

          {evidenceFiles.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{isAr ? "Ù„Ù… ÙŠØªÙ… ØªÙ‚Ø¯ÙŠÙ… Ø£Ø¯Ù„Ø© Ø¨Ø¹Ø¯" : "No evidence provided yet"}</p>
          ) : (
            <div className="space-y-2">
              {evidenceFiles.map((ev: any) => {
                const typeLabel = EVIDENCE_TYPE_LABELS[ev.type] || EVIDENCE_TYPE_LABELS.OTHER;
                return (
                  <div key={ev.id} className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{isAr ? typeLabel.ar : typeLabel.en}</p>
                      {ev.note && <p className="text-[11px] text-gray-500 mt-0.5">{ev.note}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(ev.uploadedAt, locale)}</p>
                    </div>
                    {ev.url && (
                      <a href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-[11px]">
                        <ExternalLink className="w-3 h-3" /> {isAr ? "Ø¹Ø±Ø¶" : "View"}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* â”€â”€ Refund Calculation Breakdown â”€â”€ */}
        {liveRefund && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                {isAr ? "Ø­Ø³Ø§Ø¨ Ù‚ÙŠÙ…Ø© Ø§Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ø§Ù„Ù†Ø³Ø¨ÙŠ (Prorated Refund)" : "Prorated Refund Calculation"}
              </h3>
              <button
                onClick={() => setShowOverride(!showOverride)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/80 dark:bg-gray-800/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 transition"
              >
                <Edit3 className="w-3 h-3" />
                {isAr ? "ØªØ¹Ø¯ÙŠÙ„ ÙŠØ¯ÙˆÙŠ" : "Override"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "Ø§Ù„Ø¨Ø§Ù‚Ø© ÙˆØ³Ø¹Ø±Ù‡Ø§:" : "Plan & Price:"}</span>
                <span className="font-bold text-gray-900 dark:text-white">{liveRefund.plan} ({liveRefund.monthlyPrice} {liveRefund.currency})</span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "ÙØªØ±Ø© Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ:" : "Cycle:"}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {formatShortDate(liveRefund.subscriptionStart, locale)} â†’ {formatShortDate(liveRefund.subscriptionEnd, locale)}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "Ù…Ø³ØªÙ‡Ù„Ùƒ / Ù…ØªØ¨Ù‚ÙŠ:" : "Used / Remaining:"}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {liveRefund.usedDays}d / <span className="font-bold text-emerald-600">{liveRefund.remainingDays}d</span>
                </span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-gray-400 block mb-1">{isAr ? "Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø­Ø³ÙˆØ¨:" : "Calculated Refund:"}</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {liveRefund.calculatedRefund} {liveRefund.currency}
                </span>
              </div>
            </div>

            {/* Override display */}
            {selectedClaim.overrideRefund != null && (
              <div className="mt-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs">
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  {isAr ? "ØªØ¹Ø¯ÙŠÙ„ ÙŠØ¯ÙˆÙŠ Ù†Ø§ÙØ°:" : "Active Override:"}
                </p>
                <p>
                  <span className="text-gray-500">{isAr ? "Ø§Ù„Ø£ØµÙ„ÙŠ:" : "Original:"}</span>{" "}
                  <span className="line-through">{liveRefund.calculatedRefund} {liveRefund.currency}</span>{" â†’ "}
                  <span className="font-black text-amber-700 dark:text-amber-300">{selectedClaim.overrideRefund} {selectedClaim.currency}</span>
                </p>
                {selectedClaim.overrideReason && (
                  <p className="text-gray-500 mt-0.5">{isAr ? "Ø§Ù„Ø³Ø¨Ø¨:" : "Reason:"} {selectedClaim.overrideReason}</p>
                )}
              </div>
            )}

            {/* Override form */}
            {showOverride && (
              <div className="mt-3 p-4 bg-white/90 dark:bg-gray-800/90 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  {isAr ? "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¯ÙˆÙŠØ§Ù‹ (Override Refund)" : "Override Refund Amount"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                      {isAr ? "Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ø¬Ø¯ÙŠØ¯ (EGP):" : "New Amount (EGP):"}
                    </label>
                    <input type="number" step="0.01" min="0" value={overrideAmount} onChange={(e) => setOverrideAmount(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                      {isAr ? "Ø³Ø¨Ø¨ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ (Ø¥Ø¬Ø¨Ø§Ø±ÙŠ):" : "Override Reason (required):"} <span className="text-rose-500">*</span>
                    </label>
                    <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder={isAr ? "Ù…Ø«Ø§Ù„: ØªØ¹Ø¯ÙŠÙ„ Ø¥Ø¯Ø§Ø±ÙŠ Ù…Ø¹ØªÙ…Ø¯..." : "e.g. Manual adjustment approved..."} className={inp} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowOverride(false)} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                    {isAr ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
                  </button>
                  <button
                    onClick={handleOverrideSubmit}
                    disabled={savingOverride || !overrideAmount.trim() || !overrideReason.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition"
                  >
                    {savingOverride ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {isAr ? "ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„" : "Apply Override"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ Admin Decision Form â”€â”€ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {isAr ? "Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø´Ø±Ù Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ (Admin Decision)" : "Admin Decision & Guarantee Processing"}
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
                {isAr ? "Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ:" : "Decision:"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "ELIGIBLE",
                    labelAr: "Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯ (Approve Refund)",
                    labelEn: "Approve Refund",
                    activeClass: "bg-emerald-600 text-white border-emerald-600",
                  },
                  {
                    id: "PENDING_EVIDENCE",
                    labelAr: "Ø·Ù„Ø¨ Ø£Ø¯Ù„Ø© Ø¥Ø¶Ø§ÙÙŠØ© (Request Evidence)",
                    labelEn: "Request More Evidence",
                    activeClass: "bg-purple-600 text-white border-purple-600",
                  },
                  {
                    id: "NOT_ELIGIBLE",
                    labelAr: "Ø±ÙØ¶ Ø§Ù„Ø·Ù„Ø¨ (Reject Claim)",
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

            {/* Evidence Requested (when requesting evidence) */}
            {decisionStatus === "PENDING_EVIDENCE" && (
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                  {isAr ? "Ø§Ù„Ø£Ø¯Ù„Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©:" : "Evidence Requested:"}
                </label>
                <textarea
                  value={evidenceRequested}
                  onChange={(e) => setEvidenceRequested(e.target.value)}
                  rows={2}
                  placeholder={isAr ? "Ù…Ø«Ø§Ù„: ÙŠØ±Ø¬Ù‰ Ø¥Ø±Ø³Ø§Ù„ Ù„Ù‚Ø·Ø© Ø´Ø§Ø´Ø© Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø¸Ø± Ù…Ù† Meta..." : "e.g. Please provide a screenshot of the ban status from Meta..."}
                  className={inp}
                />
              </div>
            )}

            {/* Decision Reason (Mandatory when Rejecting) */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "Ø³Ø¨Ø¨ Ø§Ù„Ù‚Ø±Ø§Ø± (Ø¥Ø¬Ø¨Ø§Ø±ÙŠ Ø¹Ù†Ø¯ Ø§Ù„Ø±ÙØ¶):" : "Decision Reason (Mandatory if Rejecting):"}{" "}
                {decisionStatus === "NOT_ELIGIBLE" && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={
                  isAr
                    ? "Ù…Ø«Ù„Ø§Ù‹: ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ø¦Ù„ ØªØ±ÙˆÙŠØ¬ÙŠØ© Ø®Ø§Ø±Ø¬ Ù†Ø§ÙØ°Ø© Ø§Ù„Ù€ 24 Ø³Ø§Ø¹Ø© Ø¨Ø¯ÙˆÙ† Ù‚ÙˆØ§Ù„Ø¨ Ù…Ø¹ØªÙ…Ø¯Ø©"
                    : "e.g. Non-template outbound messages were sent outside 24h window"
                }
                className={inp}
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¯Ø§Ø±ÙŠØ© Ø¯Ø§Ø®Ù„ÙŠØ© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ):" : "Internal Admin Notes (Optional):"}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                placeholder={isAr ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù…Ø±Ø¬Ø¹ÙŠØ© Ù„Ù„Ù…Ø´Ø±ÙÙŠÙ†..." : "Internal notes for review..."}
                className={inp}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveDecision(false)}
                disabled={savingDecision}
                className={btn}
              >
                {savingDecision ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isAr ? "Ø­ÙØ¸ Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠ" : "Submit Decision"}
              </button>
            </div>
          </div>
        </div>

        {/* â”€â”€ Audit Trail Log â”€â”€ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            {isAr ? "Ø³Ø¬Ù„ ØªØ¯Ù‚ÙŠÙ‚ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª (Protection Audit Log)" : "Audit Trail History"}
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(selectedClaim.auditLogs || []).map((log: any) => (
              <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">{log.action}</span>
                    {log.result && <span className="text-gray-500 ml-2 font-mono">[{log.result}]</span>}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {isAr ? "Ø¨ÙˆØ§Ø³Ø·Ø©:" : "By:"} {log.adminUser?.name || log.adminUser?.email || "Admin"}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono shrink-0">
                    {formatDate(log.createdAt, locale)}
                  </span>
                </div>
                {/* Show details if they exist */}
                {log.details && typeof log.details === "object" && (
                  <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600 text-[10px] text-gray-500 space-y-0.5">
                    {log.details.decisionReason && (
                      <p><span className="font-semibold">Reason:</span> {log.details.decisionReason}</p>
                    )}
                    {log.details.refundAmount != null && (
                      <p><span className="font-semibold">Amount:</span> {log.details.refundAmount} EGP</p>
                    )}
                    {log.details.oldAmount != null && (
                      <p><span className="font-semibold">Override:</span> {log.details.oldAmount} â†’ {log.details.newAmount}</p>
                    )}
                    {log.details.reason && log.action === "REFUND_OVERRIDE" && (
                      <p><span className="font-semibold">Reason:</span> {log.details.reason}</p>
                    )}
                    {log.details.evidenceRequested && (
                      <p><span className="font-semibold">Evidence Requested:</span> {log.details.evidenceRequested}</p>
                    )}
                    {log.details.unknownChecksAtApproval && (
                      <p><span className="font-semibold">Overridden checks:</span> {log.details.unknownChecksAtApproval.join(", ")}</p>
                    )}
                    {log.details.banStatus && (
                      <p><span className="font-semibold">Ban Status:</span> {log.details.banStatus}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LIST VIEW
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  return (
    <div className="space-y-6">
      {/* Create Modal */}
      {showCreateModal && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm mb-6 animate-in fade-in-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {isAr ? "Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ ÙØ­Øµ Ø¶Ù…Ø§Ù† Ø¬Ø¯ÙŠØ¯ (Create Protection Claim)" : "Create New Protection Claim"}
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
                {isAr ? "Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø­Ø³Ø§Ø¨ WhatsApp (Ø¨Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ØŒ Ø§Ù„Ù‡Ø§ØªÙØŒ Ø£Ùˆ Account ID): *" : "Search WhatsApp Account (by email, phone, or Account ID): *"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchAccountQuery}
                  onChange={(e) => setSearchAccountQuery(e.target.value)}
                  placeholder={isAr ? "Ø§ÙƒØªØ¨ Ù„Ù„Ø¨Ø­Ø« Ø¹Ù† Ø­Ø³Ø§Ø¨ Ù…Ø³Ø¬Ù„..." : "Type to search registered accounts..."}
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
                        <p className="font-bold text-gray-900 dark:text-white">{acc.user.name || "Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…"} ({acc.user.email})</p>
                        <p className="text-[10px] text-gray-400 font-mono">Phone ID: {acc.phoneNumberId} â€¢ WABA: {acc.wabaId}</p>
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
                      âœ“ {isAr ? "Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø­Ø¯Ø¯:" : "Selected Account:"}
                    </span>{" "}
                    <span className="text-gray-800 dark:text-gray-200">
                      {selectedAccount.user.email} â€” {selectedAccount.phoneNumberId}
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
                    {isAr ? "ØªØºÙŠÙŠØ±" : "Change"}
                  </button>
                </div>
              )}
            </div>

            {/* Ban Date and Time */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "ØªØ§Ø±ÙŠØ® ÙˆÙˆÙ‚Øª Ø§Ù„Ø­Ø¸Ø± Ø§Ù„Ù…Ø¯Ù‘Ø¹Ù‰: *" : "Claimed Ban Date & Time: *"}
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
                {isAr ? "ØªÙØ§ØµÙŠÙ„ ÙˆØ¨Ù„Ø§Øº Ø§Ù„Ø¹Ù…ÙŠÙ„:" : "Customer Notes & Reported Context:"}
              </label>
              <textarea
                value={customerNotesInput}
                onChange={(e) => setCustomerNotesInput(e.target.value)}
                rows={2}
                placeholder={isAr ? "ØªÙØ§ØµÙŠÙ„ Ù…Ø§ Ø°ÙƒØ±Ù‡ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø­ÙˆÙ„ ÙˆÙ‚Øª Ø§Ù„Ø­Ø¸Ø± ÙˆØ·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…..." : "Context provided by the customer..."}
                className={inp}
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                {isAr ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¯Ø§Ø±ÙŠØ© Ø£ÙˆÙ„ÙŠØ©:" : "Initial Admin Notes:"}
              </label>
              <input
                type="text"
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                placeholder={isAr ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù„Ù„Ù…Ø´Ø±ÙÙŠÙ†..." : "Notes for reviewers..."}
                className={inp}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {isAr ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
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
                {isAr ? "Ø¥Ù†Ø´Ø§Ø¡ ÙˆØ¨Ø¯Ø¡ Ø§Ù„ÙØ­Øµ Ø§Ù„Ø¢Ù„ÙŠ" : "Create & Run Audit"}
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
              { id: "all", labelAr: "Ø§Ù„ÙƒÙ„", labelEn: "All" },
              { id: "NEEDS_REVIEW", labelAr: "ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©", labelEn: "Needs Review" },
              { id: "ELIGIBLE", labelAr: "Ù…Ø³ØªØ­Ù‚ Ù„Ù„Ø¶Ù…Ø§Ù†", labelEn: "Eligible" },
              { id: "NOT_ELIGIBLE", labelAr: "ØºÙŠØ± Ù…Ø³ØªØ­Ù‚", labelEn: "Not Eligible" },
              { id: "PENDING_EVIDENCE", labelAr: "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø£Ø¯Ù„Ø©", labelEn: "Pending Evidence" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  statusFilter === f.id
                    ? "bg-primary text-primary-foreground shadow-sm"
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
            {isAr ? "Ø¥Ù†Ø´Ø§Ø¡ Claim Ø¬Ø¯ÙŠØ¯" : "New Protection Claim"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙØŒ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ØŒ Ø£Ùˆ Claim ID..." : "Search by phone, email, or Claim ID..."}
              className={inp}
            />
            <Search className="w-4 h-4 absolute top-3 end-3 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-gray-500">
              {totalCount} {isAr ? "Ø·Ù„Ø¨ Ù…Ø³Ø¬Ù„" : "claims total"}
            </span>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={inp + " w-auto text-xs py-1.5 cursor-pointer"}
            >
              <option value="newest">{isAr ? "Ø§Ù„Ø£Ø­Ø¯Ø« Ø£ÙˆÙ„Ø§Ù‹" : "Newest First"}</option>
              <option value="oldest">{isAr ? "Ø§Ù„Ø£Ù‚Ø¯Ù… Ø£ÙˆÙ„Ø§Ù‹" : "Oldest First"}</option>
              <option value="highest_refund">{isAr ? "Ø§Ù„Ø£Ø¹Ù„Ù‰ Ø§Ø³ØªØ±Ø¯Ø§Ø¯Ø§Ù‹" : "Highest Refund"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-3"><TableRowsSkeleton rows={6} bare cols={3} /></div>
        ) : claims.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ø­Ù…Ø§ÙŠØ© Ù…Ø·Ø§Ø¨Ù‚Ø©" : "No protection claims found"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isAr ? "ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø²Ø± Ø£Ø¹Ù„Ø§Ù‡." : "You can create a new claim using the button above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-start">{isAr ? "Ø§Ù„Ø·Ù„Ø¨" : "Claim"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "Ø§Ù„Ø¹Ù…ÙŠÙ„" : "Customer"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ" : "Phone"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø­Ø¸Ø±" : "Ban Date"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "Ø§Ù„Ø­Ø§Ù„Ø©" : "Status"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "Ø§Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯" : "Refund"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹" : "Reviewer"}</th>
                  <th className="px-4 py-3 text-end">{isAr ? "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡" : "Action"}</th>
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
                        <p className="font-semibold text-gray-900 dark:text-white">{claim.user?.name || "Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…"}</p>
                        <p className="text-[11px] text-gray-400">{claim.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300 dir-ltr text-start">
                        {claim.phoneNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                        {formatShortDate(claim.banDetectedAt, locale)}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchClaimDetails(claim.id);
                            }}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 rounded-lg text-xs font-semibold transition"
                          >
                            {isAr ? "Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆÙØ­Øµ" : "Review"}
                          </button>
                          <button
                            onClick={(e) => handleDeleteClaim(claim.id, e)}
                            disabled={deletingClaimId === claim.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                            title={isAr ? "Ø­Ø°Ù Ø§Ù„Ø·Ù„Ø¨ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹" : "Delete claim"}
                          >
                            {deletingClaimId === claim.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
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

