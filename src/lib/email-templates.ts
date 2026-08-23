// src/lib/email-templates.ts
import type { Locale } from "@/lib/i18n";

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

function emailWrapper({
  locale,
  title,
  contentHtml,
  footerHtml,
}: {
  locale: Locale;
  title?: string;
  contentHtml: string;
  footerHtml?: string;
}): string {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const lang = isAr ? "ar" : "en";
  const fontFamily = isAr
    ? "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    : "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const defaultFooter = isAr
    ? `منصة واني لأتمتة وخدمة عملاء واتساب · الدعم: <a href="mailto:support@aiwni.com" style="color:#25D366;text-decoration:none;font-weight:600">support@aiwni.com</a>`
    : `Wani WhatsApp Business & Automation Platform · Support: <a href="mailto:support@aiwni.com" style="color:#25D366;text-decoration:none;font-weight:600">support@aiwni.com</a>`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title || (isAr ? "واني" : "Wani")}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:${fontFamily};color:#1e293b;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div dir="${dir}" style="background-color:#f4f5f7;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:20px;padding:36px 28px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);text-align:${isAr ? "right" : "left"};">
      <div style="text-align:center;margin-bottom:28px;">
        <span style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:1px;border-radius:14px;padding:10px 24px;">WANI · واني</span>
      </div>
      ${contentHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 18px;" />
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;line-height:1.6;">
        ${footerHtml || defaultFooter}
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── 1. Email Verification Template ───────────────────────────────────────────
export function renderVerificationEmail({
  verifyUrl,
  locale = "ar",
}: {
  verifyUrl: string;
  locale?: Locale;
}): EmailRenderOutput {
  const isAr = locale === "ar";

  const subject = isAr
    ? "تأكيد بريدك الإلكتروني — واني"
    : "Verify your email address — Wani";

  const contentHtml = isAr
    ? `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">مرحبًا بك في واني 🎉</h2>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 16px;">
        تم طلب إنشاء حساب باستخدام هذا البريد الإلكتروني. اضغط على الزر التالي لتأكيد بريدك الإلكتروني وتفعيل الحساب.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 38px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">تأكيد البريد الإلكتروني ←</a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;text-align:center;">هذا الرابط صالح لمدة 24 ساعة فقط.</p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;text-align:center;">إذا لم تطلب إنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.</p>
    `
    : `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">Welcome to Wani 🎉</h2>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 16px;">
        An account creation request was made using this email address. Click the button below to verify your email and activate your account.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 38px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">Verify Email Address →</a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;text-align:center;">This link is valid for 24 hours only.</p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;text-align:center;">If you did not request this account, you can safely ignore this email.</p>
    `;

  const text = isAr
    ? `مرحبًا بك في واني\n\nلتأكيد بريدك الإلكتروني وتفعيل الحساب، يرجى زيارة الرابط التالي:\n${verifyUrl}\n\nهذا الرابط صالح لمدة 24 ساعة فقط.`
    : `Welcome to Wani\n\nTo verify your email address and activate your account, please visit the following link:\n${verifyUrl}\n\nThis link is valid for 24 hours only.`;

  return {
    subject,
    html: emailWrapper({ locale, title: subject, contentHtml }),
    text,
  };
}

// ── 2. Password Reset Template ───────────────────────────────────────────────
export function renderResetEmail({
  resetUrl,
  locale = "ar",
}: {
  resetUrl: string;
  locale?: Locale;
}): EmailRenderOutput {
  const isAr = locale === "ar";

  const subject = isAr
    ? "إعادة تعيين كلمة المرور — واني"
    : "Reset your password — Wani";

  const contentHtml = isAr
    ? `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">إعادة تعيين كلمة المرور 🔐</h2>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 16px;">
        استلمنا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك في واني. اضغط على الزر التالي لاختيار كلمة مرور جديدة.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 38px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">إعادة تعيين كلمة المرور ←</a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;text-align:center;">هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;text-align:center;">إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة بأمان وسيبقى حسابك محميًا.</p>
    `
    : `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">Reset Your Password 🔐</h2>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 16px;">
        We received a request to reset the password for your Wani account. Click the button below to choose a new password.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 38px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">Reset Password →</a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;text-align:center;">This link is valid for 1 hour only.</p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;text-align:center;">If you did not request a password reset, you can safely ignore this email.</p>
    `;

  const text = isAr
    ? `إعادة تعيين كلمة المرور — واني\n\nلإعادة تعيين كلمة المرور، يرجى زيارة الرابط التالي:\n${resetUrl}\n\nهذا الرابط صالح لمدة ساعة واحدة فقط.`
    : `Reset Your Password — Wani\n\nTo reset your password, please visit the following link:\n${resetUrl}\n\nThis link is valid for 1 hour only.`;

  return {
    subject,
    html: emailWrapper({ locale, title: subject, contentHtml }),
    text,
  };
}

// ── 3. Welcome Email Template ────────────────────────────────────────────────
export function renderWelcomeEmail({
  name,
  appUrl,
  locale = "ar",
}: {
  name?: string | null;
  appUrl: string;
  locale?: Locale;
}): EmailRenderOutput {
  const isAr = locale === "ar";
  const recipientName = name?.trim() || "";
  const localizedAppUrl = `${appUrl}/${locale}`;

  const subject = isAr
    ? "أهلًا بك في واني 🎉 — حسابك جاهز"
    : "Welcome to Wani 🎉 — Your account is ready";

  const contentHtml = isAr
    ? `
      <h1 style="font-size:24px;line-height:1.4;color:#0f172a;margin:0 0 14px;text-align:center;">
        أهلًا بك${recipientName ? ` ${recipientName}` : ""} 👋
      </h1>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 14px;">
        مبروك! تم إنشاء حسابك في <strong>واني</strong> بنجاح، ويسعدنا انضمامك إلينا.
      </p>
      <p style="font-size:14px;line-height:1.8;color:#475569;margin:0 0 24px;">
        واني يساعدك على إدارة محادثات واتساب، متابعة العملاء، وأتمتة المبيعات وتنظيم فريقك من مكان واحد.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:18px 16px;margin-bottom:24px;">
        <p style="font-size:14px;font-weight:700;color:#166534;margin:0 0 10px;">ابدأ من هنا 🚀</p>
        <p style="font-size:13px;line-height:1.7;color:#475569;margin:0;">
          سجّل الدخول إلى حسابك وابدأ إعداد مساحة العمل وربط واتساب والبدء في استقبال محادثات عملائك.
        </p>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${localizedAppUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 38px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">
          الدخول إلى واني ←
        </a>
      </div>
      <p style="font-size:12px;line-height:1.7;color:#64748b;text-align:center;margin:0 0 18px;">
        لو احتجت أي مساعدة، فريق الدعم جاهز لمساعدتك دائمًا.
      </p>
    `
    : `
      <h1 style="font-size:24px;line-height:1.4;color:#0f172a;margin:0 0 14px;text-align:center;">
        Welcome${recipientName ? ` ${recipientName}` : ""} 👋
      </h1>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 14px;">
        Congratulations! Your <strong>Wani</strong> account has been created successfully, and we are thrilled to have you with us.
      </p>
      <p style="font-size:14px;line-height:1.8;color:#475569;margin:0 0 24px;">
        Wani empowers you to manage WhatsApp conversations, engage customers, automate sales, and organize your team all from one place.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:18px 16px;margin-bottom:24px;">
        <p style="font-size:14px;font-weight:700;color:#166534;margin:0 0 10px;">Get Started Here 🚀</p>
        <p style="font-size:13px;line-height:1.7;color:#475569;margin:0;">
          Log in to your account, configure your workspace, connect WhatsApp, and start engaging with your customers.
        </p>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${localizedAppUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 38px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">
          Go to Wani →
        </a>
      </div>
      <p style="font-size:12px;line-height:1.7;color:#64748b;text-align:center;margin:0 0 18px;">
        If you need any help, our support team is always ready to assist you.
      </p>
    `;

  const text = isAr
    ? `أهلًا بك في واني 🎉\n\nمبروك! تم إنشاء حسابك بنجاح.\nللدخول إلى المنصة، يرجى زيارة:\n${localizedAppUrl}`
    : `Welcome to Wani 🎉\n\nCongratulations! Your account has been created successfully.\nTo access the platform, visit:\n${localizedAppUrl}`;

  return {
    subject,
    html: emailWrapper({ locale, title: subject, contentHtml }),
    text,
  };
}

// ── 4. Developer Reset Email Template ────────────────────────────────────────
export function renderDeveloperResetEmail({
  firstName,
  resetUrl,
  locale = "ar",
}: {
  firstName: string;
  resetUrl: string;
  locale?: Locale;
}): EmailRenderOutput {
  const isAr = locale === "ar";

  const subject = isAr
    ? "استعادة كلمة المرور — بوابة المطورين"
    : "Reset your password — Developer Portal";

  const contentHtml = isAr
    ? `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">مرحبًا ${firstName} 👋</h2>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 16px;">
        تم طلب إعادة تعيين كلمة المرور لحسابك في بوابة مطوري واني (Developer Portal).
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#20d378;color:#060810;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(32,211,120,0.3);">تغيير كلمة المرور ←</a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;text-align:center;">الرابط صالح لمدة ساعة واحدة فقط.</p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;text-align:center;">إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.</p>
    `
    : `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">Hello ${firstName} 👋</h2>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 16px;">
        A password reset request was received for your Wani Developer Portal account.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#20d378;color:#060810;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(32,211,120,0.3);">Reset Password →</a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;text-align:center;">This link is valid for 1 hour only.</p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;text-align:center;">If you did not request this, you can safely ignore this email.</p>
    `;

  const text = isAr
    ? `استعادة كلمة المرور — بوابة المطورين\n\nمرحبًا ${firstName}، لتغيير كلمة المرور، يرجى زيارة الرابط:\n${resetUrl}\n\nالرابط صالح لمدة ساعة واحدة.`
    : `Reset Password — Developer Portal\n\nHello ${firstName}, to reset your password, please visit:\n${resetUrl}\n\nThis link is valid for 1 hour.`;

  return {
    subject,
    html: emailWrapper({ locale, title: subject, contentHtml }),
    text,
  };
}

// ── 5. Team Invitation Email Template ────────────────────────────────────────
export function renderTeamInviteEmail({
  to,
  name,
  inviterName,
  workspaceName,
  role,
  joinCode,
  loginUrl,
  expiresHours = 48,
  locale = "ar",
}: {
  to: string;
  name?: string | null;
  inviterName?: string | null;
  workspaceName?: string | null;
  role: "FULL_ACCESS" | "CHAT_ONLY" | string;
  joinCode: string;
  loginUrl: string;
  expiresHours?: number;
  locale?: Locale;
}): EmailRenderOutput {
  const isAr = locale === "ar";
  const teamLabel = workspaceName || inviterName || "Wani";
  const recipientName = name ? name.trim() : "";

  const roleLabel = isAr
    ? role === "FULL_ACCESS"
      ? "مسؤول — تحكم كامل (Admin)"
      : "وكيل — رد على المحادثات (Chat Only)"
    : role === "FULL_ACCESS"
    ? "Administrator — Full Control (Admin)"
    : "Agent — Conversation Responder (Chat Only)";

  const subject = isAr
    ? `دعوة للانضمام إلى فريق ${teamLabel} — واني`
    : `Invitation to join ${teamLabel}'s team — Wani`;

  const contentHtml = isAr
    ? `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">دعوة للانضمام إلى الفريق 🎉</h2>
      <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 12px;">مرحبًا ${recipientName ? `<strong>${recipientName}</strong> 👋` : "بك 👋"}</p>
      <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 20px;">تمت دعوتك من قبل <strong>${inviterName || "مدير الفريق"}</strong> للانضمام إلى فريق عمل <strong>${teamLabel}</strong> على منصة واني.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#334155;">
        <span style="color:#64748b;">الصلاحية الممنوحة:</span> <strong style="color:#0f172a;margin-right:6px;">${roleLabel}</strong>
      </div>
      <div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:16px;padding:24px 16px;text-align:center;margin:0 0 24px;">
        <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#166534;margin:0 0 12px;">كود الانضمام الخاص بك</p>
        <div style="background:#ffffff;border:1px solid #bbf7d0;border-radius:12px;padding:12px 18px;display:inline-block;">
          <code style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:800;letter-spacing:3px;color:#15803d;">${joinCode}</code>
        </div>
        <p style="font-size:11px;color:#16a34a;margin:10px 0 0;">هذا الكود مخصص لك فقط، صالح لمدة ${expiresHours} ساعة</p>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${loginUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">الانضمام إلى الفريق الآن ←</a>
      </div>
      <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 16px;text-align:center;">عند الضغط على زر الانضمام، سيتم فتح صفحة الفريق مع تعبئة بريدك وكود الانضمام تلقائيًا.</p>
    `
    : `
      <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">Invitation to Join the Team 🎉</h2>
      <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 12px;">Hello ${recipientName ? `<strong>${recipientName}</strong> 👋` : "there 👋"}</p>
      <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 20px;">You have been invited by <strong>${inviterName || "the team owner"}</strong> to join the <strong>${teamLabel}</strong> workspace on Wani.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#334155;">
        <span style="color:#64748b;">Granted Role:</span> <strong style="color:#0f172a;margin-left:6px;">${roleLabel}</strong>
      </div>
      <div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:16px;padding:24px 16px;text-align:center;margin:0 0 24px;">
        <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#166534;margin:0 0 12px;">YOUR INVITATION CODE</p>
        <div style="background:#ffffff;border:1px solid #bbf7d0;border-radius:12px;padding:12px 18px;display:inline-block;">
          <code style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:800;letter-spacing:3px;color:#15803d;">${joinCode}</code>
        </div>
        <p style="font-size:11px;color:#16a34a;margin:10px 0 0;">This code is personal to you and valid for ${expiresHours} hours</p>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${loginUrl}" style="display:inline-block;background:#25D366;color:#ffffff;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold;box-shadow:0 4px 12px rgba(37,211,102,0.3);">Join the Team Now →</a>
      </div>
      <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 16px;text-align:center;">Clicking the join button will open the team login page with your email and code pre-filled.</p>
    `;

  const text = isAr
    ? `دعوة للانضمام إلى فريق ${teamLabel} — واني\n\nتمت دعوتك من قبل ${inviterName || "مدير الفريق"} للانضمام بالصلاحية: ${roleLabel}.\nكود الانضمام الخاص بك: ${joinCode}\nرابط الانضمام:\n${loginUrl}\n\nصالح لمدة ${expiresHours} ساعة.`
    : `Invitation to join ${teamLabel}'s team — Wani\n\nYou were invited by ${inviterName || "the team owner"} with role: ${roleLabel}.\nYour Invitation Code: ${joinCode}\nJoin Link:\n${loginUrl}\n\nValid for ${expiresHours} hours.`;

  return {
    subject,
    html: emailWrapper({ locale, title: subject, contentHtml }),
    text,
  };
}
