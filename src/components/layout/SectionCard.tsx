"use client";

import { useDensity } from "./DashboardLayout";

export function SectionCard({
  title,
  subtitle,
  body,
  footer,
  className = "",
  id,
  icon,
}: {
  title: string;
  subtitle?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  id?: string;
  icon?: React.ReactNode;
}) {
  const { density } = useDensity();
  const isCompact = density === "compact";

  return (
    <div
      id={id}
      className={`overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 ${id ? "scroll-mt-20" : ""} ${className}`}
    >
      <div
        className={`border-b border-zinc-100 bg-zinc-50/50 px-3 dark:border-zinc-800 dark:bg-zinc-800/30 ${
          isCompact ? "py-1.5" : "py-2"
        }`}
      >
        <h3
          className={`flex items-center gap-1.5 font-medium uppercase tracking-wider text-zinc-500 ${
            isCompact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          {icon}
          {title}
        </h3>
        {subtitle && (
          <div
            className={`mt-0.5 text-zinc-400 ${isCompact ? "text-[10px]" : "text-[11px]"}`}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div className={isCompact ? "p-1.5" : "p-2"}>{body}</div>
      {footer && (
        <div
          className={`border-t border-zinc-100 px-3 py-1.5 dark:border-zinc-800 ${
            isCompact ? "text-[10px] text-zinc-500" : "text-[11px] text-zinc-500"
          }`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
