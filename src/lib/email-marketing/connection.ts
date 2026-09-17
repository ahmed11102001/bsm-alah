import prisma from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";

export interface SmtpInputData {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  fromEmail: string;
  fromName: string;
}

export async function getEmailConnection(userId: string) {
  const connection = await prisma.emailConnection.findUnique({
    where: { userId },
  });

  if (!connection) return null;

  let decryptedPassword = "";
  try {
    decryptedPassword = connection.password ? decryptToken(connection.password) : "";
  } catch (err) {
    console.error("[email-marketing] Failed to decrypt SMTP password:", err);
  }

  return {
    id: connection.id,
    host: connection.host,
    port: connection.port,
    secure: connection.secure,
    user: connection.userLogin,
    password: decryptedPassword,
    fromEmail: connection.fromEmail,
    fromName: connection.fromName,
    lastTestedAt: connection.lastTestedAt?.toISOString() || null,
    lastTestSuccess: connection.lastTestSuccess,
    isConfigured: true,
  };
}

export async function saveEmailConnection(userId: string, data: SmtpInputData) {
  const existing = await prisma.emailConnection.findUnique({
    where: { userId },
  });

  // إذا لم يتم تمرير كلمة مرور جديدة، نحتفظ بالقديمة
  let passwordToSave = existing?.password || "";
  if (data.password && data.password.trim()) {
    passwordToSave = encryptToken(data.password.trim());
  }

  const saved = await prisma.emailConnection.upsert({
    where: { userId },
    create: {
      userId,
      host: data.host.trim(),
      port: Number(data.port) || 587,
      secure: Boolean(data.secure),
      userLogin: data.user.trim(),
      password: passwordToSave,
      fromEmail: data.fromEmail.trim().toLowerCase(),
      fromName: data.fromName.trim(),
    },
    update: {
      host: data.host.trim(),
      port: Number(data.port) || 587,
      secure: Boolean(data.secure),
      userLogin: data.user.trim(),
      ...(data.password?.trim() ? { password: passwordToSave } : {}),
      fromEmail: data.fromEmail.trim().toLowerCase(),
      fromName: data.fromName.trim(),
    },
  });

  return saved;
}

export async function updateEmailConnectionTestResult(
  userId: string,
  success: boolean
) {
  return prisma.emailConnection.updateMany({
    where: { userId },
    data: {
      lastTestedAt: new Date(),
      lastTestSuccess: success,
    },
  });
}

export async function deleteEmailConnection(userId: string) {
  return prisma.emailConnection.deleteMany({
    where: { userId },
  });
}
