import { describe, it, expect } from "vitest";
import { SettingsAppearanceSchema, VALID_THEMES } from "@/lib/schemas";
import { DASHBOARD_THEMES } from "@/lib/theme-context";

describe("Theme System Unit Tests", () => {
  describe("SettingsAppearanceSchema", () => {
    it("accepts all 5 valid themes", () => {
      for (const theme of VALID_THEMES) {
        const result = SettingsAppearanceSchema.safeParse({
          type: "appearance",
          theme,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.theme).toBe(theme);
        }
      }
    });

    it("rejects unknown or invalid theme names", () => {
      const invalidThemes = ["dark", "light", "custom", "red", ""];
      for (const theme of invalidThemes) {
        const result = SettingsAppearanceSchema.safeParse({
          type: "appearance",
          theme,
        });
        expect(result.success).toBe(false);
      }
    });

    it("rejects incorrect type discriminator", () => {
      const result = SettingsAppearanceSchema.safeParse({
        type: "general",
        theme: "ocean",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("DASHBOARD_THEMES definitions", () => {
    it("defines exactly the 5 valid themes", () => {
      expect(DASHBOARD_THEMES.length).toBe(5);
      const ids = DASHBOARD_THEMES.map((t) => t.id);
      expect(ids).toEqual(VALID_THEMES);
    });

    it("ensures each theme has complete light and dark color palettes", () => {
      for (const theme of DASHBOARD_THEMES) {
        expect(theme.name.ar).toBeDefined();
        expect(theme.name.en).toBeDefined();
        expect(theme.description.ar).toBeDefined();
        expect(theme.description.en).toBeDefined();
        expect(theme.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(theme.swatches.length).toBeGreaterThanOrEqual(4);

        // Light mode checks
        expect(theme.colors.light.primary).toBeDefined();
        expect(theme.colors.light.pageBg).toBeDefined();
        expect(theme.colors.light.cardBg).toBeDefined();
        expect(theme.colors.light.sidebarBg).toBeDefined();
        expect(theme.colors.light.chart.length).toBe(5);

        // Dark mode checks
        expect(theme.colors.dark.primary).toBeDefined();
        expect(theme.colors.dark.pageBg).toBeDefined();
        expect(theme.colors.dark.cardBg).toBeDefined();
        expect(theme.colors.dark.sidebarBg).toBeDefined();
        expect(theme.colors.dark.chart.length).toBe(5);
      }
    });
  });
});
