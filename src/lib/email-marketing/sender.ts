import nodemailer from "nodemailer";
import { getEmailConnection } from "./connection";

export interface SendEmailPayload {
  to: string;
  recipientName?: string | null;
  subject: string;
  html: string;
  previewText?: string | null;
}

export async function sendEmailViaUserSmtp(
  userId: string,
  payload: SendEmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const connection = await getEmailConnection(userId);

  if (!connection || !connection.host || !connection.user || !connection.password) {
    return {
      success: false,
      error: "لم يتم العثور على خادم SMTP مربوط أو بيانات الاتصال غير مكتملة.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: connection.host.trim(),
      port: Number(connection.port) || 587,
      secure: Boolean(connection.secure),
      auth: {
        user: connection.user.trim(),
        pass: connection.password.trim(),
      },
      connectionTimeout: 10000,
      socketTimeout: 20000,
    });

    // استبدال المتغيرات في المحتوى والعنوان
    const nameToUse = payload.recipientName || "";
    const personalizedSubject = payload.subject
      .replace(/\{\{name\}\}/g, nameToUse)
      .replace(/\{\{email\}\}/g, payload.to);

    const personalizedHtml = payload.html
      .replace(/\{\{name\}\}/g, nameToUse)
      .replace(/\{\{email\}\}/g, payload.to);

    const info = await transporter.sendMail({
      from: `"${connection.fromName}" <${connection.fromEmail}>`,
      to: payload.to,
      subject: personalizedSubject,
      html: personalizedHtml,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error(`[email-marketing] Failed to send email to ${payload.to}:`, error);
    return {
      success: false,
      error: error?.message || "فشل إرسال الرسالة عبر خادم SMTP.",
    };
  }
}
