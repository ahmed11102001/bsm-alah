import prisma from "@/lib/prisma";
import type { EmailContactStatus } from "@/app/email-marketing/types";

export interface CreateContactInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  tags?: string[];
  status?: EmailContactStatus;
}

export async function getEmailContacts(
  userId: string,
  options?: {
    search?: string;
    status?: EmailContactStatus;
    tag?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { userId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.tag) {
    where.tags = { has: options.tag };
  }

  if (options?.search) {
    const s = options.search.trim().toLowerCase();
    where.OR = [
      { email: { contains: s, mode: "insensitive" } },
      { firstName: { contains: s, mode: "insensitive" } },
      { lastName: { contains: s, mode: "insensitive" } },
      { tags: { has: s } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.emailContact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.emailContact.count({ where }),
  ]);

  return { contacts, total };
}

export async function createEmailContact(userId: string, input: CreateContactInput) {
  const email = input.email.trim().toLowerCase();

  const contact = await prisma.emailContact.upsert({
    where: {
      userId_email: {
        userId,
        email,
      },
    },
    create: {
      userId,
      email,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      tags: input.tags || ["عام"],
      status: (input.status as any) || "SUBSCRIBED",
    },
    update: {
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
      tags: input.tags || undefined,
      status: (input.status as any) || undefined,
    },
  });

  return contact;
}

export async function updateEmailContact(
  userId: string,
  contactId: string,
  data: Partial<CreateContactInput>
) {
  return prisma.emailContact.updateMany({
    where: { id: contactId, userId },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.status !== undefined ? { status: data.status as any } : {}),
    },
  });
}

export async function deleteEmailContact(userId: string, contactId: string) {
  return prisma.emailContact.deleteMany({
    where: { id: contactId, userId },
  });
}

export async function importEmailContacts(
  userId: string,
  contacts: CreateContactInput[]
) {
  let createdCount = 0;

  for (const c of contacts) {
    if (!c.email || !c.email.includes("@")) continue;
    try {
      await createEmailContact(userId, c);
      createdCount++;
    } catch (e) {
      console.error("[importEmailContacts] Failed to import contact:", c.email, e);
    }
  }

  return { importedCount: createdCount };
}
