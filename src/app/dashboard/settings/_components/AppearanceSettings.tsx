"use client";

import React, { useState } from "react";
import { Check, Palette, Sparkles, Sun, Moon, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useDashboardTheme, DASHBOARD_THEMES, type DashboardThemeDefinition } from "@/lib/theme-context";
import { toast } from "sonner";

export default function AppearanceSettings() {
  const { locale, dir } = useLanguage();
  const { theme: activeTheme, setTheme, isDark } = useDashboardTheme();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSelectTheme = async (themeId: DashboardThemeDefinition["id"]) => {
    if (themeId === activeTheme) return;
    setSwitching(themeId);
    try {
      await setTheme(themeId);
      const targetTheme = DASHBOARD_THEMES.find((t) => t.id === themeId);
      const themeName = targetTheme ? targetTheme.name[locale as "ar" | "en"] ?? targetTheme.name.ar : themeId;
      toast.success(
        locale === "ar"
          ? `تم تفعيل مظهر "${themeName}" بنجاح ✨`
          : `Switched to "${themeName}" theme ✨`
      );
    } catch {
      toast.error(locale === "ar" ? "تعذر حفظ المظهر" : "Failed to save theme");
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Palette className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              {locale === "ar" ? "المظهر وألوان اللوحة" : "Appearance & Themes"}
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                5 Themes
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "ar"
                ? "اختر السمة البصرية للوحة التحكم الخاصة بك. تعمل جميع السمات بتناغم كامل مع الوضعين الفاتح والداكن."
                : "Choose your preferred dashboard visual theme. All themes adapt seamlessly to light and dark modes."}
            </p>
          </div>
        </div>

        {/* Mode info badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-blue-400" />
              <span>{locale === "ar" ? "الوضع الحالي: داكن" : "Current: Dark Mode"}</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>{locale === "ar" ? "الوضع الحالي: فاتح" : "Current: Light Mode"}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Themes Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-5" role="radiogroup" aria-label="Dashboard themes">
        {DASHBOARD_THEMES.map((themeDef) => {
          const isSelected = activeTheme === themeDef.id;
          const isPending = switching === themeDef.id;
          const modeKey = isDark ? "dark" : "light";
          const palette = themeDef.colors[modeKey];
          const name = themeDef.name[locale as "ar" | "en"] ?? themeDef.name.ar;
          const desc = themeDef.description[locale as "ar" | "en"] ?? themeDef.description.ar;
          const badge = themeDef.badge[locale as "ar" | "en"] ?? themeDef.badge.ar;

          return (
            <div
              key={themeDef.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => handleSelectTheme(themeDef.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectTheme(themeDef.id);
                }
              }}
              className={`group relative rounded-2xl border text-start transition-all duration-200 cursor-pointer p-3.5 flex flex-col justify-between select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-md"
                  : "border-border bg-card/60 hover:border-primary/50 hover:bg-accent/40"
              }`}
            >
              {/* Selected check indicator or badge */}
              <div className="absolute top-2.5 end-2.5 z-10 flex items-center gap-1.5">
                {isSelected ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-sm animate-in fade-in zoom-in duration-150">
                    <Check className="w-3 h-3 stroke-[3]" />
                    {locale === "ar" ? "المحدد" : "Active"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground text-[10px] font-medium border border-border group-hover:border-primary/40 group-hover:text-foreground transition-colors">
                    {badge}
                  </span>
                )}
              </div>

              {/* ── Realistic Mini Dashboard Preview ── */}
              <div
                className="w-full h-32 rounded-xl overflow-hidden border shadow-inner flex flex-col mb-3.5 relative transition-transform duration-200 group-hover:scale-[1.01]"
                style={{
                  backgroundColor: palette.pageBg,
                  borderColor: palette.border,
                }}
              >
                {/* Topbar of the mini dashboard */}
                <div
                  className="h-6 border-b flex items-center justify-between px-2.5 flex-shrink-0"
                  style={{
                    backgroundColor: palette.sidebarBg,
                    borderColor: palette.border,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: palette.primary }} />
                    <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: palette.border }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-2.5 rounded-md" style={{ backgroundColor: palette.secondary }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.border }} />
                  </div>
                </div>

                {/* Body: Mini Sidebar + Mini Content Area */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Mini Sidebar */}
                  <div
                    className="w-12 border-e p-1.5 flex flex-col gap-1 flex-shrink-0"
                    style={{
                      backgroundColor: palette.sidebarBg,
                      borderColor: palette.border,
                    }}
                  >
                    {/* Active nav item */}
                    <div
                      className="h-3 rounded-md flex items-center px-1 gap-1"
                      style={{
                        backgroundColor: palette.accent,
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.primary }} />
                      <div className="w-5 h-1 rounded-full" style={{ backgroundColor: palette.primary }} />
                    </div>
                    {/* Inactive nav items */}
                    <div className="h-2.5 rounded-md flex items-center px-1">
                      <div className="w-6 h-1 rounded-full" style={{ backgroundColor: palette.border }} />
                    </div>
                    <div className="h-2.5 rounded-md flex items-center px-1">
                      <div className="w-5 h-1 rounded-full" style={{ backgroundColor: palette.border }} />
                    </div>
                  </div>

                  {/* Mini Main Content Canvas */}
                  <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-hidden">
                    {/* 2 Stat Cards */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div
                        className="rounded-lg p-1.5 border shadow-2xs flex flex-col justify-between"
                        style={{
                          backgroundColor: palette.cardBg,
                          borderColor: palette.border,
                        }}
                      >
                        <div className="w-7 h-1 rounded-full" style={{ backgroundColor: palette.mutedText }} />
                        <div className="w-5 h-1.5 rounded-full mt-1" style={{ backgroundColor: palette.text }} />
                      </div>
                      <div
                        className="rounded-lg p-1.5 border shadow-2xs flex flex-col justify-between"
                        style={{
                          backgroundColor: palette.cardBg,
                          borderColor: palette.border,
                        }}
                      >
                        <div className="w-6 h-1 rounded-full" style={{ backgroundColor: palette.mutedText }} />
                        <div className="w-7 h-1.5 rounded-full mt-1" style={{ backgroundColor: palette.primary }} />
                      </div>
                    </div>

                    {/* Mini Chart / Progress Visualization */}
                    <div
                      className="flex-1 rounded-lg border p-1.5 flex items-end gap-1 justify-between shadow-2xs"
                      style={{
                        backgroundColor: palette.cardBg,
                        borderColor: palette.border,
                      }}
                    >
                      <div className="w-full flex items-end gap-1 h-full pt-1">
                        <div
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height: "45%",
                            backgroundColor: palette.chart[0] ?? palette.primary,
                          }}
                        />
                        <div
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height: "75%",
                            backgroundColor: palette.chart[1] ?? palette.primary,
                          }}
                        />
                        <div
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height: "60%",
                            backgroundColor: palette.chart[2] ?? palette.primary,
                          }}
                        />
                        <div
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height: "90%",
                            backgroundColor: palette.chart[0] ?? palette.primary,
                          }}
                        />
                      </div>
                      {/* Mini CTA button */}
                      <div
                        className="w-10 h-3 rounded-md flex items-center justify-center flex-shrink-0 self-center"
                        style={{ backgroundColor: palette.primary }}
                      >
                        <div className="w-6 h-1 rounded-full bg-white/90" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loading indicator overlay during switch */}
                {isPending && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                )}
              </div>

              {/* ── Theme Title & Details ── */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: themeDef.primaryColor }}
                    />
                    {name}
                  </h4>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                  {desc}
                </p>

                {/* Color Swatches */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground me-1 font-mono">
                    {locale === "ar" ? "الألوان:" : "Palette:"}
                  </span>
                  <div className="flex items-center gap-1">
                    {themeDef.swatches.map((swatch, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-border shadow-2xs inline-block"
                        style={{ backgroundColor: swatch }}
                        title={swatch}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
