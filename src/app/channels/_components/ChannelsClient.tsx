"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  MessageSquare,
  Mail,
  Instagram,
  Send as TelegramIcon,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
  Radio,
  Lock,
} from "lucide-react";

interface ChannelsClientProps {
  isWhatsAppConnected: boolean;
  whatsAppData?: {
    phoneNumberId?: string | null;
    wabaId?: string | null;
  } | null;
  userName?: string | null;
}

export default function ChannelsClient({
  isWhatsAppConnected,
  whatsAppData,
  userName,
}: ChannelsClientProps) {
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
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10 text-center sm:text-right"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md mb-3">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>قنوات المحادثات والتواصل</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
          {userName ? `أهلاً بك، ${userName} 👋` : "أهلاً بك 👋"}
          <span className="block text-emerald-400 mt-1">اختر القناة للمتابعة</span>
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
              ? "border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-emerald-950/20 to-transparent hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-900/20"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
          } p-6 backdrop-blur-md`}
        >
          {/* Subtle decorative glow */}
          {isWhatsAppConnected && (
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" />
          )}

          <div>
            {/* Top header with icon and badge */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] shadow-lg shadow-[#25D366]/10 transition-transform duration-300 group-hover:scale-105">
                <MessageSquare className="h-7 w-7 fill-current" />
              </div>

              {isWhatsAppConnected ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 shadow-sm shadow-emerald-950">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
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
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-2.5 text-[11px] text-emerald-200/80">
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-bold text-[#04241b] shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:brightness-110 hover:shadow-emerald-500/35 active:scale-[0.98]"
              >
                <span>افتح الداشبورد</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/dashboard/api"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 transition-all duration-200 hover:bg-emerald-500/20 active:scale-[0.98]"
              >
                <span>ربط واتساب</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
          </div>
        </motion.div>

        {/* 2. Email Card (Phase 2 placeholder) */}
        <motion.div
          variants={itemVariants}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md transition-all duration-300 hover:border-blue-500/30 hover:bg-white/[0.05]"
        >
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10 transition-transform duration-300 group-hover:scale-105">
                <Mail className="h-7 w-7" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/50">
                <XCircle className="h-3.5 w-3.5 text-white/40" />
                <span>غير متصل</span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">البريد الإلكتروني</h2>
                <span className="rounded-md bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                  Email
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-white/65 leading-relaxed">
                إرسال حملات إخبارية وترويجية عبر الإيميل، إشعارات تلقائية للطلبات، ومتابعة معدلات الفتح والتفاعل.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-7 pt-4 border-t border-white/5">
            <Link
              href="/dashboard/email"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/40 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 transition-all duration-200 hover:bg-blue-500/20 active:scale-[0.98]"
            >
              <span>ربط الإيميل</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* 3. Instagram Card (Coming Soon) */}
        <motion.div
          variants={itemVariants}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-6 opacity-75 backdrop-blur-md transition-all duration-300 hover:opacity-90"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <Instagram className="h-7 w-7" />
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <TelegramIcon className="h-7 w-7" />
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Radio className="h-7 w-7" />
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
    </div>
  );
}
