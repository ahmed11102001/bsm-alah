"use client";

// ─── PageHeader — عنوان موحد لكل صفحات الداشبورد ──────────────────────────
// الشكل: [أيقونة] عنوان بخط مميز (Changa) + جملة وصفية تحته + actions يمين.
// الاستخدام:
//   <PageHeader
//     icon={<Home className="w-5 h-5 text-primary" />}
//     iconClassName="bg-primary/10"
//     title="الرئيسية"
//     subtitle="نظرة عامة على أداء حسابك"
//     actions={<Button>...</Button>}
//   />

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** الأيقونة (مرسومة بلونها الخاص) — تُعرض داخل بلاطة موحدة */
  icon?: ReactNode;
  /** خلفية البلاطة — الافتراضي primary/10. مرر gradient مخصص لكل صفحة */
  iconClassName?: string;
  /** العنوان — بخط Changa المميز */
  title: ReactNode;
  /** الجملة الوصفية تحت العنوان */
  subtitle?: ReactNode;
  /** أزرار/عناصر يمين الهيدر */
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  icon,
  iconClassName,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm",
              iconClassName ?? "bg-primary/10 dark:bg-primary/15"
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-xl sm:text-2xl text-foreground leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
