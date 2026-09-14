"use client";
import { DashboardHomeSkeleton } from "@/components/dashboard/DashboardSkeletons";

import "@/app/globals.css";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { signOutWithPushCleanup } from "@/lib/push-client";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { SubscriptionProvider, useSubscription, type DashboardData } from "@/lib/dashboard-context";
import { useDashboardTheme } from "@/lib/theme-context";
import {
  visibleSidebarIds, adminItem, PLAN_COLORS, sidebarHref,
} from "@/app/dashboard/_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  User, Users, Settings, LogOut, Loader2, Shield, Phone, Mail,
  Lock, Sun, Moon, Monitor, Languages, CreditCard, Sparkles, Handshake,
  ChevronLeft, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen,
  Eye, EyeOff, Copy, type LucideIcon,
  ArrowLeft, ArrowRight, Globe, Building2, MapPin, Camera, Image as ImageIcon,
} from "lucide-react";
import { hasPermission, type Permission } from "@/lib/permissions-core";
import NotificationBell from "@/components/dashboard/NotificationBell";
import DashboardAssistant from "@/components/dashboard/assistant";
import ReviewPrompt from "@/components/dashboard/ReviewPrompt";
import PushNotificationPrompt from "@/components/dashboard/PushNotificationPrompt";
import { playNavSound } from "@/lib/sounds";

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={compact ? "h-9 w-9" : "h-10 w-full"} />;

  const cycle = () => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  const icon = theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;
  const label = theme === "dark" ? t.theme.dark : theme === "light" ? t.theme.light : t.theme.system;

  if (compact) return (
    <button onClick={cycle} title={label}
      className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/60">
      {icon}
    </button>
  );

  return (
    <button onClick={cycle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground">
      {icon}<span>{label}</span>
    </button>
  );
}

// ─── Language Toggle ──────────────────────────────────────────────────────────
function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const toggle = () => setLocale(locale === "ar" ? "en" : "ar");
  const label = locale === "ar" ? "EN" : "ع";

  if (compact) return (
    <button onClick={toggle} title={locale === "ar" ? "Switch to English" : "تبديل للعربية"}
      className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors flex items-center justify-center gap-1">
      <Languages className="w-4 h-4" />
      <span className="text-xs font-bold leading-none">{label}</span>
    </button>
  );

  return (
    <button onClick={toggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground/80 hover:bg-muted/60 transition-all text-sm">
      <Languages className="w-4 h-4" />
      <span>{locale === "ar" ? "English" : "العربية"}</span>
    </button>
  );
}

// ─── Settings moved to /dashboard/settings page ────────────────────────────────

function ClaudeHeaderBadge({ locale, dir, onNavigate, isOpen = false, onOpenChange }: {
  locale: string;
  dir: string;
  onNavigate: (section: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const showMenu = onOpenChange ? isOpen : internalOpen;
  const setShowMenu = onOpenChange
    ? (open: boolean) => onOpenChange(open)
    : setInternalOpen;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        title="Claude AI"
        className="relative p-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
      >
        <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow overflow-hidden">
          <img src="/partners/claude.svg.svg" alt="Claude" className="w-5 h-5 object-contain" />
        </div>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full">
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
        </span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className={`absolute ${dir === "rtl" ? "left-0" : "right-0"} top-11 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl`}>
            <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
                <img src="/partners/claude.svg.svg" alt="" className="h-5 w-5 object-contain" onError={e => (e.target as HTMLImageElement).style.display = "none"} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Claude AI</p>
                <p className="text-[11px] text-orange-100">{locale === "ar" ? "مربوط ويعمل ✓" : "Connected & active ✓"}</p>
              </div>
            </div>

            <div className="space-y-1.5 p-3">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {locale === "ar" ? "قول لـ Claude في Desktop App:" : "Tell Claude in Desktop App:"}
              </p>
              {(locale === "ar" ? [
                { icon: "📊", text: "\"اعملي تقرير عن آخر حملة\"" },
                { icon: "🚀", text: "\"أنشئ حملة على قائمة VIP\"" },
                { icon: "💬", text: "\"فيه كام رسالة واردة؟\"" },
                { icon: "👥", text: "\"اعرضلي قوائم الجمهور\"" },
              ] : [
                { icon: "📊", text: "\"Give me a report on the last campaign\"" },
                { icon: "🚀", text: "\"Create a campaign for VIP list\"" },
                { icon: "💬", text: "\"How many unread messages?\"" },
                { icon: "👥", text: "\"Show me my contact lists\"" },
              ]).map((cmd, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-2 rounded-xl bg-muted/50">
                  <span className="text-sm flex-shrink-0">{cmd.icon}</span>
                  <p className="text-[11px] text-foreground/80 font-mono leading-snug">{cmd.text}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-3 py-2.5 flex items-center justify-between">
              <button
                onClick={() => { setShowMenu(false); onNavigate("api"); }}
                className="text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                {locale === "ar" ? "إدارة الربط" : "Manage connection"}
              </button>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/10" />
                {locale === "ar" ? "نشط" : "Active"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// ─── Dashboard Shell (Sidebar + Topbar + Mobile Menu) ────────────────────────
function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { canUseClaude } = useSubscription();
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [activeTopPanel, setActiveTopPanel] = useState<"claude" | "assistant" | "notifications" | null>(null);

  useEffect(() => {
    if (!canUseClaude) {
      setClaudeConnected(false);
      return;
    }
    fetch("/api/me/api-key")
      .then(r => r.ok ? r.json() : { apiKey: "" })
      .then(d => setClaudeConnected(!!d.apiKey))
      .catch(() => { });
  }, [canUseClaude]);

  const { t, dir, locale } = useLanguage();
  const { dashData, loadingDash, refreshDash, hasMetaConnection, isSuper } = useSubscription();
  const { setTheme: setAppTheme, theme: currentTheme } = useDashboardTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dashData?.user?.theme && dashData.user.theme !== currentTheme) {
      setAppTheme(dashData.user.theme as any);
    }
  }, [dashData?.user?.theme, currentTheme, setAppTheme]);

  useEffect(() => {
    setAccountPanelOpen(false);
  }, [pathname]);

  // ── CHAT_ONLY مالوش Dashboard home — يدخل على الشات مباشرة دايمًا ──────────
  // (فيه كمان guard مطابق على مستوى الـ server في middleware.ts)
  useEffect(() => {
    if (session?.user?.role === "CHAT_ONLY" && pathname === "/dashboard") {
      router.replace("/dashboard/chat");
    }
  }, [session?.user?.role, pathname, router]);

  // ── نتيجة ربط Shopify التلقائي (OAuth callback) — toast مرة واحدة وتنظيف الـURL ──
  // مقروءة من window.location عمدًا (بدل useSearchParams) لتفادي Suspense boundary.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("shopify_connected");
    const err = params.get("shopify_error");
    if (!connected && !err) return;
    if (connected) {
      toast.success("تم ربط متجر Shopify تلقائيًا ✅");
    } else {
      const messages: Record<string, string> = {
        missing_params: "ناقص بيانات الرجوع من Shopify — حاول تاني",
        invalid_shop: "دومين المتجر غير صالح",
        invalid_state: "انتهت صلاحية جلسة الربط — حاول تاني",
        user_not_found: "الحساب غير موجود",
        token_exchange_failed: "فشل استبدال الكود بتوكن — حاول تاني",
        no_token: "Shopify مرجعش توكن — حاول تاني",
        shop_taken: "المتجر مربوط بحساب آخر بالفعل",
        oauth_not_configured: "الربط التلقائي غير مفعّل حاليًا",
      };
      toast.error(messages[err ?? ""] ?? "فشل الربط التلقائي — حاول تاني");
    }
    params.delete("shopify_connected");
    params.delete("shopify_error");
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop: close the floating Account menu when clicking outside it or pressing Escape.
  useEffect(() => {
    if (!accountPanelOpen) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!accountMenuRef.current?.contains(target)) {
        setAccountPanelOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountPanelOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountPanelOpen]);

  const accountLabel = locale === "ar" ? "الحساب" : "Account";
  const openAccountPanel = () => {
    if (sidebarCollapsed) setSidebarCollapsed(false);
    setAccountPanelOpen((prev) => !prev);
  };

  // "/dashboard" → "home", "/dashboard/campaigns" → "campaigns" ... إلخ
  const activeSection = pathname === "/dashboard" ? "home" : (pathname.split("/")[2] ?? "home");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("wani_sidebar_collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("wani_sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleTriggerReview = () => {
      if (!dashData || dashData.user.hasTestimonial) return;
      const lastPrompt = localStorage.getItem("last_review_prompt");
      if (lastPrompt) {
        const diffDays = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
        if (diffDays < 1) return; // Cooldown is 1 day
      }
      setShowReviewPrompt(true);
      localStorage.setItem("last_review_prompt", Date.now().toString());
    };

    window.addEventListener("trigger-review-prompt", handleTriggerReview);
    return () => window.removeEventListener("trigger-review-prompt", handleTriggerReview);
  }, [dashData]);

  const openSettings = () => {
    setActiveTopPanel(null);
    setAccountPanelOpen(false);
    setMobileMenuOpen(false);
    router.push("/dashboard/settings");
  };

  const openNotifications = (open: boolean) => {
    setActiveTopPanel(open ? "notifications" : null);
  };

  const openClaudePanel = (open: boolean) => {
    setActiveTopPanel(open ? "claude" : null);
  };

  const openAssistantPanel = (open: boolean) => {
    setActiveTopPanel(open ? "assistant" : null);
  };

  // نفس التنقل البرمجي القديم (كان window event / setActiveSection) بقى router.push حقيقي
  const navigateTo = (section: string) => {
    if (section === "account") return; // Account is a popup menu, not its own page — nothing to route to.
    router.push(sidebarHref(section));
  };

  useEffect(() => {
    const h = (e: any) => { if (e.detail) navigateTo(e.detail); };
    window.addEventListener("navigate-to", h);
    return () => window.removeEventListener("navigate-to", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build sidebar items from translations
  const sidebarItems = visibleSidebarIds(session?.user?.role).map(item => ({
    ...item,
    label: t.sidebar[item.id as keyof typeof t.sidebar],
  }));

  const displayName = dashData?.user.name ?? session?.user?.name ?? (locale === "ar" ? "المستخدم" : "User");
  const initials = displayName.slice(0, 2).toUpperCase();
  const planName = dashData?.plan.planName ?? "—";
  const planColor = PLAN_COLORS[dashData?.plan.plan ?? "free"];

  // Account popup links are permission-driven. They intentionally do NOT belong
  // to the sidebar: Usage, Strategies and Wani Partner live under Account.
  type AccountLink = {
    id: string;
    href: string;
    permission: Permission;
    icon: LucideIcon;
    labelAr: string;
    labelEn: string;
  };

  const allAccountLinks: AccountLink[] = [
    {
      id: "usage",
      href: "/dashboard/usage",
      permission: "USAGE_VIEW",
      icon: CreditCard,
      labelAr: "الاستهلاك",
      labelEn: "Usage",
    },
    {
      id: "strategies",
      href: "/strategies?from=dashboard",
      permission: "STRATEGIES_VIEW",
      icon: Sparkles,
      labelAr: "الاستراتيجيات",
      labelEn: "Strategies",
    },
    {
      id: "wani-partner",
      href: "/dashboard/wani-partner",
      permission: "WANI_PARTNER_MANAGE",
      icon: Handshake,
      labelAr: "Wani Partner",
      labelEn: "Wani Partner",
    },
  ];

  const accountLinks = allAccountLinks.filter((item) =>
    hasPermission(session?.user?.role, item.permission)
  );

  const accountQuickLinks = (closeMobile = false) => (
    <>
      {accountLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => {
              playNavSound();
              setAccountPanelOpen(false);
              if (closeMobile) setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{locale === "ar" ? item.labelAr : item.labelEn}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200" dir={dir}>

      {/* ── Desktop Sidebar ── */}
      <aside className={`fixed bottom-0 top-0 z-40 hidden bg-sidebar text-sidebar-foreground transition-all duration-300 lg:flex lg:flex-col ${sidebarCollapsed ? "w-20" : "w-64"} ${dir === "rtl" ? "right-0 border-l border-sidebar-border" : "left-0 border-r border-sidebar-border"}`}>
        <div className={`flex h-16 flex-shrink-0 items-center border-b border-sidebar-border transition-all duration-300 ${sidebarCollapsed ? "justify-center px-2" : "px-6"}`}>
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary">
              <img src="/faviconlink.svg" alt="WANI" className="h-full w-full object-cover" />
            </div>
            {!sidebarCollapsed && (
              <span className="truncate text-lg font-bold">{locale === "ar" ? "وني" : "WANI"}</span>
            )}
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
          {sidebarItems.map((item) => (
            <Link key={item.id} href={sidebarHref(item.id)}
              data-sidebar-id={item.id}
              onClick={() => playNavSound()}
              title={sidebarCollapsed ? item.label : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${sidebarCollapsed ? "justify-center px-0" : ""} ${activeSection === item.id
                  ? "bg-sidebar-active text-sidebar-active-foreground font-semibold"
                  : "text-sidebar-foreground/75 hover:bg-muted/60 hover:text-sidebar-foreground"
                }`}>
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}

          {isSuper && (
            <Link href={sidebarHref("admin")}
              onClick={() => playNavSound()}
              title={sidebarCollapsed ? t.sidebar.admin : undefined}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${sidebarCollapsed ? "justify-center px-0" : ""} ${activeSection === "admin"
                  ? "bg-red-500/15 text-red-500 font-semibold"
                  : "text-red-400 hover:bg-red-500/10"
                }`}>
              <adminItem.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{t.sidebar.admin}</span>}
            </Link>
          )}
        </nav>

        <div
          ref={accountMenuRef}
          className={`relative flex-shrink-0 border-t border-sidebar-border ${sidebarCollapsed ? "p-2" : "p-3"}`}
        >
          <button
            type="button"
            data-sidebar-id="account"
            onClick={() => {
              playNavSound();
              openAccountPanel();
            }}
            title={sidebarCollapsed ? `${accountLabel} — ${planName}` : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${sidebarCollapsed ? "justify-center px-0" : ""} ${accountPanelOpen
                ? "bg-sidebar-active text-sidebar-active-foreground font-semibold"
                : "text-sidebar-foreground/80 hover:bg-muted/60"
              }`}
          >
            <User className="h-[18px] w-[18px] flex-shrink-0" />

            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 text-left rtl:text-right">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="truncate">{accountLabel}</p>
                  <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold ${planColor}`}>
                    {planName}
                  </span>
                </div>
                <p className="truncate text-[11px] text-sidebar-foreground/70">{displayName}</p>
              </div>
            )}

            {!sidebarCollapsed && (
              <ChevronDown
                className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${
                  accountPanelOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                }`}
              />
            )}
          </button>

          {accountPanelOpen && (
            <div
              className={`absolute bottom-2 z-[70] hidden w-64 rounded-2xl border border-border bg-popover p-3 shadow-2xl lg:block ${dir === "rtl" ? "right-[calc(100%+8px)]" : "left-[calc(100%+8px)]"}`}
            >
              <div className="mb-1 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{planName}</p>
                  </div>
                </div>
              </div>

              {accountQuickLinks()}

              {accountLinks.length > 0 && (
                <div className="my-1.5 border-t border-border" />
              )}

              <button
                type="button"
                onClick={() => { setAccountPanelOpen(false); openSettings(); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-muted/60"
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>{locale === "ar" ? "الإعدادات" : "Settings"}</span>
              </button>

              <LanguageToggle />
              <ThemeToggle />

              <div className="mt-1 border-t border-border pt-1.5">
                <button
                  type="button"
                  onClick={() => signOutWithPushCleanup(signOut, { callbackUrl: "/" })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span>{t.signOut}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </aside>

      {/* ── Mobile Full-Screen Menu ── */}
      {mobileMenuOpen && (
        <div
          dir={dir}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background lg:hidden"
        >
          <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-primary">
                <img src="/faviconlink.svg" alt="WANI" className="h-full w-full object-cover" />
              </div>
              <span className="text-base font-bold text-foreground">{locale === "ar" ? "وني" : "WANI"}</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/60 text-2xl leading-none"
            >
              ✕
            </button>
          </div>

          <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${planColor}`}>{planName}</span>
            </div>
          </div>

          <nav className="mt-4 space-y-1.5 px-4">
            {sidebarItems.map((item) => (
              <Link
                key={item.id}
                href={sidebarHref(item.id)}
                data-sidebar-id={item.id}
                onClick={() => {
                  playNavSound();
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-[15px] font-medium transition-all ${activeSection === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-foreground/80"
                  }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}

            {isSuper && (
              <Link
                href={sidebarHref("admin")}
                onClick={() => {
                  playNavSound();
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-[15px] font-medium transition-all ${activeSection === "admin"
                  ? "bg-red-500 text-white shadow-sm"
                  : "bg-card text-red-500"
                  }`}
              >
                <Shield className="h-5 w-5 flex-shrink-0" />
                <span>{t.sidebar.admin}</span>
              </Link>
            )}
          </nav>

          <div className="mb-6 mt-4 px-4">
            <button
              type="button"
              onClick={() => {
                playNavSound();
                setAccountPanelOpen((prev) => !prev);
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-3.5 text-foreground shadow-sm transition-all"
            >
              <User className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0 flex-1 text-left rtl:text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{accountLabel}</span>
                  <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold ${planColor}`}>
                    {planName}
                  </span>
                </div>
                <span className="block truncate text-[11px] text-muted-foreground">{displayName}</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${accountPanelOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`}
              />
            </button>

            {accountPanelOpen && (
              <div className="mt-3 space-y-2 rounded-2xl border border-border bg-card p-3">
                {accountQuickLinks(true)}

                {accountLinks.length > 0 && (
                  <div className="my-1.5 border-t border-border" />
                )}

                <button
                  type="button"
                  onClick={() => { openSettings(); setAccountPanelOpen(false); setMobileMenuOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-muted/60"
                >
                  <Settings className="h-4 w-4" />
                  <span>{locale === "ar" ? "الإعدادات" : "Settings"}</span>
                </button>
                <LanguageToggle />
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => { signOutWithPushCleanup(signOut, { callbackUrl: "/" }); setAccountPanelOpen(false); setMobileMenuOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.signOut}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main className={`flex-1 min-w-0 transition-all duration-300 ${dir === "rtl"
        ? (sidebarCollapsed ? "lg:mr-20" : "lg:mr-64")
        : (sidebarCollapsed ? "lg:ml-20" : "lg:ml-64")
        }`}>
        {/* Header */}
        <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 transition-colors duration-200">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors"
            aria-label="Open menu"
          >
            <div className="flex flex-col gap-[5px]">
              <span className="block w-[18px] h-0.5 bg-current rounded-full" />
              <span className="block w-[18px] h-0.5 bg-current rounded-full" />
              <span className="block w-[18px] h-0.5 bg-current rounded-full" />
            </div>
          </button>

          {/* Desktop Toggle Button in Topbar */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={sidebarCollapsed ? (locale === "ar" ? "توسيع القائمة" : "Expand sidebar") : (locale === "ar" ? "طي القائمة" : "Collapse sidebar")}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          <div className="flex-1 hidden lg:block" />

          <div className="flex items-center gap-2">
            <NotificationBell
              onNavigate={navigateTo}
              lang={locale === "en" ? "en" : "ar"}
              isOpen={activeTopPanel === "notifications"}
              onOpenChange={openNotifications}
              isSuperAdmin={isSuper}
            />

            {/* Claude Connected Badge */}
            {claudeConnected && (
              <ClaudeHeaderBadge
                locale={locale}
                dir={dir}
                onNavigate={navigateTo}
                isOpen={activeTopPanel === "claude"}
                onOpenChange={openClaudePanel}
              />
            )}
            <div id="assistant-header-slot" className="flex items-center" />

          </div>
        </header>

        <div className="p-4 lg:p-6">
          <DashboardAssistant
            userId={session?.user?.id ?? ""}
            role={session?.user?.role ?? "OWNER"}
            locale={locale as "ar" | "en"}
            activeSection={activeSection}
            whatsappConnected={hasMetaConnection}
            totalContacts={dashData?.stats.totalContacts ?? 0}
            deliveryRate={dashData?.stats.deliveryRate ?? 0}
            planStatus={dashData?.plan.status ?? "active"}
            planName={dashData?.plan.planName ?? ""}
            onNavigate={navigateTo}
            helperMountId="assistant-header-slot"
            helperOpen={activeTopPanel === "assistant"}
            onHelperOpenChange={openAssistantPanel}
            onboardingCompleted={dashData?.user.onboardingCompleted}
          />
          <PushNotificationPrompt />
          {loadingDash && !dashData ? (
            <DashboardHomeSkeleton />
          ) : children}
        </div>
      </main>

      <ReviewPrompt
        open={showReviewPrompt}
        onClose={() => setShowReviewPrompt(false)}
        defaultName={dashData?.user.name ?? ""}
        defaultPhone={dashData?.user.phone ?? ""}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </SubscriptionProvider>
    </LanguageProvider>
  );
}
