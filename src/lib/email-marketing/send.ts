// src/lib/email-marketing/send.ts
// ─── إرسال مباشر عبر SMTP مربوط (raw EmailConnection row) ───────────────────
// عكس sendEmailViaUserSmtp اللي بيجيب الـ connection بنفسه من userId، الدالة
// دي بتستقبل صف الـ connection الجاهز (باسورد مشفّر) — للاستخدام من فانكشنز
// Inngest اللي جابت الـ connection ضمن كويري أكبر.
// ملحوظة: لا تعمل استبدال متغيرات ({{name}}...) — الكولر مسؤول عنه قبل النداء.

import nodemailer from "nodemailer";
import { decryptToken } from "@/lib/crypto";

export interface ProviderConnection {
  host: string | null;
  port: number | null;
  secure: boolean | null;
  userLogin: string | null;
  password: string;
  fromEmail: string;
  fromName: string;
}

export interface ProviderSendPayload {
  connection: ProviderConnection;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmailViaProvider({
  connection,
  to,
  subject,
  html,
}: ProviderSendPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const target = (to || "").trim();
  if (!target) {
    return { success: false, error: "لا يوجد بريد مستلم." };
  }
  if (!connection || !connection.host || !connection.userLogin) {
    return { success: false, error: "بيانات الاتصال غير مكتملة." };
  }

  let password: string;
  try {
    password = decryptToken(connection.password);
  } catch {
    return { success: false, error: "تعذر فك تشفير كلمة مرور SMTP." };
  }
  if (!password) {
    return { success: false, error: "كلمة مرور SMTP فارغة." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: connection.host.trim(),
      port: Number(connection.port) || 587,
      secure: Boolean(connection.secure),
      auth: {
        user: connection.userLogin.trim(),
        pass: password,
      },
      connectionTimeout: 10000,
      socketTimeout: 20000,
    });

    const info = await transporter.sendMail({
      from: `"${connection.fromName}" <${connection.fromEmail}>`,
      to: target,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[email-marketing] Provider send failed to ${target}:`, error);
    return { success: false, error: error?.message || "فشل إرسال الرسالة عبر خادم SMTP." };
  }
}
