import { useMemo } from "react";

export type TemplateComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
export type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "NONE";

export interface TemplateComponent {
  type: TemplateComponentType;
  format?: HeaderFormat;
  text?: string;
  buttons?: any[];
  example?: any;
}

export interface ParsedTemplate {
  requiresHeaderMedia: "IMAGE" | "VIDEO" | "DOCUMENT" | "NONE";
  headerVariablesCount: number;
  bodyVariablesCount: number;
  dynamicButtons: { index: number; url: string; example?: string[] }[];
}

function countVariables(text: string): number {
  if (!text) return 0;
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  const maxVar = Math.max(...matches.map((m) => parseInt(m.replace(/\D/g, ""), 10)));
  return maxVar;
}

export function useTemplateParser(componentsJson: any | null): ParsedTemplate {
  return useMemo(() => {
    const result: ParsedTemplate = {
      requiresHeaderMedia: "NONE",
      headerVariablesCount: 0,
      bodyVariablesCount: 0,
      dynamicButtons: [],
    };

    if (!componentsJson) return result;

    let components: TemplateComponent[] = [];
    if (typeof componentsJson === "string") {
      try {
        components = JSON.parse(componentsJson);
      } catch {
        return result;
      }
    } else if (Array.isArray(componentsJson)) {
      components = componentsJson;
    } else {
      return result;
    }

    components.forEach((comp) => {
      if (comp.type === "HEADER") {
        if (comp.format === "IMAGE") result.requiresHeaderMedia = "IMAGE";
        else if (comp.format === "VIDEO") result.requiresHeaderMedia = "VIDEO";
        else if (comp.format === "DOCUMENT") result.requiresHeaderMedia = "DOCUMENT";
        else if (comp.format === "TEXT" && comp.text) {
          result.headerVariablesCount = countVariables(comp.text);
        }
      } else if (comp.type === "BODY" && comp.text) {
        result.bodyVariablesCount = countVariables(comp.text);
      } else if (comp.type === "BUTTONS" && Array.isArray(comp.buttons)) {
        comp.buttons.forEach((btn, index) => {
          if (btn.type === "URL" && btn.url && btn.url.includes("{{1}}")) {
            result.dynamicButtons.push({
              index, // button index is needed to pass to API correctly, Meta API expects index
              url: btn.url,
            });
          }
        });
      }
    });

    return result;
  }, [componentsJson]);
}
