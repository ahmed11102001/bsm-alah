"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useTheme as useNextTheme } from "next-themes";
import { type DashboardTheme, VALID_THEMES } from "./schemas";

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  pageBg: string;
  cardBg: string;
  sidebarBg: string;
  border: string;
  text: string;
  mutedText: string;
  chart: string[];
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

export const DASHBOARD_THEMES: DashboardThemeDefinition[] = [
  {
    id: "wani",
    name: { ar: "وني — الافتراضي", en: "Wani — Default" },
    description: { ar: "الهوية البصرية الأصلية لـ Wani، عصرية ونقية ومريحة للعين", en: "Clean, modern and fresh" },
    badge: { ar: "الافتراضي", en: "Default" },
    primaryColor: "#16a34a",
    swatches: ["#16a34a", "#22c55e", "#f8fafc", "#0f172a"],
    colors: {
      light: {
        primary: "#16a34a",
        primaryHover: "#15803d",
        secondary: "#f1f5f9",
        accent: "#dcfce7",
        pageBg: "#f8fafc",
        cardBg: "#ffffff",
        sidebarBg: "#ffffff",
        border: "#e2e8f0",
        text: "#0f172a",
        mutedText: "#64748b",
        chart: ["#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444"],
      },
      dark: {
        primary: "#22c55e",
        primaryHover: "#16a34a",
        secondary: "#1e293b",
        accent: "#14532d",
        pageBg: "#020617",
        cardBg: "#0b0f19",
        sidebarBg: "#080c14",
        border: "#1e293b",
        text: "#f8fafc",
        mutedText: "#94a3b8",
        chart: ["#22c55e", "#38bdf8", "#a78bfa", "#fbbf24", "#f87171"],
      },
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
      light: {
        primary: "#0284c7",
        primaryHover: "#0369a1",
        secondary: "#e0f2fe",
        accent: "#bae6fd",
        pageBg: "#f0f7fc",
        cardBg: "#ffffff",
        sidebarBg: "#fcfdff",
        border: "#bae6fd",
        text: "#0c4a6e",
        mutedText: "#0369a1",
        chart: ["#0284c7", "#06b6d4", "#3b82f6", "#10b981", "#f59e0b"],
      },
      dark: {
        primary: "#0ea5e9",
        primaryHover: "#0284c7",
        secondary: "#0c4a6e",
        accent: "#075985",
        pageBg: "#070d16",
        cardBg: "#0d1726",
        sidebarBg: "#09111c",
        border: "#16283d",
        text: "#f0f9ff",
        mutedText: "#7dd3fc",
        chart: ["#38bdf8", "#22d3ee", "#60a5fa", "#34d399", "#fbbf24"],
      },
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
      light: {
        primary: "#059669",
        primaryHover: "#047857",
        secondary: "#dcfce7",
        accent: "#bbf7d0",
        pageBg: "#f4faf6",
        cardBg: "#ffffff",
        sidebarBg: "#fcfdfc",
        border: "#bbf7d0",
        text: "#064e3b",
        mutedText: "#047857",
        chart: ["#059669", "#10b981", "#0284c7", "#8b5cf6", "#f59e0b"],
      },
      dark: {
        primary: "#10b981",
        primaryHover: "#059669",
        secondary: "#064e3b",
        accent: "#065f46",
        pageBg: "#06140f",
        cardBg: "#0d221b",
        sidebarBg: "#081b15",
        border: "#133a2e",
        text: "#f0fdf4",
        mutedText: "#6ee7b7",
        chart: ["#34d399", "#6ee7b7", "#38bdf8", "#c084fc", "#fbbf24"],
      },
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
      light: {
        primary: "#7c3aed",
        primaryHover: "#6d28d9",
        secondary: "#f3e8ff",
        accent: "#e9d5ff",
        pageBg: "#fcf9fe",
        cardBg: "#ffffff",
        sidebarBg: "#fdfbfe",
        border: "#e9d5ff",
        text: "#581c87",
        mutedText: "#6d28d9",
        chart: ["#7c3aed", "#a855f7", "#ec4899", "#06b6d4", "#f59e0b"],
      },
      dark: {
        primary: "#9d67ff",
        primaryHover: "#7c3aed",
        secondary: "#581c87",
        accent: "#4c1d95",
        pageBg: "#0f071a",
        cardBg: "#1b102c",
        sidebarBg: "#140b22",
        border: "#2b1945",
        text: "#faf5ff",
        mutedText: "#c084fc",
        chart: ["#a78bfa", "#c084fc", "#f472b6", "#22d3ee", "#fbbf24"],
      },
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
      light: {
        primary: "#334155",
        primaryHover: "#1e293b",
        secondary: "#e2e8f0",
        accent: "#cbd5e1",
        pageBg: "#f1f5f9",
        cardBg: "#ffffff",
        sidebarBg: "#f8fafc",
        border: "#cbd5e1",
        text: "#0f172a",
        mutedText: "#475569",
        chart: ["#334155", "#475569", "#0ea5e9", "#10b981", "#f59e0b"],
      },
      dark: {
        primary: "#cbd5e1",
        primaryHover: "#f1f5f9",
        secondary: "#1e293b",
        accent: "#334155",
        pageBg: "#0a0d13",
        cardBg: "#131822",
        sidebarBg: "#0e121a",
        border: "#1e2636",
        text: "#f8fafc",
        mutedText: "#94a3b8",
        chart: ["#94a3b8", "#cbd5e1", "#38bdf8", "#34d399", "#fbbf24"],
      },
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
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === "dark";

  // Initial load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DashboardTheme;
      if (saved && VALID_THEMES.includes(saved)) {
        setThemeState(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        document.documentElement.setAttribute("data-theme", "wani");
      }
    } catch {
      document.documentElement.setAttribute("data-theme", "wani");
    }
    setMounted(true);
  }, []);

  const currentThemeConfig = useMemo(() => {
    return DASHBOARD_THEMES.find((t) => t.id === theme) ?? DASHBOARD_THEMES[0];
  }, [theme]);

  const chartColors = useMemo(() => {
    const mode = isDark ? "dark" : "light";
    return currentThemeConfig.colors[mode].chart;
  }, [currentThemeConfig, isDark]);

  // Temporarily disable all transitions so theme switching is completely instant (⚡)
  const disableAnimationTemporarily = useCallback(() => {
    if (typeof document === "undefined") return () => {};
    const css = document.createElement("style");
    css.setAttribute("data-theme-transition-lock", "true");
    css.appendChild(
      document.createTextNode(
        `*, *::before, *::after {
          -webkit-transition: none !important;
          -moz-transition: none !important;
          -o-transition: none !important;
          -ms-transition: none !important;
          transition: none !important;
        }`
      )
    );
    document.head.appendChild(css);

    return () => {
      // Force layout reflow with transitions disabled
      (() => window.getComputedStyle(document.body))();
      // Restore normal transitions in the next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            if (document.head.contains(css)) {
              document.head.removeChild(css);
            }
          } catch {}
        });
      });
    };
  }, []);

  const setTheme = useCallback(async (newTheme: DashboardTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;

    const restore = disableAnimationTemporarily();
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch {
      // ignore localStorage errors in sandboxed environments
    }
    setThemeState(newTheme);
    restore();

    // Persist to user settings in background if authenticated
    fetch("/api/me/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "appearance", theme: newTheme }),
    }).catch((err) => {
      console.warn("[theme] Failed to persist theme to backend:", err);
    });
  }, [disableAnimationTemporarily]);

  // Sync with user's saved theme from database when they log in / profile loads
  const syncWithUserTheme = useCallback((backendTheme?: string | null) => {
    if (backendTheme && VALID_THEMES.includes(backendTheme as DashboardTheme)) {
      const valid = backendTheme as DashboardTheme;
      setThemeState((current) => {
        if (current !== valid) {
          const restore = disableAnimationTemporarily();
          try {
            localStorage.setItem(STORAGE_KEY, valid);
            document.documentElement.setAttribute("data-theme", valid);
          } catch { }
          restore();
          return valid;
        }
        return current;
      });
    }
  }, [disableAnimationTemporarily]);

  // Expose sync helper on window for subscription / settings sync
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
    // Fallback if rendered outside provider
    return {
      theme: "wani",
      setTheme: async () => { },
      currentThemeConfig: DASHBOARD_THEMES[0],
      allThemes: DASHBOARD_THEMES,
      chartColors: DASHBOARD_THEMES[0].colors.light.chart,
      isDark: false,
    };
  }
  return context;
}
