/**
 * سكريبت إضافة إشعارات تجريبية للمطور
 * الاستخدام: npx tsx scripts/seed-dev-notifications.ts <developer-email>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("❌ يرجى تمرير إيميل المطور كـ argument");
    console.error("   مثال: npx tsx scripts/seed-dev-notifications.ts dev@example.com");
    process.exit(1);
  }

  const dev = await prisma.developerUser.findUnique({ where: { email } });
  if (!dev) {
    console.error(`❌ لم يتم العثور على مطور بالإيميل: ${email}`);
    process.exit(1);
  }

  console.log(`✅ تم العثور على المطور: ${dev.firstName} ${dev.lastName} (${dev.id})`);

  const notifications = [
    {
      developerId: dev.id,
      type: "META_UPDATE" as const,
      title: "تم قبول قالب OTP ✅",
      message: "تمت الموافقة على قالب 'otp_verification' من Meta وأصبح جاهزاً للاستخدام في الإنتاج.",
      isRead: false,
      link: "/developers/portal",
    },
    {
      developerId: dev.id,
      type: "META_UPDATE" as const,
      title: "تم رفض قالب التسويق ❌",
      message: "تم رفض قالب 'promo_offer' من Meta. السبب: المحتوى لا يتوافق مع سياسات المنصة. يرجى تعديله وإعادة الإرسال.",
      isRead: false,
    },
    {
      developerId: dev.id,
      type: "BILLING" as const,
      title: "تم خصم رصيد الرسائل",
      message: "تم خصم 150 رسالة من رصيدك. الرصيد المتبقي: 850 رسالة. يمكنك إعادة الشحن من لوحة التحكم.",
      isRead: false,
      link: "/developers/portal",
    },
    {
      developerId: dev.id,
      type: "SECURITY" as const,
      title: "تسجيل دخول من جهاز جديد 🔐",
      message: "تم تسجيل دخول ناجح لحسابك من Windows 11 - Chrome. إذا لم تكن أنت، قم بتغيير كلمة المرور فوراً.",
      isRead: false,
    },
    {
      developerId: dev.id,
      type: "SYSTEM" as const,
      title: "تحديث نظام جديد 🚀",
      message: "تم إصدار نسخة v2.5 من API مع دعم الرسائل التفاعلية. راجع التوثيق للتعرف على الميزات الجديدة.",
      isRead: true,
      link: "/developers/portal/endpoints",
    },
  ];

  const result = await prisma.developerNotification.createMany({
    data: notifications,
  });

  console.log(`🎉 تم إنشاء ${result.count} إشعارات تجريبية بنجاح!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
