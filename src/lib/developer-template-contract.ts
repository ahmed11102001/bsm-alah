export type OtpVariableKey = "otp" | "expiryMinutes" | "serviceName" | "custom";

export interface OtpVariableDefinition {
  position: number;
  key: OtpVariableKey;
  example: string;
}

export interface MetaTemplateComponent {
  type?: string;
  format?: string;
  text?: string;
  example?: unknown;
  add_security_recommendation?: boolean;
  code_expiration_minutes?: number;
  parameters?: unknown[];
  buttons?: Array<{
    type?: string;
    otp_type?: string;
    sub_type?: string;
    index?: string | number;
    text?: string;
  }>;
}

export function placeholderPositions(body: string): number[] {
  return [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
}

export function validateVariableDefinitions(
  body: string,
  definitions: OtpVariableDefinition[] | null | undefined,
): { ok: true; variables: OtpVariableDefinition[] } | { ok: false; error: string } {
  const positions = placeholderPositions(body);
  if (positions.length === 0) return { ok: true, variables: [] };
  if (positions.some((position, index) => position !== index + 1)) {
    return { ok: false, error: "Template variables must be numbered consecutively from {{1}}." };
  }
  if (!definitions || definitions.length !== positions.length) {
    return { ok: false, error: "Every template variable must have a meaning and example value." };
  }
  const sorted = [...definitions].sort((a, b) => a.position - b.position);
  if (sorted.some((item, index) => item.position !== positions[index] || !item.key || !String(item.example ?? "").trim())) {
    return { ok: false, error: "Template variables must match {{1}}, {{2}}, ... in order and include examples." };
  }
  if (new Set(sorted.map((item) => item.position)).size !== sorted.length) {
    return { ok: false, error: "Template variable positions cannot be duplicated." };
  }
  return { ok: true, variables: sorted };
}

export function buildOtpParameters(
  variables: OtpVariableDefinition[],
  otp: string,
  expiryMinutes: number,
): { ok: true; parameters: Array<{ type: "text"; text: string }> } | { ok: false; error: string } {
  const values: Record<OtpVariableKey, string> = {
    otp,
    expiryMinutes: String(expiryMinutes),
    serviceName: "",
    custom: "",
  };
  const parameters: Array<{ type: "text"; text: string }> = [];
  for (const variable of variables) {
    if (!values[variable.key]) {
      return { ok: false, error: `Variable {{${variable.position}}} requires a value that Send OTP does not provide: ${variable.key}.` };
    }
    parameters.push({ type: "text", text: values[variable.key] });
  }
  return { ok: true, parameters };
}

export function validateAuthenticationComponents(
  components: MetaTemplateComponent[] | null | undefined,
): { ok: true; components: MetaTemplateComponent[] } | { ok: false; error: string } {
  if (!Array.isArray(components) || components.length === 0) {
    return { ok: false, error: "Template metadata is incomplete. Please sync templates again." };
  }

  const supported = new Set(["BODY", "HEADER", "FOOTER", "BUTTONS"]);
  let otpButtonCount = 0;
  let parameterBearingBody = false;

  for (const component of components) {
    if (!component || typeof component !== "object") {
      return { ok: false, error: "Template metadata is incomplete. Please sync templates again." };
    }
    const type = String(component.type ?? "").toUpperCase();
    if (!supported.has(type)) {
      return { ok: false, error: "Template metadata is incomplete. Please sync templates again." };
    }
    if (type === "BUTTONS") {
      if (!Array.isArray(component.buttons)) {
        return { ok: false, error: "Template metadata is incomplete. Please sync templates again." };
      }
      for (const button of component.buttons) {
        if (String(button?.type ?? "").toUpperCase() === "OTP") {
          otpButtonCount += 1;
          if (!String(button.otp_type ?? "").trim()) {
            return { ok: false, error: "Template metadata is incomplete. Please sync templates again." };
          }
        }
      }
    }
    if (type === "BODY") {
      const positions = typeof component.text === "string" ? placeholderPositions(component.text) : [];
      if (positions.length > 0 || (Array.isArray(component.parameters) && component.parameters.length > 0)) {
        parameterBearingBody = true;
      }
      if (positions.length > 1 || (Array.isArray(component.parameters) && component.parameters.length > 1)) {
        return { ok: false, error: "Template metadata is incomplete. Please sync templates again." };
      }
    }
  }

  if (otpButtonCount === 0 && !parameterBearingBody) {
    return { ok: false, error: "Template metadata is incomplete. Please sync templates again." };
  }
  return { ok: true, components };
}

export function buildAuthenticationComponents(
  components: MetaTemplateComponent[] | null | undefined,
  otp: string,
): { ok: true; components: Array<Record<string, unknown>> } | { ok: false; error: string } {
  const validation = validateAuthenticationComponents(components);
  if (!validation.ok) return validation;

  const result: Array<Record<string, unknown>> = [];
  for (const component of validation.components) {
    const type = String(component.type ?? "").toUpperCase();
    if (type === "BODY") {
      const positions = typeof component.text === "string" ? placeholderPositions(component.text) : [];
      const parameterCount = positions.length || (Array.isArray(component.parameters) ? component.parameters.length : 0);
      if (parameterCount === 1) {
        result.push({ type: "body", parameters: [{ type: "text", text: otp }] });
      }
    }
    if (type === "BUTTONS") {
      for (const [index, button] of (component.buttons ?? []).entries()) {
        if (String(button.type ?? "").toUpperCase() === "OTP") {
          result.push({
            type: "button",
            sub_type: button.sub_type || "url",
            index: String(button.index ?? index),
            parameters: [{ type: "text", text: otp }],
          });
        }
      }
    }
  }
  return { ok: true, components: result };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTP TEMPLATE CONTRACT — المصدر الوحيد للحقيقة (PHASE 2)
// ─────────────────────────────────────────────────────────────────────────────
// Wani هو الذي يفرض structure قالب الـ OTP. المطور يختار فقط:
//   (1) الاسم  (2) اللغة  (3) مدة صلاحية الكود
// وكل ما عداه (النص، الزر، التصنيف، الباراميترات) يولّده Wani.
// لا string-parsing للنص كآلية أساسية — القرار على structured metadata.
// ═══════════════════════════════════════════════════════════════════════════════

/** اللغات المدعومة لإنشاء OTP (أكواد Meta كما تُرسل في language.code). */
export const OTP_SUPPORTED_LANGUAGES = ["ar", "en_US", "en_GB", "fr", "de", "es", "tr", "ur"] as const;
export type OtpSupportedLanguage = (typeof OTP_SUPPORTED_LANGUAGES)[number];

/** نص الـ BODY المولّد — متغير واحد {{1}} فقط للكود، بلا أي متغير آخر. */
const OTP_GENERATED_BODIES: Record<string, string> = {
  ar: "{{1}} هو رمز التحقق الخاص بك. لا تشاركه مع أحد.",
  en_US: "{{1}} is your verification code. For your security, do not share this code.",
  en_GB: "{{1}} is your verification code. For your security, do not share this code.",
  fr: "{{1}} est votre code de vérification. Pour votre sécurité, ne le partagez pas.",
  de: "{{1}} ist Ihr Bestätigungscode. Teilen Sie ihn aus Sicherheitsgründen mit niemandem.",
  es: "{{1}} es tu código de verificación. Por tu seguridad, no lo compartas.",
  tr: "{{1}} doğrulama kodunuzdur. Güvenliğiniz için kimseyle paylaşmayın.",
  ur: "{{1}} آپ کا تصدیقی کوڈ ہے۔ اپنی حفاظت کے لیے اسے کسی سے شیئر نہ کریں۔",
};

/** الإعداد المبارك لزر OTP — ثابت، لا يقبل التعديل من المطور. */
export const OTP_BLESSED_BUTTON = {
  type: "OTP",
  otp_type: "COPY_CODE",
} as const;

export interface OtpTemplateSpec {
  name: string;
  language: string;
  body: string;
  codeExpirationMinutes: number;
}

/** أخطاء الـ OTP contract — machine-readable reasons. */
export const OTP_CONTRACT_ERRORS = {
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
  TEMPLATE_WRONG_PROJECT: "TEMPLATE_WRONG_PROJECT",
  TEMPLATE_NOT_APPROVED: "TEMPLATE_NOT_APPROVED",
  TEMPLATE_NO_META_ID: "TEMPLATE_NO_META_ID",
  OTP_TEMPLATE_NOT_COMPATIBLE: "OTP_TEMPLATE_NOT_COMPATIBLE",
  OTP_TEMPLATE_METADATA_INVALID: "OTP_TEMPLATE_METADATA_INVALID",
  OTP_TEMPLATE_SYNC_FAILED: "OTP_TEMPLATE_SYNC_FAILED",
} as const;

/** تطبيع اسم القالب لقواعد Meta (snake_case). */
export function normalizeOtpTemplateName(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function isValidOtpTemplateName(name: string): boolean {
  return name.length >= 3 && name.length <= 512;
}

export function isSupportedOtpLanguage(language: unknown): language is string {
  return typeof language === "string" && (OTP_SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}

/** النص المولّد للغة — fallback إنجليزي إن غابت الترجمة (لا يخترع structure). */
export function generatedOtpBody(language: string): string {
  return OTP_GENERATED_BODIES[language] ?? OTP_GENERATED_BODIES["en_US"] as string;
}

/**
 * مكونات الإنشاء المرسلة إلى Meta — المصدر الوحيد لبناء AUTHENTICATION.
 * تُستخدم في submitTemplateToMeta بدل أي builder يدوي مكرر.
 */
export function buildMetaCreateComponents(spec: { addSecurityRecommendation: boolean }): Array<Record<string, unknown>> {
  const body: Record<string, unknown> = { type: "BODY" };
  if (spec.addSecurityRecommendation) {
    body["add_security_recommendation"] = true;
  }
  return [
    body,
    {
      type: "BUTTONS",
      buttons: [{ type: OTP_BLESSED_BUTTON.type, otp_type: OTP_BLESSED_BUTTON.otp_type }],
    },
  ];
}

export interface OtpContractInput {
  id: string | null;
  projectId: string | null;
  expectedProjectId: string;
  name: string | null;
  language: string | null;
  category: string | null;
  status: string | null;
  metaTemplateId: string | null;
  metaComponents: unknown;
}

export type OtpContractResult =
  | { ok: true }
  | { ok: false; code: string; reason: string };

/**
 * validateOtpTemplateContract — الفاحص المركزي الوحيد (PHASE 6).
 * يتحقق بالترتيب: الوجود → الملكية → Meta ID → التصنيف → الحالة →
 * اللغة → سلامة الـ metadata → قابلية بناء الـ payload.
 * أي فشل = لا إرسال إلى Meta إطلاقًا (fail closed).
 */
export function validateOtpTemplateContract(input: OtpContractInput): OtpContractResult {
  if (!input.id || !input.name) {
    return { ok: false, code: OTP_CONTRACT_ERRORS.TEMPLATE_NOT_FOUND, reason: "Template record does not exist." };
  }
  if (!input.projectId || input.projectId !== input.expectedProjectId) {
    return {
      ok: false,
      code: OTP_CONTRACT_ERRORS.TEMPLATE_WRONG_PROJECT,
      reason: "Template belongs to a different project.",
    };
  }
  if (!input.metaTemplateId) {
    return {
      ok: false,
      code: OTP_CONTRACT_ERRORS.TEMPLATE_NO_META_ID,
      reason: `Template "${input.name}" is not linked to a Meta template. Sync with Meta first.`,
    };
  }
  if (input.category !== "AUTHENTICATION") {
    return {
      ok: false,
      code: OTP_CONTRACT_ERRORS.OTP_TEMPLATE_NOT_COMPATIBLE,
      reason: `Template "${input.name}" is category ${input.category ?? "unknown"} — OTP requires AUTHENTICATION.`,
    };
  }
  if (input.status !== "APPROVED") {
    return {
      ok: false,
      code: OTP_CONTRACT_ERRORS.TEMPLATE_NOT_APPROVED,
      reason: `Template "${input.name}" is ${input.status ?? "unknown"} — only APPROVED templates can send OTP.`,
    };
  }
  if (!input.language) {
    return {
      ok: false,
      code: OTP_CONTRACT_ERRORS.OTP_TEMPLATE_METADATA_INVALID,
      reason: `Template "${input.name}" has no language. Sync with Meta first.`,
    };
  }
  const metadata = validateAuthenticationComponents(
    Array.isArray(input.metaComponents) ? (input.metaComponents as MetaTemplateComponent[]) : null,
  );
  if (!metadata.ok) {
    return {
      ok: false,
      code: OTP_CONTRACT_ERRORS.OTP_TEMPLATE_METADATA_INVALID,
      reason: `Template "${input.name}" metadata is incomplete: ${metadata.error}`,
    };
  }
  return { ok: true };
}

/**
 * isOtpCompatibleWithMeta — فحص التوافق الصرف مع Meta (PHASE 4).
 * يُستخدم للعرض (OTP Ready) وللبوابة قبل الإرسال.
 */
export function isOtpCompatibleWithMeta(input: {
  category: string | null;
  status: string | null;
  metaTemplateId: string | null;
  metaComponents: unknown;
}): { compatible: boolean; reason: string } {
  if (input.category !== "AUTHENTICATION") {
    return {
      compatible: false,
      reason: `Category is ${input.category ?? "unknown"} — OTP requires AUTHENTICATION.`,
    };
  }
  if (input.status !== "APPROVED") {
    return { compatible: false, reason: `Status is ${input.status ?? "unknown"} — must be APPROVED.` };
  }
  if (!input.metaTemplateId) {
    return { compatible: false, reason: "Not linked to a Meta template — sync required." };
  }
  const metadata = validateAuthenticationComponents(
    Array.isArray(input.metaComponents) ? (input.metaComponents as MetaTemplateComponent[]) : null,
  );
  if (!metadata.ok) {
    return { compatible: false, reason: metadata.error };
  }
  return { compatible: true, reason: "OTP ready." };
}
