// src/components/dashboard/DashboardSkeletons.tsx
// Shared skeleton placeholders for dashboard loading states.
// Used instead of spinner circles — each skeleton mimics the shape
// of the content being loaded (no layout shift, calmer feel).

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Sk({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <Skeleton
      className={cn("bg-gray-200/70 dark:bg-gray-700/60", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

/** Title + subtitle + action buttons row */
export function PageHeaderSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <Sk className="h-7 w-52 rounded-xl" />
        <Sk className="h-4 w-72 max-w-full rounded-full" delay={60} />
      </div>
      {actions > 0 && (
        <div className="flex items-center gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Sk key={i} className="h-9 w-28 rounded-xl" delay={100 + i * 60} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Row of stat/KPI cards */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Sk className="h-4 w-20 rounded-full" delay={i * 60} />
            <Sk className="h-8 w-8 rounded-xl" delay={i * 60 + 30} />
          </div>
          <Sk className="h-7 w-16 rounded-lg" delay={i * 60 + 60} />
        </div>
      ))}
    </div>
  );
}

/** Table-like rows inside a card (set bare when the parent already provides the card) */
export function TableRowsSkeleton({
  rows = 5,
  cols = 3,
  bare = false,
}: {
  rows?: number;
  cols?: number;
  bare?: boolean;
}) {
  const body = (
    <div className="space-y-0 divide-y divide-gray-50 dark:divide-gray-700/40">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 px-4 py-3.5">
          <Sk className="h-9 w-9 rounded-full flex-shrink-0" delay={r * 70} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Sk
              className="h-3.5 rounded-full"
              delay={r * 70 + 30}
            />
            <Sk
              className="h-3 w-2/3 rounded-full"
              delay={r * 70 + 60}
            />
          </div>
          {Array.from({ length: Math.max(0, cols - 1) }).map((_, c) => (
            <Sk
              key={c}
              className="hidden sm:block h-6 w-20 rounded-full flex-shrink-0"
              delay={r * 70 + c * 40}
            />
          ))}
        </div>
      ))}
    </div>
  );
  if (bare) return body;
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 overflow-hidden">
      {body}
    </div>
  );
}

/** Grid of cards (campaigns, products, templates gallery...) */
export function CardsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Sk className="h-10 w-10 rounded-2xl" delay={i * 60} />
            <div className="flex-1 space-y-1.5">
              <Sk className="h-4 w-3/4 rounded-full" delay={i * 60 + 30} />
              <Sk className="h-3 w-1/2 rounded-full" delay={i * 60 + 60} />
            </div>
          </div>
          <Sk className="h-3 w-full rounded-full" delay={i * 60 + 90} />
          <Sk className="h-3 w-5/6 rounded-full" delay={i * 60 + 120} />
          <div className="flex gap-2 pt-1">
            <Sk className="h-8 flex-1 rounded-xl" delay={i * 60 + 150} />
            <Sk className="h-8 w-16 rounded-xl" delay={i * 60 + 180} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Wide chart / analytics block */
export function ChartBlockSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Sk className="h-5 w-40 rounded-lg" />
        <div className="flex gap-2">
          <Sk className="h-6 w-16 rounded-full" delay={60} />
          <Sk className="h-6 w-16 rounded-full" delay={120} />
        </div>
      </div>
      <div className="flex items-end gap-2 h-44 pt-2">
        {[38, 62, 45, 78, 55, 90, 68, 48, 74, 58, 84, 66].map((h, i) => (
          <Sk
            key={i}
            className="flex-1 rounded-t-lg"
            delay={i * 50}
          />
        ))}
      </div>
    </div>
  );
}

/** Label + input stacked rows (settings / forms) */
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 p-5 space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Sk className="h-4 w-28 rounded-full" delay={i * 70} />
          <Sk className="h-10 w-full rounded-xl" delay={i * 70 + 30} />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Sk className="h-9 w-28 rounded-xl" delay={rows * 70} />
        <Sk className="h-9 w-24 rounded-xl" delay={rows * 70 + 60} />
      </div>
    </div>
  );
}

/** Conversation list rows (chat sidebar / team conversations) */
export function ChatListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Sk className="h-11 w-11 rounded-full flex-shrink-0" delay={i * 70} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Sk className="h-3.5 w-24 rounded-full" delay={i * 70 + 30} />
              <Sk className="h-3 w-10 rounded-full" delay={i * 70 + 50} />
            </div>
            <Sk className="h-3 w-4/5 rounded-full" delay={i * 70 + 70} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Chat bubbles (message thread) */
export function ChatMessagesSkeleton() {
  const bubbles = [
    "self-start w-2/5",
    "self-end w-1/2",
    "self-start w-1/3",
    "self-end w-2/5",
    "self-start w-1/2",
  ];
  return (
    <div className="flex flex-col gap-3 p-4">
      {bubbles.map((pos, i) => (
        <div key={i} className={cn("flex flex-col gap-1.5", pos)}>
          <Sk className="h-12 w-full rounded-2xl" delay={i * 90} />
          <Sk className="h-3 w-16 rounded-full" delay={i * 90 + 40} />
        </div>
      ))}
    </div>
  );
}

/** Simple stacked list rows (invoices, logs, follow-ups...) */
export function ListRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 px-4 py-3"
        >
          <Sk className="h-9 w-9 rounded-xl flex-shrink-0" delay={i * 70} />
          <div className="flex-1 space-y-1.5">
            <Sk className="h-3.5 w-1/2 rounded-full" delay={i * 70 + 30} />
            <Sk className="h-3 w-1/3 rounded-full" delay={i * 70 + 60} />
          </div>
          <Sk className="h-7 w-20 rounded-full flex-shrink-0" delay={i * 70 + 90} />
        </div>
      ))}
    </div>
  );
}

/** Full dashboard home: header + stats + chart + table */
export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <ChartBlockSkeleton />
      <TableRowsSkeleton rows={5} cols={3} />
    </div>
  );
}

/** Reports overview: KPI grid + chart */
export function ReportsOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <StatCardsSkeleton count={8} />
      <ChartBlockSkeleton />
    </div>
  );
}

/** Automation page: tabs + rule cards */
export function AutomationPageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Sk key={i} className="h-9 w-28 rounded-xl" delay={i * 60} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Sk className="h-5 w-32 rounded-lg" delay={i * 60} />
              <Sk className="h-6 w-11 rounded-full" delay={i * 60 + 30} />
            </div>
            <Sk className="h-3 w-full rounded-full" delay={i * 60 + 60} />
            <Sk className="h-3 w-2/3 rounded-full" delay={i * 60 + 90} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** AI agent page: identity card + tabs + content */
export function AiAgentPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl border border-emerald-500/20 bg-white dark:bg-gray-800/60">
        <div className="flex items-center gap-3">
          <Sk className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Sk className="h-6 w-48 rounded-lg" delay={60} />
            <Sk className="h-4 w-72 max-w-full rounded-full" delay={120} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Sk className="h-11 w-28 rounded-2xl" delay={160} />
          <Sk className="h-11 w-32 rounded-2xl" delay={220} />
        </div>
      </div>
      <div className="flex gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 w-fit">
        {[0, 1, 2, 3, 4].map((i) => (
          <Sk key={i} className="h-8 w-24 rounded-xl" delay={i * 60} />
        ))}
      </div>
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 p-6 space-y-5">
        <Sk className="h-5 w-40 rounded-lg" />
        <Sk className="h-3 w-full rounded-full" delay={60} />
        <FormSkeleton rows={3} />
      </div>
    </div>
  );
}

/** Detail panel (protection claim audit, member detail...) */
export function DetailPanelSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Sk className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Sk className="h-5 w-1/3 rounded-lg" />
          <Sk className="h-3.5 w-1/4 rounded-full" delay={60} />
        </div>
        <Sk className="h-8 w-24 rounded-full" delay={120} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Sk key={i} className="h-16 rounded-xl" delay={i * 60} />
        ))}
      </div>
      <Sk className="h-32 w-full rounded-xl" delay={200} />
    </div>
  );
}
