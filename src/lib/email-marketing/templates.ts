import prisma from "@/lib/prisma";

export interface CreateTemplateInput {
  name: string;
  subject: string;
  bodyHtml: string;
  previewText?: string | null;
}

export async function getEmailTemplates(userId: string) {
  return prisma.emailTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getEmailTemplateById(userId: string, id: string) {
  return prisma.emailTemplate.findFirst({
    where: { id, userId },
  });
}

export async function createEmailTemplate(userId: string, input: CreateTemplateInput) {
  return prisma.emailTemplate.create({
    data: {
      userId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      bodyHtml: input.bodyHtml.trim(),
      previewText: input.previewText?.trim() || null,
    },
  });
}

export async function updateEmailTemplate(
  userId: string,
  id: string,
  input: Partial<CreateTemplateInput>
) {
  return prisma.emailTemplate.updateMany({
    where: { id, userId },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.subject ? { subject: input.subject.trim() } : {}),
      ...(input.bodyHtml ? { bodyHtml: input.bodyHtml.trim() } : {}),
      ...(input.previewText !== undefined ? { previewText: input.previewText?.trim() || null } : {}),
    },
  });
}

export async function deleteEmailTemplate(userId: string, id: string) {
  return prisma.emailTemplate.deleteMany({
    where: { id, userId },
  });
}
