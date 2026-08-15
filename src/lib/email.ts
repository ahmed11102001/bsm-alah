// Server-only email transport. SMTP credentials are never returned or logged.
import nodemailer from "nodemailer";

const DEFAULT_FROM = "Wani <support@aiwni.com>";

function getTransporter() {
  const host = process.env.SMTP_HOST || "mx.bareed24.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "support@aiwni.com";
  const pass = process.env.SMTP_PASSWORD;
  if (!pass) throw new Error("SMTP is not configured");

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  });
}

function getFrom() {
  return process.env.SMTP_FROM || DEFAULT_FROM;
}

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) throw new Error("Application URL is not configured");
  return baseUrl.replace(/\/$/, "");
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  await getTransporter().sendMail({ from: getFrom(), to, subject, html });
}

export async function sendResetEmail(to: string, token: string) {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "إعادة تعيين كلمة المرور — واني",
    html: `<div dir="rtl" style="font-family:sans-serif;background:#f4f4f5;padding:32px"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e4e7"><div style="text-align:center;margin-bottom:24px"><strong style="background:#25D366;color:#fff;border-radius:12px;padding:12px 20px">واني</strong></div><h2>إعادة تعيين كلمة المرور</h2><p style="color:#555;line-height:1.6">استلمنا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر التالي لاختيار كلمة مرور جديدة.</p><p style="text-align:center"><a href="${resetUrl}" style="display:inline-block;background:#25D366;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">إعادة تعيين كلمة المرور</a></p><p style="color:#999;font-size:13px">هذا الرابط صالح لمدة ساعة واحدة فقط.</p><p style="color:#999;font-size:13px">إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة بأمان.</p><hr><p style="color:#bbb;font-size:12px;text-align:center">واني · الدعم: support@aiwni.com</p></div></div>`,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${getBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "تأكيد بريدك الإلكتروني — واني",
    html: `<div dir="rtl" style="font-family:sans-serif;background:#f4f4f5;padding:32px"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e4e7"><div style="text-align:center;margin-bottom:24px"><strong style="background:#25D366;color:#fff;border-radius:12px;padding:12px 20px">واني</strong></div><h2>مرحبًا بك في واني</h2><p style="color:#555;line-height:1.6">تم طلب إنشاء حساب باستخدام هذا البريد الإلكتروني. اضغط على الزر التالي لتأكيد بريدك الإلكتروني وتفعيل الحساب.</p><p style="text-align:center"><a href="${verifyUrl}" style="display:inline-block;background:#25D366;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">تأكيد البريد الإلكتروني</a></p><p style="color:#999;font-size:13px">هذا الرابط صالح لمدة 24 ساعة فقط.</p><p style="color:#999;font-size:13px">إذا لم تطلب إنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.</p><hr><p style="color:#bbb;font-size:12px;text-align:center">واني · الدعم: support@aiwni.com</p></div></div>`,
  });
}

export async function sendDeveloperResetEmail(to: string, firstName: string, token: string) {
  const resetUrl = `${getBaseUrl()}/developers/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "استعادة كلمة المرور - بوابة المطورين",
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6"><h2>مرحبًا ${firstName}</h2><p>تم طلب إعادة تعيين كلمة المرور لحسابك في بوابة المطورين.</p><p>الرابط صالح لمدة ساعة واحدة:</p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#20d378;color:#060810;text-decoration:none;border-radius:5px;font-weight:bold">تغيير كلمة المرور</a><p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p><p style="color:#777">Wani · support@aiwni.com</p></div>`,
  });
}
