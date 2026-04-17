import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Safe database query wrapper
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await queryFn();
    return { data, error: null };
  } catch (error) {
    const errorMessage = getDBErrorMessage(error);
    console.error("[DB Error]", errorMessage);
    return { data: null, error: errorMessage };
  }
}

/**
 * Get user with proper error handling
 */
export async function getUser(userId: string) {
  return safeQuery(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        // Don't select password
      },
    })
  );
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return safeQuery(() =>
    prisma.user.findUnique({
      where: { email },
    })
  );
}

/**
 * Create user
 */
export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}) {
  return safeQuery(() =>
    prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })
  );
}

/**
 * Update user
 */
export async function updateUser(userId: string, data: Partial<{
  name: string;
  phone: string;
}>) {
  return safeQuery(() =>
    prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    })
  );
}

/**
 * Get audiences for user
 */
export async function getAudiences(userId: string) {
  return safeQuery(() =>
    prisma.audience.findMany({
      where: {
        userId,
      },
      include: {
        contacts: true,
      },
    })
  );
}
/**
 * Create audience with contacts
 * تم إضافة userId لكل جهة اتصال لأنها حقل إجباري في الـ Schema
 */
export async function createAudience(userId: string, data: {
  name: string;
  contacts: string[];
}) {
  return safeQuery(() =>
    prisma.audience.create({
      data: {
        name: data.name,
        userId,
        contacts: {
          create: data.contacts.map((phone) => ({
            phone,
            // السطر ده هو اللي هيخلي الـ Build يعدي بنجاح
            userId: userId, 
          })),
        },
      },
      include: {
        contacts: true,
      },
    })
  );
}
/**
 * Get campaigns
 */
export async function getCampaigns(userId: string) {
  return safeQuery(() =>
    prisma.campaign.findMany({
      where: {
        userId,
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

/**
 * Create campaign
 */
export async function createCampaign(userId: string, data: {
  name?: string;
  status?: string;
}) {
  return safeQuery(() =>
    prisma.campaign.create({
      data: {
        name: data.name || "Unnamed Campaign",
        status: data.status || "pending",
        userId,
      },
    })
  );
}

/**
 * Update campaign
 */
export async function updateCampaign(campaignId: string, data: Partial<{
  status: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
}>) {
  return safeQuery(() =>
    prisma.campaign.update({
      where: { id: campaignId },
      data,
    })
  );
}

/**
 * Parse Prisma errors
 */
function getDBErrorMessage(error: any): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "This record already exists";
      case "P2025":
        return "Record not found";
      case "P2003":
        return "Invalid reference";
      case "P2014":
        return "Required relation violation";
      default:
        return `Database error: ${error.message}`;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid database query";
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return "Database connection error";
  }

  return "Unknown database error";
}

/**
 * Transaction helper
 */
export async function runTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return safeQuery(() => prisma.$transaction(callback));
}
