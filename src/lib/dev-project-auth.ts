import prisma from "@/lib/prisma";

// وصول كامل (قراءة/كتابة) — للمطور النشط أو الأونر، بيتستخدم في كل الصفحات العادية
export async function getProjectForOwnerOrDeveloper(projectId: string, userId: string) {
  return prisma.developerProject.findFirst({
    where: {
      id: projectId,
      status: "ACTIVE",
      OR: [
        { developerId: userId, developerRemovedAt: null },
        { ownerId: userId }
      ],
    },
  });
}

// وصول حصري للأونر بس — يتستخدم في transfer/route.ts (شيل/ضيف مطور) و billing/route.ts (شراء باقة)
export async function getProjectForOwner(projectId: string, ownerId: string) {
  return prisma.developerProject.findFirst({
    where: { 
      id: projectId, 
      ownerId, 
      status: "ACTIVE" 
    },
  });
}
