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
  const verifyUrl = `${getBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
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

export async function sendTeamInviteEmail({
  to,
  name,
  inviterName,
  workspaceName,
  role,
  joinCode,
  expiresHours = 48,
}: {
  to: string;
  name?: string | null;
  inviterName?: string | null;
  workspaceName?: string | null;
  role: "FULL_ACCESS" | "CHAT_ONLY" | string;
  joinCode: string;
  expiresHours?: number;
}) {
  const loginUrl = `${getBaseUrl()}/?login=join&email=${encodeURIComponent(to)}&code=${encodeURIComponent(joinCode)}`;
  const roleLabel = role === "FULL_ACCESS" ? "مسؤول — تحكم كامل (Admin)" : "وكيل — رد على المحادثات (Chat Only)";
  const teamLabel = workspaceName || inviterName || "Wani";
  const recipientName = name ? name.trim() : "";

  await sendEmail({
    to,
    subject: `دعوة للانضمام إلى فريق ${teamLabel} — واني`,
    html: `
<div dir="rtl" style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f5f7;padding:32px 16px;color:#1e293b">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:36px 28px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
    
    <!-- Logo Header -->
    <div style="text-align:center;margin-bottom:28px">
      <span style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:1px;border-radius:14px;padding:10px 24px">
        WANI · واني
      </span>
    </div>

    <!-- Title -->
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center">
      دعوة للانضمام إلى الفريق 🎉
    </h2>

    <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 12px">
      مرحبًا ${recipientName ? `<strong>${recipientName}</strong> 👋` : "بك 👋"}
    </p>

    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 20px">
      تمت دعوتك من قبل <strong>${inviterName || "مدير الفريق"}</strong> للانضمام إلى فريق عمل <strong>${teamLabel}</strong> على منصة واني.
    </p>

    <!-- Role Card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#334155">
      <span style="color:#64748b">الصلاحية الممنوحة:</span>
      <strong style="color:#0f172a;margin-right:6px">${roleLabel}</strong>
    </div>

    <!-- Join Code Box with Copy & Auto-fill -->
    <div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:16px;padding:24px 16px;text-align:center;margin:0 0 24px">
      <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#166534;margin:0 0 8px">
        كود الانضمام الخاص بك (اضغط لتحديده أو نسخه)
      </p>
      <div style="display:inline-block;background:#ffffff;border:1px solid #bbf7d0;padding:12px 24px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-bottom:12px">
        <code style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:800;letter-spacing:3px;color:#15803d;user-select:all;-webkit-user-select:all;-moz-user-select:all;display:inline-block">
          ${joinCode}
        </code>
      </div>
      
      <div style="margin-top:6px;margin-bottom:8px">
        <a href="${loginUrl}" style="display:inline-block;background:#dcfce7;color:#166534;border:1px solid #86efac;padding:8px 18px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">
          📋 نسخ الكود والانتقال لصفحة الانضمام تلقائيًا
        </a>
      </div>

      <p style="font-size:12px;color:#16a34a;margin:10px 0 0">
        هذا الكود مخصص لك فقط، صالح لمدة ${expiresHours} ساعة
      </p>
    </div>

    <!-- Main CTA Button -->
    <div style="text-align:center;margin:0 0 24px">
      <a href="${loginUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3)">
        الانضمام إلى الفريق الآن ←
      </a>
    </div>

    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 16px;text-align:center">
      عند الضغط على الزر، سيتم فتح صفحة الانضمام وملء بريدك وكود الانضمام مباشرة وبشكل آمن.
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 20px" />

    <!-- Footer -->
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0">
      منصة واني لأتمتة وخدمة عملاء واتساب · الدعم: <a href="mailto:support@aiwni.com" style="color:#25D366;text-decoration:none">support@aiwni.com</a>
    </p>

  </div>
</div>
    `,
  });
}

