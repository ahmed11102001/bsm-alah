import nodemailer from "nodemailer";
import { getEmailConnection } from "./connection";
import { buildUnsubscribeUrl } from "./unsubscribe-token";

export interface SendEmailPayload {
  to: string;
  recipientName?: string | null;
  subject: string;
  html: string;
  previewText?: string | null;
  /** لازم لبناء رابط Unsubscribe في فوتر الإيميل. اختياري بس لحالة test-send
   *  (معاينة قالب لإيميل الأدمن نفسه — مش إرسال تسويقي حقيقي لعميل) — لو
   *  مش موجود، الفوتر ميتضافش. أي إرسال حقيقي لحملة/أتمتة لازم يبعته دايمًا. */
  contactId?: string;
  /**
   * Message-ID ثابت (deterministic) للرسالة — يُستخدم لربط محاولات إعادة
   * الإرسال لنفس الـ delivery بنفس الـ ID (يُسهّل dedup عند المستلم ويظهر
   * في الـ logs). لو مش موجود، nodemailer بيولّد واحد عشوائي.
   */
  messageId?: string;
}

/**
 * بيضيف فوتر ثابت فيه رابط Unsubscribe موقّع في آخر أي إيميل تسويقي.
 * الرابط يستخدم token موقّع بـ HMAC (`?t=...`) — مش الـ Contact ID الخام —
 * عشان محدش يقدر يخمّن/يتلاعب في IDs ويلغي اشتراك contacts تانية.
 * نقطة واحدة مشتركة يمر بيها كل إرسال (حملة أو أتمتة) — بدل ما كل ملف
 * يكتب الفوتر ده بنفسه ويتنسى في مكان.
 */
export function wrapWithUnsubscribeFooter(html: string, contactId: string): string {
  const unsubscribeUrl = buildUnsubscribeUrl(contactId);
  const footer = `
    <hr style="margin-top:24px;border:none;border-top:1px solid #e5e5e5" />
    <p style="font-size:12px;color:#888;margin-top:12px;font-family:sans-serif">
      لو مش عايز تستقبل رسايل زي دي تاني،
      <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline">إلغاء الاشتراك</a>
    </p>
  `;
  return `${html}${footer}`;
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

    const bodyWithVars = payload.html
      .replace(/\{\{name\}\}/g, nameToUse)
      .replace(/\{\{email\}\}/g, payload.to);
    const personalizedHtml = payload.contactId
      ? wrapWithUnsubscribeFooter(bodyWithVars, payload.contactId)
      : bodyWithVars;

    const info = await transporter.sendMail({
      from: `"${connection.fromName}" <${connection.fromEmail}>`,
      to: payload.to,
      subject: personalizedSubject,
      html: personalizedHtml,
      // ثابت لكل delivery — محاولات الإعادة تحمل نفس الـ Message-ID
      ...(payload.messageId ? { messageId: payload.messageId } : {}),
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
