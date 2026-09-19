// Types خاصة بنظام التسويق عبر البريد الإلكتروني (Email Marketing)

export type EmailContactStatus = "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED";

export interface EmailContactDTO {
  id: string;
  email: string;
  name?: string | null;
  firstName?: string | null; // Compatibility with legacy UI until Phase 3
  lastName?: string | null;  // Compatibility with legacy UI until Phase 3
  phone?: string | null;
  tags: string[];
  status: EmailContactStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface EmailTemplateDTO {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  previewText?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmailCampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "QUEUED"
  | "SENDING"
  | "COMPLETED"
  | "FAILED";

export interface EmailCampaignDTO {
  id: string;
  name: string;
  subject: string;
  templateId: string;
  templateName?: string;
  targetTag?: string | null;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount?: number;
  status: EmailCampaignStatus;
  scheduledAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export type EmailDeliveryStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "FAILED";

export interface EmailDeliveryDTO {
  id: string;
  campaignId: string;
  contactEmail: string;
  contactName?: string | null;
  status: EmailDeliveryStatus;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface SmtpConfigDTO {
  id?: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  isConfigured: boolean;
  lastTestedAt?: string | null;
  lastTestSuccess?: boolean | null;
}

export interface EmailOverviewStats {
  totalContacts: number;
  subscribedContacts: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  deliveryRate: number;
  openRate: number;
  isSmtpConfigured: boolean;
}
