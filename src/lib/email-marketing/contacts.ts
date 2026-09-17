import prisma from "@/lib/prisma";
import type { EmailContactStatus } from "@/app/email-marketing/types";

export interface CreateContactInput {
  email: string;
  name?: string | null;
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
  const where: any = {
    userId,
    email: { not: null }, // Only contacts that have email (email channel)
  };

  if (options?.status) {
    where.emailStatus = options.status;
  }

  if (options?.tag) {
    where.tags = { has: options.tag };
  }

  if (options?.search) {
    const s = options.search.trim().toLowerCase();
    where.OR = [
      { email: { contains: s, mode: "insensitive" } },
      { name: { contains: s, mode: "insensitive" } },
      { tags: { has: s } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    contacts: contacts.map((c) => ({
      id: c.id,
      email: c.email || "",
      name: c.name,
      firstName: c.name ? c.name.split(" ")[0] : null,
      lastName: c.name ? c.name.split(" ").slice(1).join(" ") : null,
      phone: c.phone,
      tags: c.tags,
      status: c.emailStatus || "SUBSCRIBED",
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function createEmailContact(userId: string, input: CreateContactInput) {
  const email = input.email.trim().toLowerCase();

  const contact = await prisma.contact.upsert({
    where: {
      email_userId: {
        userId,
        email,
      },
    },
    create: {
      userId,
      email,
      name: input.name?.trim() || null,
      tags: input.tags || ["عام"],
      emailStatus: (input.status as any) || "SUBSCRIBED",
    },
    update: {
      name: input.name?.trim() || undefined,
      tags: input.tags || undefined,
      emailStatus: (input.status as any) || undefined,
    },
  });

  return {
    id: contact.id,
    email: contact.email || "",
    name: contact.name,
    firstName: contact.name ? contact.name.split(" ")[0] : null,
    lastName: contact.name ? contact.name.split(" ").slice(1).join(" ") : null,
    phone: contact.phone,
    tags: contact.tags,
    status: contact.emailStatus || "SUBSCRIBED",
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export async function updateEmailContact(
  userId: string,
  contactId: string,
  data: Partial<CreateContactInput>
) {
  return prisma.contact.updateMany({
    where: { id: contactId, userId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.status !== undefined ? { emailStatus: data.status as any } : {}),
    },
  });
}

export async function deleteEmailContact(userId: string, contactId: string) {
  return prisma.contact.deleteMany({
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
