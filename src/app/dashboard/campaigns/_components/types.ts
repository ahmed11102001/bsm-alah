export type Lang = "ar" | "en";

export interface Template {
  id: string; name: string; content: string;
  status: string; language?: string; category?: string;
}
export interface Campaign {
  id: string; name: string;
  status: "draft" | "scheduled" | "running" | "completed" | "failed";
  sentCount: number; deliveredCount: number; readCount: number;
  failedCount: number; totalQueued: number; queuedCount: number;
  scheduledAt: string | null; createdAt: string; completedAt: string | null;
  template: { name: string; content: string; category?: string } | null;
}
export interface AudienceContact { phone: string; [key: string]: any; }
export interface AudienceOption { id: string; name: string; type: string; contactCount: number; }