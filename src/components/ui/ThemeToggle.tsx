"use client";

import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="group relative flex h-9 w-16 shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-100 p-1 shadow-inner transition-all duration-300 hover:border-amber-300/60 hover:shadow-md dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-violet-400/50"
    >
      {/* Sliding pill indicator */}
      <span
        className={`absolute top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-zinc-200/80 transition-all duration-300 ease-out dark:ring-zinc-500/30 ${
          isDark ? "left-1 translate-x-7" : "left-1 translate-x-0"
        }`}
        aria-hidden
      />

      {/* Icons - positioned in grid */}
      <span className="relative z-10 flex w-full items-center justify-between px-1.5">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300 ${
            isDark ? "text-zinc-500" : "text-amber-500"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300 ${
            isDark ? "text-violet-400" : "text-zinc-400"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
