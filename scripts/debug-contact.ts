// scripts/debug-contact.ts
// شغّله كده: npx tsx scripts/debug-contact.ts 01XXXXXXXXX
// (أو أي صيغة للرقم — هيدور بـ LIKE على آخر 8 أرقام عشان يلقط كل الصيغ)

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const rawPhone = process.argv[2];
    if (!rawPhone) {
        console.error("استخدم: npx tsx scripts/debug-contact.ts 01XXXXXXXXX");
        process.exit(1);
    }

    const digitsOnly = rawPhone.replace(/\D/g, "");
    const last8 = digitsOnly.slice(-8);

    console.log(`\n🔍 بدور على أي رقم فيه: ...${last8}\n`);

    // 1) كل الـ contacts اللي رقمهم يحتوي على آخر 8 أرقام
    const contacts = await prisma.contact.findMany({
        where: { phone: { contains: last8 } },
        select: {
            id: true, phone: true, name: true, userId: true,
            isArchived: true, deletedAt: true, lastMessageAt: true,
            unreadCount: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    console.log("📇 Contacts:");
    console.table(contacts);

    if (contacts.length === 0) {
        console.log("\n⚠️  مفيش أي contact مسجل بالرقم ده خالص — يبقى المشكلة قبل الداتابيز (الـ webhook مش بيستقبل/بيرفض الرسالة).");
        await prisma.$disconnect();
        return;
    }

    if (contacts.length > 1) {
        console.log(`\n⚠️  لقيت ${contacts.length} contacts بنفس الرقم تقريبًا — فيه احتمال duplicate بسبب اختلاف صيغة الرقم بين أماكن مختلفة في الكود.\n`);
    }

    // 2) رسائل كل contact لقيناه
    for (const c of contacts) {
        const messages = await prisma.message.findMany({
            where: { contactId: c.id },
            select: {
                id: true, whatsappId: true, direction: true, type: true,
                content: true, status: true, deletedAt: true, createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });
        console.log(`\n💬 رسائل الـ contact ${c.id} (phone: ${c.phone}, userId: ${c.userId}):`);
        console.table(messages);
    }

    // 3) فحص تكرار نفس الرقم تحت أكتر من userId
    const grouped = await prisma.contact.groupBy({
        by: ["phone", "userId"],
        where: { phone: { contains: last8 } },
        _count: true,
    });
    console.log("\n👥 توزيع الرقم على الـ users:");
    console.table(grouped);

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});