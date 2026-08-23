// src/lib/email.ts
// Server-only email transport. SMTP credentials are never returned or logged.
import nodemailer from "nodemailer";
import type { Locale } from "@/lib/i18n";
import {
  renderVerificationEmail,
  renderResetEmail,
  renderWelcomeEmail,
  renderDeveloperResetEmail,
  renderTeamInviteEmail,
} from "@/lib/email-templates";

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

export function getEmailBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://aiwni.com";
  return baseUrl.replace(/\/$/, "");
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  await getTransporter().sendMail({ from: getFrom(), to, subject, html, text });
}

export async function sendResetEmail(to: string, token: string, locale: Locale = "ar") {
  const resetUrl = `${getEmailBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = renderResetEmail({ resetUrl, locale });
  await sendEmail({ to, subject, html, text });
}

export async function sendVerificationEmail(to: string, token: string, locale: Locale = "ar") {
  const verifyUrl = `${getEmailBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = renderVerificationEmail({ verifyUrl, locale });
  await sendEmail({ to, subject, html, text });
}

/**
 * Welcome email sent once immediately after a successful first signup.
 * This is intentionally separate from the verification email so the
 * verification flow remains focused on account activation.
 */
export async function sendWelcomeEmail(to: string, name?: string | null, locale: Locale = "ar") {
  const appUrl = getEmailBaseUrl();
  const { subject, html, text } = renderWelcomeEmail({ name, appUrl, locale });
  await sendEmail({ to, subject, html, text });
}

export async function sendDeveloperResetEmail(
  to: string,
  firstName: string,
  token: string,
  locale: Locale = "ar"
) {
  const resetUrl = `${getEmailBaseUrl()}/developers/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = renderDeveloperResetEmail({ firstName, resetUrl, locale });
  await sendEmail({ to, subject, html, text });
}

export async function sendTeamInviteEmail({
  to,
  name,
  inviterName,
  workspaceName,
  role,
  joinCode,
  expiresHours = 48,
  locale = "ar",
}: {
  to: string;
  name?: string | null;
  inviterName?: string | null;
  workspaceName?: string | null;
  role: "FULL_ACCESS" | "CHAT_ONLY" | string;
  joinCode: string;
  expiresHours?: number;
  locale?: Locale;
}) {
  const loginUrl = `${getEmailBaseUrl()}/?login=join&email=${encodeURIComponent(to)}&code=${encodeURIComponent(joinCode)}`;
  const { subject, html, text } = renderTeamInviteEmail({
    to,
    name,
    inviterName,
    workspaceName,
    role,
    joinCode,
    loginUrl,
    expiresHours,
    locale,
  });
  await sendEmail({ to, subject, html, text });
}
