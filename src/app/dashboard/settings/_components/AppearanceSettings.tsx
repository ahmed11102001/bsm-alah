"use client";

import React, { useState } from "react";
import { Palette, Check, ChevronLeft, ChevronRight, Sun, Moon, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useDashboardTheme, DASHBOARD_THEMES, type DashboardThemeDefinition } from "@/lib/theme-context";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AppearanceSettings() {
  const { locale, dir } = useLanguage();
  const { theme: activeTheme, setTheme, currentThemeConfig, isDark } = useDashboardTheme();
  const [open, setOpen] = useState(false);

  const isRtl = dir === "rtl" || locale === "ar";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const handleSelectTheme = (themeId: DashboardThemeDefinition["id"]) => {
    if (themeId === activeTheme) return;
    // Instant switch without animation delay or loading spinners
    setTheme(themeId);
    const targetTheme = DASHBOARD_THEMES.find((t) => t.id === themeId);
    const themeName = targetTheme ? (targetTheme.name[locale as "ar" | "en"] ?? targetTheme.name.ar) : themeId;
    toast.success(
      locale === "ar"
        ? `تم تفعيل مظهر "${themeName}" بنجاح ✨`
        : `Switched to "${themeName}" theme ✨`
    );
  };

  const activeMode = isDark ? "dark" : "light";
  const activePalette = currentThemeConfig.colors[activeMode];
  const activeName = currentThemeConfig.name[locale as "ar" | "en"] ?? currentThemeConfig.name.ar;

  return (
    <div className="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-3xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left / Info side */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Palette className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {locale === "ar" ? "المظهر" : "Appearance"}
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {activeName}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {locale === "ar"
                ? "غيّر شكل وألوان لوحة التحكم المفضلة لديك"
                : "Customize your dashboard visual theme and colors"}
            </p>
          </div>
        </div>

        {/* Right / Trigger Button side */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
          {/* Active theme color swatches */}
          <div
            className="hidden xs:flex items-center -space-x-1.5 rtl:space-x-reverse"
            title={activeName}
          >
            {currentThemeConfig.swatches.slice(0, 4).map((color, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-xs flex-shrink-0"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:bg-primary/5 text-gray-800 dark:text-gray-200 gap-2 h-9 px-3.5 text-xs font-semibold shadow-xs"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activePalette.primary }}
                  />
                  <span>{activeName}</span>
                </span>
                <ChevronIcon className="w-3.5 h-3.5 text-gray-400" />
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md sm:max-w-lg p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
              <DialogHeader className="text-start pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    {locale === "ar" ? "سمة لوحة التحكم" : "Dashboard Theme"}
                  </DialogTitle>
                  <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {isDark ? (
                      <>
                        <Moon className="w-3 h-3 text-blue-400" />
                        <span>{locale === "ar" ? "داكن" : "Dark"}</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3 h-3 text-amber-500" />
                        <span>{locale === "ar" ? "فاتح" : "Light"}</span>
                      </>
                    )}
                  </span>
                </div>
                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-start">
                  {locale === "ar"
                    ? "اختر شكل وألوان لوحة التحكم. يتم تطبيق التغيير فورًا ويتناغم مع الوضعين الفاتح والداكن."
                    : "Choose your dashboard theme. Changes apply instantly and adapt to light and dark modes."}
                </DialogDescription>
              </DialogHeader>

              {/* Theme selection grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3" role="radiogroup" aria-label="Dashboard themes">
                {DASHBOARD_THEMES.map((themeDef) => {
                  const isSelected = activeTheme === themeDef.id;
                  const palette = themeDef.colors[activeMode];
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
                      className={`group relative rounded-2xl border p-3 transition-all cursor-pointer select-none text-start flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                          : "border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:border-primary/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/80"
                      }`}
                    >
                      {/* Top row: Name + Badge / Check */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 shadow-2xs"
                            style={{ backgroundColor: palette.primary }}
                          />
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                            {name}
                          </span>
                        </div>

                        {isSelected ? (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                            {locale === "ar" ? "المحدد" : "Active"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                            {badge}
                          </span>
                        )}
                      </div>

                      {/* Mini Preview Bar */}
                      <div
                        className="w-full h-12 rounded-lg border overflow-hidden flex mb-2 shadow-2xs"
                        style={{
                          backgroundColor: palette.pageBg,
                          borderColor: palette.border,
                        }}
                      >
                        {/* Mini sidebar */}
                        <div
                          className="w-1/3 border-e p-1 flex flex-col gap-1"
                          style={{
                            backgroundColor: palette.sidebarBg,
                            borderColor: palette.border,
                          }}
                        >
                          <div
                            className="h-2 rounded-xs"
                            style={{ backgroundColor: palette.accent }}
                          />
                          <div
                            className="h-1.5 rounded-xs"
                            style={{ backgroundColor: palette.border }}
                          />
                        </div>
                        {/* Mini body */}
                        <div className="flex-1 p-1 flex flex-col justify-between">
                          <div
                            className="h-2 rounded-xs"
                            style={{ backgroundColor: palette.cardBg, borderColor: palette.border }}
                          />
                          <div className="flex items-center gap-1">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: palette.primary }}
                            />
                            <div
                              className="h-1 rounded-full flex-1"
                              style={{ backgroundColor: palette.primary, opacity: 0.3 }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Swatches */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100/80 dark:border-gray-800/80">
                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
                          {desc}
                        </span>
                        <div className="flex items-center -space-x-1 rtl:space-x-reverse flex-shrink-0">
                          {themeDef.swatches.slice(0, 4).map((color, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-gray-900 flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal footer */}
              <div className="pt-2 flex justify-end">
                <DialogClose asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 text-xs font-semibold"
                  >
                    {locale === "ar" ? "إغلاق" : "Done"}
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
