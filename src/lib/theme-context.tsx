"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useTheme as useNextTheme } from "next-themes";
import { type DashboardTheme, VALID_THEMES } from "./schemas";

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  inputBackground: string;
  ring: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarBorder: string;
  sidebarActiveBackground: string;
  sidebarActiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  chart: string[];
  pageBg?: string;
  cardBg?: string;
  sidebarBg?: string;
  text?: string;
  mutedText?: string;
}

export interface DashboardThemeDefinition {
  id: DashboardTheme;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  badge: { ar: string; en: string };
  primaryColor: string;
  swatches: string[];
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

const createThemePalette = (mode: "light" | "dark", primary: string, primaryHover: string, secondary: string, accent: string, background: string, card: string, sidebar: string, border: string, foreground: string, mutedForeground: string, chart: string[], primaryForeground = "#ffffff") => ({
  background,
  foreground,
  card,
  cardForeground: foreground,
  popover: card,
  popoverForeground: foreground,
  primary,
  primaryForeground,
  primaryHover,
  secondary,
  secondaryForeground: foreground,
  muted: mode === "light" ? "#f8fafc" : "#1e293b",
  mutedForeground: mutedForeground,
  accent,
  accentForeground: primary,
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border,
  input: border,
  inputBackground: card,
  ring: primary,
  sidebarBackground: sidebar,
  sidebarForeground: foreground,
  sidebarBorder: border,
  sidebarActiveBackground: accent,
  sidebarActiveForeground: primary,
  success: mode === "light" ? "#15803d" : "#4ade80",
  successForeground: "#f8fafc",
  warning: mode === "light" ? "#d97706" : "#fbbf24",
  warningForeground: "#111827",
  info: mode === "light" ? "#2563eb" : "#60a5fa",
  infoForeground: "#f8fafc",
  chart,
  pageBg: background,
  cardBg: card,
  sidebarBg: sidebar,
  text: foreground,
  mutedText: mutedForeground,
});

export const DASHBOARD_THEMES: DashboardThemeDefinition[] = [
  {
    id: "wani",
    name: { ar: "وني — الافتراضي", en: "Wani — Default" },
    description: { ar: "الهوية البصرية الأصلية لـ Wani، عصرية ونقية ومريحة للعين", en: "Clean, modern and fresh" },
    badge: { ar: "الافتراضي", en: "Default" },
    primaryColor: "#16a34a",
    swatches: ["#16a34a", "#22c55e", "#f8fafc", "#0f172a"],
    colors: {
      light: createThemePalette("light", "#16a34a", "#15803d", "#f1f5f9", "#dcfce7", "#f8fafc", "#ffffff", "#ffffff", "#e2e8f0", "#0f172a", "#64748b", ["#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444"]),
      dark: createThemePalette("dark", "#22c55e", "#16a34a", "#1e293b", "#14532d", "#020617", "#0b0f19", "#080c14", "#1e293b", "#f8fafc", "#94a3b8", ["#22c55e", "#38bdf8", "#a78bfa", "#fbbf24", "#f87171"]),
    },
  },
  {
    id: "ocean",
    name: { ar: "المحيط", en: "Ocean" },
    description: { ar: "أزرق محيطي منعش وهادئ، يمنح شعوراً بالتركيز والاحترافية", en: "Calm and refreshing" },
    badge: { ar: "منعش", en: "Refreshing" },
    primaryColor: "#0284c7",
    swatches: ["#0284c7", "#38bdf8", "#f0f9ff", "#0f2137"],
    colors: {
      light: createThemePalette("light", "#0284c7", "#0369a1", "#e0f2fe", "#bae6fd", "#f0f7fc", "#ffffff", "#fcfdff", "#bae6fd", "#0c4a6e", "#0369a1", ["#0284c7", "#06b6d4", "#3b82f6", "#10b981", "#f59e0b"]),
      dark: createThemePalette("dark", "#0ea5e9", "#0284c7", "#0c4a6e", "#075985", "#070d16", "#0d1726", "#09111c", "#16283d", "#f0f9ff", "#7dd3fc", ["#38bdf8", "#22d3ee", "#60a5fa", "#34d399", "#fbbf24"]),
    },
  },
  {
    id: "emerald",
    name: { ar: "الزمرد", en: "Emerald" },
    description: { ar: "طبيعي، متوازن وفاخر يرمز للنمو والنجاح المؤسسي", en: "Natural and balanced" },
    badge: { ar: "طبيعي", en: "Natural" },
    primaryColor: "#059669",
    swatches: ["#059669", "#34d399", "#f0fdf4", "#0a2920"],
    colors: {
      light: createThemePalette("light", "#059669", "#047857", "#dcfce7", "#bbf7d0", "#f4faf6", "#ffffff", "#fcfdfc", "#bbf7d0", "#064e3b", "#047857", ["#059669", "#10b981", "#0284c7", "#8b5cf6", "#f59e0b"]),
      dark: createThemePalette("dark", "#10b981", "#059669", "#064e3b", "#065f46", "#06140f", "#0d221b", "#081b15", "#133a2e", "#f0fdf4", "#6ee7b7", ["#34d399", "#6ee7b7", "#38bdf8", "#c084fc", "#fbbf24"]),
    },
  },
  {
    id: "violet",
    name: { ar: "البنفسج", en: "Violet" },
    description: { ar: "إبداعي، عصري وفائق الأناقة لأصحاب الرؤى المتقدمة", en: "Creative and modern" },
    badge: { ar: "إبداعي", en: "Creative" },
    primaryColor: "#7c3aed",
    swatches: ["#7c3aed", "#a78bfa", "#faf5ff", "#1c1231"],
    colors: {
      light: createThemePalette("light", "#7c3aed", "#6d28d9", "#f3e8ff", "#e9d5ff", "#fcf9fe", "#ffffff", "#fdfbfe", "#e9d5ff", "#581c87", "#6d28d9", ["#7c3aed", "#a855f7", "#ec4899", "#06b6d4", "#f59e0b"]),
      dark: createThemePalette("dark", "#9d67ff", "#7c3aed", "#581c87", "#4c1d95", "#0f071a", "#1b102c", "#140b22", "#2b1945", "#faf5ff", "#c084fc", ["#a78bfa", "#c084fc", "#f472b6", "#22d3ee", "#fbbf24"]),
    },
  },
  {
    id: "slate",
    name: { ar: "الحجر الصخري", en: "Slate" },
    description: { ar: "بسيط، هندسي وموجّه للتركيز العالي والوضوح التام", en: "Minimal and focused" },
    badge: { ar: "هندسي", en: "Minimal" },
    primaryColor: "#334155",
    swatches: ["#334155", "#94a3b8", "#f1f5f9", "#151b26"],
    colors: {
      light: createThemePalette("light", "#334155", "#1e293b", "#e2e8f0", "#cbd5e1", "#f1f5f9", "#ffffff", "#f8fafc", "#cbd5e1", "#0f172a", "#475569", ["#334155", "#475569", "#0ea5e9", "#10b981", "#f59e0b"]),
      dark: createThemePalette("dark", "#cbd5e1", "#f1f5f9", "#1e293b", "#334155", "#0a0d13", "#131822", "#0e121a", "#1e2636", "#f8fafc", "#94a3b8", ["#94a3b8", "#cbd5e1", "#38bdf8", "#34d399", "#fbbf24"]),
    },
  },
];

interface DashboardThemeContextValue {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => Promise<void>;
  currentThemeConfig: DashboardThemeDefinition;
  allThemes: DashboardThemeDefinition[];
  chartColors: string[];
  isDark: boolean;
}

const STORAGE_KEY = "wani_dashboard_theme";

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<DashboardTheme>("wani");
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (typeof document === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DashboardTheme | null;
      const nextTheme = saved && VALID_THEMES.includes(saved) ? saved : "wani";
      setThemeState(nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
    } catch {
      document.documentElement.setAttribute("data-theme", "wani");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const currentThemeConfig = useMemo(() => {
    return DASHBOARD_THEMES.find((t) => t.id === theme) ?? DASHBOARD_THEMES[0];
  }, [theme]);

  const chartColors = useMemo(() => {
    const mode = isDark ? "dark" : "light";
    return currentThemeConfig.colors[mode].chart;
  }, [currentThemeConfig, isDark]);

  const setTheme = useCallback(async (newTheme: DashboardTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;

    setThemeState(newTheme);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch {
      // ignore localStorage errors in sandboxed environments
    }

    fetch("/api/me/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "appearance", theme: newTheme }),
    }).catch((err) => {
      console.warn("[theme] Failed to persist theme to backend:", err);
    });
  }, []);

  const syncWithUserTheme = useCallback((backendTheme?: string | null) => {
    if (backendTheme && VALID_THEMES.includes(backendTheme as DashboardTheme)) {
      const valid = backendTheme as DashboardTheme;
      setThemeState((current) => (current === valid ? current : valid));
      try {
        localStorage.setItem(STORAGE_KEY, valid);
        document.documentElement.setAttribute("data-theme", valid);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const handleSync = (e: CustomEvent<{ theme: string }>) => {
      if (e.detail?.theme) syncWithUserTheme(e.detail.theme);
    };
    window.addEventListener("sync-user-theme" as any, handleSync);
    return () => window.removeEventListener("sync-user-theme" as any, handleSync);
  }, [syncWithUserTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      currentThemeConfig,
      allThemes: DASHBOARD_THEMES,
      chartColors,
      isDark,
    }),
    [theme, setTheme, currentThemeConfig, chartColors, isDark]
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme(): DashboardThemeContextValue {
  const context = useContext(DashboardThemeContext);
  if (!context) {
    return {
      theme: "wani",
      setTheme: async () => {},
      currentThemeConfig: DASHBOARD_THEMES[0],
      allThemes: DASHBOARD_THEMES,
      chartColors: DASHBOARD_THEMES[0].colors.light.chart,
      isDark: false,
    };
  }
  return context;
}
