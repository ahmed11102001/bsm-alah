export interface ContactRow {
  id: string;
  phone: string;
  name: string | null;
  notes?: string | null;
}

export interface Audience {
  id: string;
  name: string;
  notes: string | null;
  type: "excel" | "custom" | "vip" | "engaged" | "no-response";
  contacts: ContactRow[];
  contactCount: number;
  createdAt: string;
}