// src/lib/ai-agent-mcp.ts
// ─── إعدادات AI Agent (الرد النصي) — للاستخدام من MCP فقط ──────────────────
//
// عن قصد: مفيش أي حقل من حقول ElevenLabs (elevenLabsEnabled/elevenLabsApiKey/
// elevenLabsAgentId) في الـ get أو الـ update دول — ربط ElevenLabs مقصود إنه
// يفضل بره تحكم الـ AI Agent/MCP، وميتفعّلش أو يتغيّر إلا يدويًا من صفحة
// Integrations نفسها.

import prisma from "@/lib/prisma";
import { AIProvider } from "@/types/enums";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

const TONE_VALUES = ["friendly", "formal", "colloquial"] as const;
const LANGUAGE_MODE_VALUES = ["auto", "ar", "en"] as const;

export type AiAgentPublicSettings = {
  isEnabled: boolean;
  provider: string;
  brandName: string;
  businessDesc: string;
  productsInfo: string;
  pricingInfo: string;
  workingHours: string;
  tone: string;
  systemPrompt: string;
  languageMode: string;
  pauseMinutes: number;
  handoffResumeMinutes: number | null;
};

const DEFAULTS: AiAgentPublicSettings = {
  isEnabled: false,
  provider: "gemini",
  brandName: "",
  businessDesc: "",
  productsInfo: "",
  pricingInfo: "",
  workingHours: "",
  tone: "friendly",
  systemPrompt: "",
  languageMode: "auto",
  pauseMinutes: 10,
  handoffResumeMinutes: 3,
};

export async function getAiAgentSettingsForMcp(userId: string): Promise<AiAgentPublicSettings> {
  const agent = await prisma.aIAgent.findUnique({ where: { userId } });
  if (!agent) return { ...DEFAULTS };
  return {
    isEnabled: agent.isEnabled,
    provider: agent.provider,
    brandName: agent.brandName ?? "",
    businessDesc: agent.businessDesc ?? "",
    productsInfo: agent.productsInfo ?? "",
    pricingInfo: agent.pricingInfo ?? "",
    workingHours: agent.workingHours ?? "",
    tone: agent.tone,
    systemPrompt: agent.systemPrompt ?? "",
    languageMode: agent.languageMode,
    pauseMinutes: agent.pauseMinutes,
    handoffResumeMinutes: agent.handoffResumeMinutes,
  };
}

export type AiAgentMcpUpdateInput = Partial<{
  is_enabled: boolean;
  provider: "gemini" | "openai";
  brand_name: string;
  business_description: string;
  products_info: string;
  pricing_info: string;
  working_hours: string;
  tone: string;
  system_prompt: string;
  language_mode: string;
  pause_minutes: number;
  handoff_resume_minutes: number | null;
}>;

/**
 * تحديث جزئي — أي حقل متبعتش، بيفضل زي ما هو (مش بيتصفّر).
 * برضه بيرجّع { error } لو الحساب مش على باقة بتدعم AI Agent، أو لو فيه
 * قيمة خارج النطاق المسموح.
 */
export async function updateAiAgentSettingsForMcp(
  userId: string,
  input: AiAgentMcpUpdateInput
): Promise<{ error: string } | { success: true; settings: AiAgentPublicSettings }> {
  const aiGuard = await checkFeature(userId, "aiAgent");
  const guardResult = guardResponse(aiGuard);
  if (guardResult) {
    return { error: "الحساب ده مش على باقة بتدعم AI Agent — رقّي الباقة من الداشبورد" };
  }

  if (input.tone !== undefined && !TONE_VALUES.includes(input.tone as any)) {
    return { error: `tone لازم يكون واحد من: ${TONE_VALUES.join(", ")}` };
  }
  if (input.language_mode !== undefined && !LANGUAGE_MODE_VALUES.includes(input.language_mode as any)) {
    return { error: `language_mode لازم يكون واحد من: ${LANGUAGE_MODE_VALUES.join(", ")}` };
  }
  if (input.pause_minutes !== undefined && (!Number.isFinite(input.pause_minutes) || input.pause_minutes < 1)) {
    return { error: "pause_minutes لازم يكون رقم موجب" };
  }
  if (
    input.handoff_resume_minutes !== undefined &&
    input.handoff_resume_minutes !== null &&
    (!Number.isFinite(input.handoff_resume_minutes) || input.handoff_resume_minutes < 1)
  ) {
    return { error: "handoff_resume_minutes لازم يكون رقم موجب أو null لإلغاؤه" };
  }

  const existing = await prisma.aIAgent.findUnique({ where: { userId } });
  const current: AiAgentPublicSettings = existing
    ? {
        isEnabled: existing.isEnabled,
        provider: existing.provider,
        brandName: existing.brandName ?? "",
        businessDesc: existing.businessDesc ?? "",
        productsInfo: existing.productsInfo ?? "",
        pricingInfo: existing.pricingInfo ?? "",
        workingHours: existing.workingHours ?? "",
        tone: existing.tone,
        systemPrompt: existing.systemPrompt ?? "",
        languageMode: existing.languageMode,
        pauseMinutes: existing.pauseMinutes,
        handoffResumeMinutes: existing.handoffResumeMinutes,
      }
    : { ...DEFAULTS };

  const merged: AiAgentPublicSettings = {
    isEnabled: input.is_enabled ?? current.isEnabled,
    provider: input.provider ?? current.provider,
    brandName: input.brand_name ?? current.brandName,
    businessDesc: input.business_description ?? current.businessDesc,
    productsInfo: input.products_info ?? current.productsInfo,
    pricingInfo: input.pricing_info ?? current.pricingInfo,
    workingHours: input.working_hours ?? current.workingHours,
    tone: input.tone ?? current.tone,
    systemPrompt: input.system_prompt ?? current.systemPrompt,
    languageMode: input.language_mode ?? current.languageMode,
    pauseMinutes: input.pause_minutes ?? current.pauseMinutes,
    handoffResumeMinutes:
      input.handoff_resume_minutes === undefined ? current.handoffResumeMinutes : input.handoff_resume_minutes,
  };

  const providerEnum: AIProvider = merged.provider === "openai" ? AIProvider.openai : AIProvider.gemini;

  // بنحافظ على بيانات ElevenLabs زي ما هي — MCP مش بيلمسها خالص
  const payload = {
    isEnabled: merged.isEnabled,
    provider: providerEnum,
    brandName: merged.brandName,
    businessDesc: merged.businessDesc,
    productsInfo: merged.productsInfo,
    pricingInfo: merged.pricingInfo,
    workingHours: merged.workingHours,
    tone: merged.tone,
    systemPrompt: merged.systemPrompt,
    languageMode: merged.languageMode,
    pauseMinutes: Math.max(1, Math.round(merged.pauseMinutes)),
    handoffResumeMinutes:
      merged.handoffResumeMinutes === null ? null : Math.max(1, Math.round(merged.handoffResumeMinutes)),
    elevenLabsEnabled: existing?.elevenLabsEnabled ?? false,
    elevenLabsApiKey: existing?.elevenLabsApiKey ?? null,
    elevenLabsAgentId: existing?.elevenLabsAgentId ?? null,
  };

  await prisma.aIAgent.upsert({
    where: { userId },
    update: payload,
    create: { userId, ...payload },
  });

  return { success: true, settings: merged };
}
