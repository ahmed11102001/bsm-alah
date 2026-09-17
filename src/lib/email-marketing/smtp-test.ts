import nodemailer from "nodemailer";

export interface SmtpTestParams {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  fromEmail?: string;
}

export async function testSmtpConnection(params: SmtpTestParams): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!params.host || !params.user || !params.password) {
    return {
      success: false,
      message: "بيانات الاتصال ناقصة (الخادم، المستخدم، أو كلمة المرور).",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: params.host.trim(),
      port: Number(params.port) || 587,
      secure: Boolean(params.secure),
      auth: {
        user: params.user.trim(),
        pass: params.password.trim(),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.verify();

    return {
      success: true,
      message: "تم التحقق من الاتصال بخادم SMTP بنجاح!",
    };
  } catch (error: any) {
    console.error("[email-marketing] SMTP Verification failed:", error);
    const errMessage = error?.message || "فشل الاتصال بخادم SMTP.";
    return {
      success: false,
      message: errMessage,
    };
  }
}
