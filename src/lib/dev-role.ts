// src/lib/dev-role.ts
// ─── هل الحساب ده "أونر بس" ولا "مطوّر"؟ ─────────────────────────────────────
// أونر بس = مالوش أي مشروع هو developerId فيه، وعنده مشروع واحد على الأقل ownerId فيه.
// المطور (حتى لو أونر لمشروع تاني كمان) بيفضل معاه كل صلاحياته.

import prisma from "@/lib/prisma";

export async function isOwnerOnlyAccount(userId: string): Promise<boolean> {
  const developerProjectCount = await prisma.developerProject.count({
    where: { developerId: userId },
  });
  if (developerProjectCount > 0) return false;

  const ownerProjectCount = await prisma.developerProject.count({
    where: { ownerId: userId },
  });
  return ownerProjectCount > 0;
}

// أحدث مشروع الأونر عضو فيه (لإعادة التوجيه المباشر بعد اللوجين)
export async function getLatestOwnedProjectId(userId: string): Promise<string | null> {
  const project = await prisma.developerProject.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return project?.id ?? null;
}