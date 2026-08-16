// src/lib/protection/types.ts

export interface ComplianceCheckItem {
  id: string;
  title: string;
  subtitle?: string;
  status: "PASS" | "FAIL" | "WARNING" | "UNKNOWN" | "NEEDS_EVIDENCE" | "NEEDS EVIDENCE";
  details: string;
  evidence?: Record<string, any>;
}

export interface MessageTimelineItem {
  id: string;
  time: string;
  type: string;
  direction: "inbound" | "outbound";
  senderType: "human" | "ai" | "bot" | "system";
  contentSnippet: string;
  contactPhone?: string;
  contactName?: string | null;
  templateName?: string | null;
  ruleName?: string | null;
  status: string;
  hoursSinceLastInbound?: number | null;
  windowCompliance?: "PASS" | "FAIL" | "UNKNOWN";
}

export interface CampaignSummaryItem {
  id: string;
  name: string;
  createdAt: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  templateName?: string | null;
}

export interface AutomationSummaryItem {
  id: string;
  name: string;
  triggerType: string;
  replyType: string;
  lastTriggeredAt?: string | null;
  interactionCount: number;
}

export interface RefundCalculation {
  plan: string;
  monthlyPrice: number;
  currency: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  banDate: string;
  totalDaysInPeriod: number;
  usedDays: number;
  remainingDays: number;
  calculatedRefund: number;
}

export interface EvidenceSnapshot {
  auditedAt: string;
  auditedBy: string;
  systemAssessment: "ELIGIBLE" | "NEEDS_REVIEW" | "NOT_ELIGIBLE";
  assessmentSummary: string;
  accountCheck: {
    isConnected: boolean;
    connectedAt: string;
    tokenStatus: string;
    messagingTier: number;
    dailySentCount: number;
    wabaId: string;
    phoneNumberId: string;
  };
  waniActivity: {
    found: boolean;
    outboundCountBeforeBan: number;
    lastOutboundAt: string | null;
    lastOutboundType: string | null;
    lastOutboundSender: string | null;
  };
  twentyFourHourWindow: {
    status: "PASS" | "FAIL" | "UNKNOWN";
    evaluatedCount: number;
    insideWindowCount: number;
    templatesOutsideWindowCount: number;
    violationsCount: number;
    notes: string;
  };
  templateCompliance: {
    status: "PASS" | "FAIL" | "UNKNOWN";
    templatesFound: Array<{
      name: string;
      metaId: string;
      category: string;
      status: string;
      language: string;
    }>;
    unapprovedUsedCount: number;
    notes: string;
  };
  sendingLimits: {
    status: "PASS" | "FAIL" | "UNKNOWN";
    tier: number;
    recentVelocity24h: number;
    notes: string;
  };
  externalPlatform: {
    status: "NO KNOWN ACTIVITY" | "EVIDENCE PROVIDED" | "UNKNOWN";
    warning: string;
    details: string;
  };
  optIn: {
    status: "PASS" | "FAIL" | "NEEDS EVIDENCE";
    documentedCount: number;
    notes: string;
  };
  refundEstimate: RefundCalculation;
  checklist: ComplianceCheckItem[];
}
