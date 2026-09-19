// src/lib/store-contacts.ts
// ─── إيجاد/إنشاء Contact لعميل متجر — منطق موحد للمزودين التلاتة ────────────
// الأولوية: الرقم أولًا (السلوك الأساسي القديم)، ثم الإيميل.
//  - لو فيه رقم → بحث/إنشاء بـ phone_userId، وتحديث الإيميل لو موجود في الأوردر
//    (ولو مش موجود، اللي في الـDB بيفضل زي ما هو — مفيش مسح).
//  - لو مفيش رقم بس فيه إيميل → بحث/إنشاء بـ email_userId (صف بدون رقم).
//  - لو مفيش الاتنين → throw (الكولر هو اللي يقرر يعمل skip).

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface StoreContactInput {
  userId: string;
  /** الرقم بعد التنظيف من الكولر — فاضي/undefined = مفيش رقم */
  phone?: string | null;   // already cleaned by caller (may be "" → treated as absent)
  /** خام — بيتعمل له trim/lowercase هنا */
  email?: string | null;
  /** undefined = متلمسش الاسم (نفس سلوك Prisma مع القيم الفارغة) */
  updateName?: string;
  createName: string;
  /** تاريخ الميلاد (مبعوت → يتحدث/يتسجل، مش مبعوت → اللي موجود بيفضل) */
  birthDate?: Date | null;
  /** المدينة (نفس سلوك تاريخ الميلاد) */
  city?: string | null;
}

function isUniqueConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export function normalizeContactEmail(email?: string | null): string | undefined {
  const v = email?.trim().toLowerCase();
  return v ? v : undefined;
}

export async function upsertStoreContact(input: StoreContactInput) {
  const { userId } = input;
  const phone = input.phone?.trim() ? input.phone : undefined;
  const email = normalizeContactEmail(input.email);
  const birthDate = input.birthDate instanceof Date ? input.birthDate : undefined;
  const city = typeof input.city === "string" && input.city.trim() ? input.city.trim().slice(0, 120) : undefined;

  if (phone) {
    const updateData: { name?: string; email?: string; birthDate?: Date; city?: string; updatedAt?: Date } = {};
    if (input.updateName !== undefined) updateData.name = input.updateName;
    if (email !== undefined) updateData.email = email;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (city !== undefined) updateData.city = city;
    if (Object.keys(updateData).length === 0) updateData.updatedAt = new Date();
    try {
      return await prisma.contact.upsert({
        where: { phone_userId: { phone, userId } },
        update: updateData,
        create: { phone, email, birthDate, city, userId, name: input.createName },
      });
    } catch (err) {
      if (isUniqueConflict(err) && email) {
        // الإيميل مربوط بصف بدون رقم (اتعمل من أوردر إيميل-بس قبل كده) →
        // ادمج الرقم الجديد في نفس الصف بدل ما يتعمل صف مكرر
        return await prisma.contact.update({
          where: { email_userId: { email, userId } },
          data: {
            phone,
            ...(input.updateName !== undefined ? { name: input.updateName } : {}),
            ...(birthDate !== undefined ? { birthDate } : {}),
            ...(city !== undefined ? { city } : {}),
          },
        });
      }
      throw err;
    }
  }

  if (!email) {
    throw new Error("[store-contacts] upsertStoreContact requires phone or email");
  }
  const emailUpdateData: { name?: string; birthDate?: Date; city?: string; updatedAt?: Date } = {};
  if (input.updateName !== undefined) emailUpdateData.name = input.updateName;
  if (birthDate !== undefined) emailUpdateData.birthDate = birthDate;
  if (city !== undefined) emailUpdateData.city = city;
  if (Object.keys(emailUpdateData).length === 0) emailUpdateData.updatedAt = new Date();
  return await prisma.contact.upsert({
    where: { email_userId: { email, userId } },
    update: emailUpdateData,
    create: { email, birthDate, city, userId, name: input.createName },
  });
}
