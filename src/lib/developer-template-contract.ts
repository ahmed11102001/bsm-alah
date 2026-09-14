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
