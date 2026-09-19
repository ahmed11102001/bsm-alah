"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChannelsSideRail from "./ChannelsSideRail";
import ShopifyOAuthToast from "./ShopifyOAuthToast";
import StoreConnectWizard from "./store/StoreConnectWizard";
import { motion, type Variants } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
  Lock,
} from "lucide-react";

interface ChannelsClientProps {
  isWhatsAppConnected: boolean;
  whatsAppData?: {
    phoneNumberId?: string | null;
    wabaId?: string | null;
  } | null;
  isEmailConnected?: boolean;
  emailData?: {
    fromEmail?: string | null;
    lastTestSuccess?: boolean | null;
  } | null;
  canStore?: boolean;
  canManageStore?: boolean;
  connectStoreRequested?: boolean;
}

export default function ChannelsClient({
  isWhatsAppConnected,
  whatsAppData,
  isEmailConnected = false,
  emailData,
  canStore = false,
  canManageStore = false,
  connectStoreRequested = false,
}: ChannelsClientProps) {
  const [wizardOpen, setWizardOpen] = useState(connectStoreRequested);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ChannelsSideRail onConnectStore={() => setWizardOpen(true)} />
      <ShopifyOAuthToast />
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10 text-center sm:text-right"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[#20d378]/25 bg-[#20d378]/[.07] px-3.5 py-1 text-xs font-medium text-[#20d378] backdrop-blur-md mb-3">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Retention Marketing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
          قنوات التسويق والاحتفاظ بالعملاء
          <span className="block text-[#20d378] mt-1 text-lg sm:text-xl lg:text-2xl font-bold">Retention Marketing</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-white/60 max-w-2xl">
          أدر قنوات التواصل المتاحة وتابع محادثات عملائك وحملاتك الآلية من منصة موحدة فائقة الذكاء.
        </p>
      </motion.div>

      {/* Channels Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* 1. WhatsApp Card */}
        <motion.div
          variants={itemVariants}
          className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${
            isWhatsAppConnected
              ? "border-[#20d378]/25 bg-white/[0.03] hover:border-[#20d378]/45 hover:shadow-2xl hover:shadow-[#20d378]/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
          } p-6 backdrop-blur-md`}
        >
          {/* Subtle decorative glow */}
          {isWhatsAppConnected && (
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-[#20d378]/15 blur-3xl" />
          )}

          <div>
            {/* Top header with brand image and badge */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 transition-transform duration-300 group-hover:scale-105">
                <img src="/channels/whatsapp.svg" alt="WhatsApp" className="h-8 w-8 object-contain" />
              </div>

              {isWhatsAppConnected ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#20d378]/30 bg-[#20d378]/[.08] px-3 py-1 text-xs font-bold text-[#20d378] shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#20d378] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#20d378]" />
                  </span>
                  <span>متصل</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/50">
                  <XCircle className="h-3.5 w-3.5 text-white/40" />
                  <span>غير متصل</span>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="mt-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                WhatsApp Business
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-white/65 leading-relaxed">
                ردود آلية ذكية، حملات جماعية معتمدة من Meta، إدارة الصندوق الوارد لفريق العمل، وتكاملات المتاجر.
              </p>
            </div>

            {/* Connection Meta Details if connected */}
            {isWhatsAppConnected && whatsAppData?.phoneNumberId && (
              <div className="mt-4 rounded-xl border border-[#20d378]/20 bg-[#20d378]/[.06] p-2.5 text-[11px] text-white/70">
                <div className="flex items-center justify-between">
                  <span className="text-white/40">معرّف الرقم:</span>
                  <span className="font-mono">{whatsAppData.phoneNumberId}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-7 pt-4 border-t border-white/5">
            {isWhatsAppConnected ? (
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#20d378] px-5 py-3 text-sm font-bold text-[#060810] shadow-lg shadow-[#20d378]/25 transition-all duration-200 hover:brightness-110 hover:shadow-[#20d378]/35 active:scale-[0.98]"
              >
                <span>افتح الداشبورد</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/dashboard/api"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#20d378]/40 bg-[#20d378]/[.08] px-5 py-3 text-sm font-bold text-[#20d378] transition-all duration-200 hover:bg-[#20d378]/[.15] active:scale-[0.98]"
              >
                <span>ربط واتساب</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
          </div>
        </motion.div>

        {/* 2. Email Card */}
        <motion.div
          variants={itemVariants}
          className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${
            isEmailConnected
              ? "border-[#20d378]/25 bg-white/[0.03] hover:border-[#20d378]/45 hover:shadow-2xl hover:shadow-[#20d378]/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
          } p-6 backdrop-blur-md`}
        >
          {/* Decorative glow if connected */}
          {isEmailConnected && (
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-[#20d378]/15 blur-3xl" />
          )}

          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 transition-transform duration-300 group-hover:scale-105">
                <img src="/channels/gmail.svg" alt="Email" className="h-8 w-8 object-contain" />
              </div>

              {isEmailConnected ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#20d378]/30 bg-[#20d378]/[.08] px-3 py-1 text-xs font-bold text-[#20d378] shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#20d378] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#20d378]" />
                  </span>
                  <span>متصل</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/50">
                  <XCircle className="h-3.5 w-3.5 text-white/40" />
                  <span>غير متصل</span>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">البريد الإلكتروني</h2>
                <span className="rounded-md bg-[#20d378]/10 border border-[#20d378]/25 px-1.5 py-0.5 text-[10px] font-bold text-[#20d378]">
                  Email Marketing
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-white/65 leading-relaxed">
                إرسال حملات إخبارية وترويجية عبر الإيميل، إشعارات تلقائية للطلبات، ومتابعة معدلات الفتح والتفاعل.
              </p>
            </div>

            {/* Connected email meta if connected */}
            {isEmailConnected && emailData?.fromEmail && (
              <div className="mt-4 rounded-xl border border-[#20d378]/20 bg-[#20d378]/[.06] p-2.5 text-[11px] text-white/70">
                <div className="flex items-center justify-between">
                  <span className="text-white/40">بريد الإرسال:</span>
                  <span className="font-mono text-[#20d378] font-semibold">{emailData.fromEmail}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-7 pt-4 border-t border-white/5">
            {isEmailConnected ? (
              <Link
                href="/dashboard/email"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#20d378] px-5 py-3 text-sm font-bold text-[#060810] shadow-lg shadow-[#20d378]/25 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              >
                <span>افتح الداشبورد</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/dashboard/email/settings"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#20d378]/40 bg-[#20d378]/[.08] px-5 py-3 text-sm font-bold text-[#20d378] transition-all duration-200 hover:bg-[#20d378]/[.15] active:scale-[0.98]"
              >
                <span>ربط الإيميل</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
          </div>
        </motion.div>

        {/* 3. Instagram Card (Coming Soon) */}
        <motion.div
          variants={itemVariants}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-6 opacity-75 backdrop-blur-md transition-all duration-300 hover:opacity-90"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10">
                <img src="/channels/instagram.svg" alt="Instagram" className="h-8 w-8 object-contain opacity-80" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                <Clock className="h-3 w-3" />
                <span>قريبًا</span>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-xl font-bold text-white/85">Instagram Direct</h2>
              <p className="mt-2 text-xs sm:text-sm text-white/45 leading-relaxed">
                ردود آلية على الرسائل المباشرة والقصص (Stories)، وأتمتة الرد على التعليقات لتحويل المتابعين إلى مبيعات.
              </p>
            </div>
          </div>

          <div className="mt-7 pt-4 border-t border-white/5">
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/30"
            >
              <Lock className="h-4 w-4" />
              <span>قيد التطوير</span>
            </button>
          </div>
        </motion.div>

        {/* 4. Telegram Card (Coming Soon) */}
        <motion.div
          variants={itemVariants}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-6 opacity-75 backdrop-blur-md transition-all duration-300 hover:opacity-90"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10">
                <img src="/channels/telegram.svg" alt="Telegram" className="h-8 w-8 object-contain opacity-80" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                <Clock className="h-3 w-3" />
                <span>قريبًا</span>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-xl font-bold text-white/85">Telegram</h2>
              <p className="mt-2 text-xs sm:text-sm text-white/45 leading-relaxed">
                ربط بوتات تيليجرام للأعمال، إرسال إشعارات جماعية، ودعم القنوات والمجموعات المغلقة.
              </p>
            </div>
          </div>

          <div className="mt-7 pt-4 border-t border-white/5">
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/30"
            >
              <Lock className="h-4 w-4" />
              <span>قيد التطوير</span>
            </button>
          </div>
        </motion.div>

        {/* 5. Messenger Card (Coming Soon) */}
        <motion.div
          variants={itemVariants}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-6 opacity-75 backdrop-blur-md transition-all duration-300 hover:opacity-90"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10">
                <img src="/channels/messenger.svg" alt="Messenger" className="h-8 w-8 object-contain opacity-80" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                <Clock className="h-3 w-3" />
                <span>قريبًا</span>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-xl font-bold text-white/85">Facebook Messenger</h2>
              <p className="mt-2 text-xs sm:text-sm text-white/45 leading-relaxed">
                ربط صفحات فيسبوك، الرد الآلي على استفسارات الزوار، وحملات إعادة الاستهداف الإعلاني.
              </p>
            </div>
          </div>

          <div className="mt-7 pt-4 border-t border-white/5">
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/30"
            >
              <Lock className="h-4 w-4" />
              <span>قيد التطوير</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Store Connect Wizard (opens from rail / ?connectStore=1 / OAuth) ── */}
      <StoreConnectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        canStore={canStore}
        canManageStore={canManageStore}
      />
    </div>
  );
}
