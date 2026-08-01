export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "NOT_SENT";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type HeaderType = "none" | "text" | "image" | "video" | "document";
export type ButtonType = "url" | "phone" | "quick_reply";
export type View = "list" | "create" | "detail" | "library";
export type Lang = "ar" | "en";

export interface TemplateButton { type: ButtonType; text: string; value: string; }
export interface Template {
    id: string; name: string; category: TemplateCategory; language: string;
    status: TemplateStatus; body?: string; headerType?: HeaderType;
    headerText?: string; footer?: string; buttons?: TemplateButton[];
    createdAt?: string; updatedAt?: string; rejectedReason?: string;
    isWaniReady?: boolean; exampleVars?: string[]; group?: "store" | "followup" | "campaign";
}
export interface FormState {
    name: string; category: TemplateCategory | ""; language: string;
    headerType: HeaderType; headerText: string; body: string;
    footer: string; buttons: TemplateButton[]; exampleVars: string[];
}