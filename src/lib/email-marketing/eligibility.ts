// src/lib/email-marketing/eligibility.ts
// ─── قاعدة الأهلية الموحّدة لإيميل تسويقي (حملات + كل الأتمتات) ────────────────
//
// المشكلة اللي بيحلها الملف ده: فلتر `emailStatus: "SUBSCRIBED"` الحرفي كان
// بيستبعد أي Contact عنده emailStatus = null (كل Contact اتضاف من الـCRM أو
// من أوردر متجر عبر upsertStoreContact، لأن محدش كان بيحط القيمة دي) —
// يعني بيتفلتر من كل حملة/أتمتة من غير ما حد يلاحظ. وفي نفس الوقت، أتمتات
// كتير كانت أصلاً مش بتتحقق من emailStatus خالص، فعميل عمل Unsubscribe
// فعليًا كان لسه بيستقبل رسايل من الأتمتات.
//
// الحل: نقطة واحدة (`emailEligibilityWhere`) تتستخدم في كل مكان بيحدد مين
// يستاهل يستقبل إيميل تسويقي — بدل ما كل ملف يعمل الفلتر بطريقته.
//
// ⚠️ تنبيه فني: في Prisma، `emailStatus: { notIn: [...] }` مبيطابقش الصفوف
// اللي قيمتها null (نفس سلوك SQL NOT IN مع NULL). لازم الـOR الصريح اللي
// تحت، مش notIn لوحدها — وإلا هنرجع لنفس مشكلة استبعاد الـCRM/الاستور.

export const UNSUBSCRIBED_EMAIL_STATUSES = ["UNSUBSCRIBED", "BOUNCED"] as const;

/**
 * شرط Prisma `where` لتحديد الـContacts المؤهلين لإيميل تسويقي:
 *   - عندهم إيميل فعليًا
 *   - وحالتهم مش UNSUBSCRIBED ولا BOUNCED (null = "لسه محدد حالته"، بيتعامل
 *     كمؤهل مش كمستبعد، عشان محدش يتفلتر بالغلط لمجرد إن حد نسي يحط القيمة)
 *
 * الاستخدام: دمجها مع أي شروط تانية (userId, tags, ...) في where الاستعلام.
 */
export function emailEligibilityWhere(userId: string) {
  return {
    userId,
    email: { not: null },
    OR: [
      { emailStatus: null },
      { emailStatus: { notIn: [...UNSUBSCRIBED_EMAIL_STATUSES] } },
    ],
  };
}

/**
 * نفس المنطق، بس كفحص على object Contact جاهز في الذاكرة (مفيد لو الكود
 * جايب الـContact من مكان تاني ومحتاج يتأكد من الأهلية قبل الإرسال مباشرة،
 * بدل ما يعمل استعلام Prisma جديد).
 */
export function isEligibleForMarketingEmail(contact: {
  email: string | null;
  emailStatus: string | null;
}): boolean {
  if (!contact.email) return false;
  if (contact.emailStatus == null) return true;
  return !(UNSUBSCRIBED_EMAIL_STATUSES as readonly string[]).includes(contact.emailStatus);
}
