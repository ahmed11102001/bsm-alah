// src/lib/crm/contacts.ts
// ─── منطق جهات اتصال الـCRM (جدول Contact مباشرة — بدون Audience) ──────────
// القيد الذهبي (مطابق لتاسك الاستور): مستحيل Contact من غير وسيلة تواصل —
// لازم رقم أو إيميل على الأقل. الـmatching نفسه بتاع upsertStoreContact.

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";
import { upsertStoreContact } from "@/lib/store-contacts";
import { parseBirthDate, cleanCity } from "./birthdate";

export type CrmChannel = "all" | "phone" | "email" | "both";

export interface CrmContactInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  birthDate?: string | null;
  city?: string | null;
}

export interface NormalizedContact {
  name: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  birthDate: Date | null;
  city: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCrmEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return EMAIL_RE.test(s) ? s : null;
}

export function normalizeCrmPhone(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return normalizePhone(v);
}

export function normalizeCrmTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const t of v) {
    if (typeof t !== "string") continue;
    const s = t.trim().slice(0, 40);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 20) break;
  }
  return out;
}

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 120);
  return s || null;
}

function cleanNotes(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 2000);
  return s || null;
}

/** تطبيع مدخلات فورم/صف استيراد — بيرجع null لو مفيش وسيلة تواصل صالحة */
export function normalizeCrmInput(input: CrmContactInput): NormalizedContact | null {
  const phone = normalizeCrmPhone(input.phone);
  const email = normalizeCrmEmail(input.email);
  if (!phone && !email) return null;
  return {
    name: cleanName(input.name),
    phone,
    email,
    tags: normalizeCrmTags(input.tags),
    notes: cleanNotes(input.notes),
    birthDate: parseBirthDate(input.birthDate),
    city: cleanCity(input.city),
  };
}

/**
 * تحقق تاريخ الميلاد للفورم: فاضي → null، صالح → Date، غير صالح → throw.
 * (الاستيراد بيتجاهل الحقل الغلط بدل ما يرفض — شوف import-shared)
 */
export function requireBirthDateOrNull(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const parsed = parseBirthDate(v);
  if (!parsed) {
    const err: any = new Error("INVALID_BIRTHDATE");
    err.code = "INVALID_BIRTHDATE";
    throw err;
  }
  return parsed;
}

function channelWhere(channel: CrmChannel, base: Record<string, unknown> = {}) {
  const hasPhone = { AND: [{ phone: { not: null } }, { phone: { not: "" } }] };
  const noPhone = { OR: [{ phone: null }, { phone: "" }] };
  const hasEmail = { AND: [{ email: { not: null } }, { email: { not: "" } }] };
  const noEmail = { OR: [{ email: null }, { email: "" }] };
  const channelClause =
    channel === "phone" ? { ...hasPhone, ...noEmail }
    : channel === "email" ? { ...noPhone, ...hasEmail }
    : channel === "both" ? { ...hasPhone, ...hasEmail }
    : {};
  return { ...base, ...channelClause };
}

export interface CrmListParams {
  ownerId: string;
  search?: string;
  channel?: CrmChannel;
  page?: number;
  pageSize?: number;
}

export async function listCrmContacts(params: CrmListParams) {
  const { ownerId } = params;
  const channel = params.channel ?? "all";
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 50));
  const q = typeof params.search === "string" ? params.search.trim().slice(0, 100) : "";

  const base: Record<string, unknown> = { userId: ownerId, deletedAt: null };
  const where: Record<string, unknown> = channelWhere(channel, base);
  if (q) {
    (where as any).AND = [
      ...((where as any).AND ?? []),
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const select = {
    id: true, name: true, phone: true, email: true,
    tags: true, notes: true, birthDate: true, city: true,
    createdAt: true, updatedAt: true,
  };

  const [items, total, all, phoneOnly, emailOnly, both] = await Promise.all([
    prisma.contact.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
    prisma.contact.count({ where: base }),
    prisma.contact.count({ where: channelWhere("phone", base) }),
    prisma.contact.count({ where: channelWhere("email", base) }),
    prisma.contact.count({ where: channelWhere("both", base) }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    stats: { total: all, phoneOnly, emailOnly, both },
  };
}

/** بحث عن صف موجود (شامل المحذوف soft) بنفس مفاتيح الـmatching */
async function findExisting(ownerId: string, phone: string | null, email: string | null) {
  if (phone) {
    const byPhone = await prisma.contact.findUnique({
      where: { phone_userId: { phone, userId: ownerId } },
    });
    if (byPhone) return byPhone;
  }
  if (email) {
    const byEmail = await prisma.contact.findUnique({
      where: { email_userId: { email, userId: ownerId } },
    });
    if (byEmail) return byEmail;
  }
  return null;
}

function unionTags(a: string[] | null | undefined, b: string[]): string[] {
  const out = [...(a ?? [])];
  for (const t of b) if (!out.includes(t)) out.push(t);
  return out.slice(0, 20);
}

export async function createCrmContact(ownerId: string, input: CrmContactInput) {
  // الفورم: تاريخ غلط → 400 (عكس الاستيراد اللي بيتجاهل الحقل بس)
  if (
    input.birthDate !== undefined &&
    input.birthDate !== null &&
    !(typeof input.birthDate === "string" && input.birthDate.trim() === "") &&
    !parseBirthDate(input.birthDate)
  ) {
    const err: any = new Error("INVALID_BIRTHDATE");
    err.code = "INVALID_BIRTHDATE";
    throw err;
  }
  const data = normalizeCrmInput(input);
  if (!data) {
    const err: any = new Error("PHONE_OR_EMAIL_REQUIRED");
    err.code = "PHONE_OR_EMAIL_REQUIRED";
    throw err;
  }

  const existing = await findExisting(ownerId, data.phone, data.email);
  if (existing) {
    if (existing.deletedAt) {
      // كان محذوف → استرجعه وحدّثه بالبيانات الجديدة
      const restored = await prisma.contact.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          name: data.name ?? existing.name,
          phone: data.phone ?? existing.phone,
          email: data.email ?? existing.email,
          tags: unionTags(existing.tags, data.tags),
          notes: data.notes ?? existing.notes,
          birthDate: data.birthDate ?? existing.birthDate ?? undefined,
          city: data.city ?? existing.city ?? undefined,
        },
      });
      return { contact: restored, created: true as const };
    }
    // دمج مع الموجود: الاسم/الإيميل عبر نفس منطق الاستور + دمج التاجز
    const merged = await upsertStoreContact({
      userId: ownerId,
      phone: data.phone,
      email: data.email,
      updateName: data.name ?? undefined,
      createName: data.name ?? "",
      birthDate: data.birthDate ?? undefined,
      city: data.city ?? undefined,
    });
    const mergedTags = unionTags((merged as any).tags, data.tags);
    const contact =
      mergedTags.length !== ((merged as any).tags ?? []).length
        ? await prisma.contact.update({
            where: { id: merged.id },
            data: { tags: mergedTags },
          })
        : merged;
    return { contact, created: false as const };
  }

  const created = await prisma.contact.create({
    data: {
      userId: ownerId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      tags: data.tags,
      notes: data.notes,
      birthDate: data.birthDate,
      city: data.city,
    },
  });
  return { contact: created, created: true as const };
}

export interface CrmUpdateInput {
  name?: string | null;
  phone?: string | null; // "" أو null = مسح الرقم
  email?: string | null; // "" أو null = مسح الإيميل
  tags?: string[] | null; // replace كامل
  notes?: string | null;
  birthDate?: string | null; // "" أو null = مسح التاريخ
  city?: string | null; // "" أو null = مسح المدينة
}

export async function updateCrmContact(ownerId: string, id: string, input: CrmUpdateInput) {
  const existing = await prisma.contact.findFirst({
    where: { id, userId: ownerId, deletedAt: null },
  });
  if (!existing) {
    const err: any = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  const patch: { name?: string | null; phone?: string | null; email?: string | null; tags?: string[]; notes?: string | null; birthDate?: Date | null; city?: string | null } = {};
  if (input.name !== undefined) patch.name = cleanName(input.name);
  if (input.tags !== undefined) patch.tags = normalizeCrmTags(input.tags);
  if (input.notes !== undefined) patch.notes = cleanNotes(input.notes);
  if (input.birthDate !== undefined) patch.birthDate = requireBirthDateOrNull(input.birthDate);
  if (input.city !== undefined) {
    patch.city = typeof input.city === "string" && input.city.trim() ? input.city.trim().slice(0, 120) : null;
  }

  let nextPhone: string | null | undefined;
  let nextEmail: string | null | undefined;
  if (input.phone !== undefined) {
    if (!input.phone) nextPhone = null;
    else {
      const p = normalizeCrmPhone(input.phone);
      if (!p) {
        const err: any = new Error("INVALID_PHONE");
        err.code = "INVALID_PHONE";
        throw err;
      }
      nextPhone = p;
    }
    patch.phone = nextPhone;
  }
  if (input.email !== undefined) {
    if (!input.email) nextEmail = null;
    else {
      const e = normalizeCrmEmail(input.email);
      if (!e) {
        const err: any = new Error("INVALID_EMAIL");
        err.code = "INVALID_EMAIL";
        throw err;
      }
      nextEmail = e;
    }
    patch.email = nextEmail;
  }

  const finalPhone = nextPhone !== undefined ? nextPhone : existing.phone;
  const finalEmail = nextEmail !== undefined ? nextEmail : existing.email;
  if (!finalPhone && !finalEmail) {
    const err: any = new Error("PHONE_OR_EMAIL_REQUIRED");
    err.code = "PHONE_OR_EMAIL_REQUIRED";
    throw err;
  }

  try {
    return await prisma.contact.update({ where: { id }, data: patch });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const conflict: any = new Error("CONFLICT");
      conflict.code = "CONFLICT";
      throw conflict;
    }
    throw err;
  }
}

export async function deleteCrmContact(ownerId: string, id: string) {
  const existing = await prisma.contact.findFirst({
    where: { id, userId: ownerId },
    select: { id: true, deletedAt: true },
  });
  if (!existing) {
    const err: any = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!existing.deletedAt) {
    await prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  }
  return { ok: true };
}

export async function getCrmContact(ownerId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, userId: ownerId, deletedAt: null },
    select: {
      id: true, name: true, phone: true, email: true,
      tags: true, notes: true, birthDate: true, city: true,
      createdAt: true, updatedAt: true,
    },
  });
}
