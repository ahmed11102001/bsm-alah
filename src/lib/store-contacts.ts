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
  phone?: string | null;
  /** خام — بيتعمل له trim/lowercase هنا */
  email?: string | null;
  /** undefined = متلمسش الاسم (نفس سلوك Prisma مع القيم الفارغة) */
  updateName?: string;
  createName: string;
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

  if (phone) {
    const updateData: { name?: string; email?: string; updatedAt?: Date } = {};
    if (input.updateName !== undefined) updateData.name = input.updateName;
    if (email !== undefined) updateData.email = email;
    if (Object.keys(updateData).length === 0) updateData.updatedAt = new Date();
    try {
      return await prisma.contact.upsert({
        where: { phone_userId: { phone, userId } },
        update: updateData,
        create: { phone, email, userId, name: input.createName },
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
          },
        });
      }
      throw err;
    }
  }

  if (!email) {
    throw new Error("[store-contacts] upsertStoreContact requires phone or email");
  }
  const updateData: { name?: string; updatedAt?: Date } = {};
  if (input.updateName !== undefined) updateData.name = input.updateName;
  if (Object.keys(updateData).length === 0) updateData.updatedAt = new Date();
  return await prisma.contact.upsert({
    where: { email_userId: { email, userId } },
    update: updateData,
    create: { email, userId, name: input.createName },
  });
}
