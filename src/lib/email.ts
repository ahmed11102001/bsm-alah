// src/lib/email.ts
// Resend بيتعمل lazy — مش وقت الـ import عشان نتجنب build error لو الـ key مش موجود
import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY غير موجود في الـ environment variables");
  return new Resend(key);
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? "واتس برو <no-reply@whatspro.app>";
}

function getBase(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

// ── Reset Password ────────────────────────────────────────────────────────────
export async function sendResetEmail(to: string, token: string) {
  const resetUrl = `${getBase()}/reset-password?token=${token}`;

  const { error } = await getResend().emails.send({
    from:    getFrom(),
    to,
    subject: "إعادة تعيين كلمة المرور — واتس برو",
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <body style="font-family:sans-serif;background:#f4f4f5;padding:32px;margin:0">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e4e7">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;background:#25D366;border-radius:12px;padding:12px 20px">
              <span style="color:#fff;font-size:18px;font-weight:bold">واتس برو</span>
            </div>
          </div>
          <h2 style="color:#111;margin:0 0 12px;font-size:20px">إعادة تعيين كلمة المرور</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 24px">
            استلمنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك.
            انقر على الزر أدناه لتعيين كلمة مرور جديدة.
          </p>
          <div style="text-align:center;margin:0 0 24px">
            <a href="${resetUrl}"
               style="display:inline-block;background:#25D366;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
              إعادة تعيين كلمة المرور
            </a>
          </div>
          <p style="color:#999;font-size:13px;margin:0 0 8px">
            ⏱ هذا الرابط صالح لمدة ساعة واحدة فقط.
          </p>
          <p style="color:#999;font-size:13px;margin:0">
            إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذا الإيميل بأمان.
          </p>
          <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
          <p style="color:#bbb;font-size:12px;text-align:center;margin:0">
            واتس برو · الإسكندرية، مصر
          </p>
        </div>
      </body>
      </html>
    `,
  });

  if (error) throw new Error(error.message);
}