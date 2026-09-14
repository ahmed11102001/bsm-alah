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
  // اختيار محلي مؤقت — منفصل تمامًا عن الثيم المطبّق فعليًا على الداشبورد.
  // بيتحرك فورًا مع كل ضغطة (زي راديو بسيط)، من غير أي استدعاء شبكة أو
  // context خارجي، فمفيه أي تأخير أو تضارب. التطبيق الفعلي (setTheme +
  // الرسالة) بيحصل بس لما المستخدم يدوس "تأكيد".
  const [pendingTheme, setPendingTheme] = useState<DashboardThemeDefinition["id"]>(activeTheme);
  const [applying, setApplying] = useState(false);

  const isRtl = dir === "rtl" || locale === "ar";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;
  const hasPendingChange = pendingTheme !== activeTheme;

  const handleOpenChange = (next: boolean) => {
    // كل ما نفتح المودال، نبدأ من الثيم الحقيقي المطبّق — مش من أي اختيار
    // سابق اتسكر المودال من غير تأكيد.
    if (next) setPendingTheme(activeTheme);
    setOpen(next);
  };

  const handleConfirm = async () => {
    if (!hasPendingChange || applying) return;
    setApplying(true);
    try {
      await setTheme(pendingTheme);
      const targetTheme = DASHBOARD_THEMES.find((t) => t.id === pendingTheme);
      const themeName = targetTheme ? (targetTheme.name[locale as "ar" | "en"] ?? targetTheme.name.ar) : pendingTheme;
      toast.success(
        locale === "ar"
          ? `تم تفعيل مظهر "${themeName}" بنجاح ✨`
          : `Switched to "${themeName}" theme ✨`
      );
    } finally {
      setApplying(false);
    }
  };

  const activeMode = isDark ? "dark" : "light";
  const activePalette = currentThemeConfig.colors[activeMode];
  const activeName = currentThemeConfig.name[locale as "ar" | "en"] ?? currentThemeConfig.name.ar;

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Palette className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {locale === "ar" ? "المظهر" : "Appearance"}
              </h3>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {activeName}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {locale === "ar"
                ? "غيّر شكل وألوان لوحة التحكم المفضلة لديك"
                : "Customize your dashboard visual theme and colors"}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 self-end sm:self-auto">
          <div
            className="hidden items-center -space-x-1.5 rtl:space-x-reverse xs:flex"
            title={activeName}
          >
            {currentThemeConfig.swatches.slice(0, 4).map((color, i) => (
              <span
                key={i}
                className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-2 ring-background shadow-xs"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-xl border-border bg-background text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: activePalette.primary }}
                  />
                  <span>{activeName}</span>
                </span>
                <ChevronIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl sm:max-w-lg sm:p-6">
              <DialogHeader className="border-b border-border pb-2 text-start">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
                    <Palette className="h-5 w-5 text-primary" />
                    {locale === "ar" ? "سمة لوحة التحكم" : "Dashboard Theme"}
                  </DialogTitle>
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    {isDark ? (
                      <>
                        <Moon className="h-3 w-3 text-info" />
                        <span>{locale === "ar" ? "داكن" : "Dark"}</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-3 w-3 text-warning" />
                        <span>{locale === "ar" ? "فاتح" : "Light"}</span>
                      </>
                    )}
                  </span>
                </div>
                <DialogDescription className="mt-1 text-start text-xs text-muted-foreground">
                  {locale === "ar"
                    ? "اختر شكل وألوان لوحة التحكم. يتم تطبيق التغيير فورًا ويتناغم مع الوضعين الفاتح والداكن."
                    : "Choose your dashboard theme. Changes apply instantly and adapt to light and dark modes."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-2" role="radiogroup" aria-label="Dashboard themes">
                {DASHBOARD_THEMES.map((themeDef) => {
                  const isSelected = pendingTheme === themeDef.id;
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
                      onClick={() => setPendingTheme(themeDef.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPendingTheme(themeDef.id);
                        }
                      }}
                      className={`group relative flex cursor-pointer select-none flex-col justify-between rounded-2xl border p-3 text-start transition-all ${isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                        : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/60"
                        }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-3 w-3 flex-shrink-0 rounded-full shadow-2xs"
                            style={{ backgroundColor: palette.primary }}
                          />
                          <span className="truncate text-xs font-bold text-foreground">{name}</span>
                        </div>

                        {isSelected ? (
                          <span className="flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                            <Check className="h-3 w-3 stroke-[3]" />
                            {locale === "ar" ? "المحدد" : "Selected"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground">{badge}</span>
                        )}
                      </div>

                      <div
                        className="mb-2 flex h-12 w-full overflow-hidden rounded-lg border shadow-2xs"
                        style={{
                          backgroundColor: palette.background,
                          borderColor: palette.border,
                        }}
                      >
                        <div
                          className="w-1/3 border-e p-1"
                          style={{
                            backgroundColor: palette.sidebarBackground,
                            borderColor: palette.border,
                          }}
                        >
                          <div className="h-2 rounded-xs" style={{ backgroundColor: palette.accent }} />
                          <div className="mt-1 h-1.5 rounded-xs" style={{ backgroundColor: palette.border }} />
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-1">
                          <div className="h-2 rounded-xs" style={{ backgroundColor: palette.card, borderColor: palette.border }} />
                          <div className="flex items-center gap-1">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.primary }} />
                            <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: palette.primary, opacity: 0.3 }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-1">
                        <span className="max-w-[100px] truncate text-[10px] text-muted-foreground">{desc}</span>
                        <div className="flex flex-shrink-0 items-center -space-x-1 rtl:space-x-reverse">
                          {themeDef.swatches.slice(0, 4).map((color, i) => (
                            <span
                              key={i}
                              className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-1 ring-background"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <span className="text-[11px] text-muted-foreground">
                  {hasPendingChange
                    ? (locale === "ar" ? "التغيير لسه مطبقش" : "Not applied yet")
                    : ""}
                </span>
                <div className="flex items-center gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm" className="rounded-xl border-border px-4 text-xs font-semibold">
                      {locale === "ar" ? "إغلاق" : "Close"}
                    </Button>
                  </DialogClose>
                  {hasPendingChange && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleConfirm}
                      disabled={applying}
                      className="rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      {applying ? (
                        locale === "ar" ? "جارٍ التطبيق..." : "Applying..."
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          {locale === "ar" ? "تأكيد التغيير" : "Confirm change"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}