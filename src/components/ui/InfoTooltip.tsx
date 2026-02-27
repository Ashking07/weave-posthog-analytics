"use client";

import { useState, useRef, useEffect } from "react";

export function InfoTooltip({
  content,
  label = "More info",
}: {
  content: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const visible = open || hover;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | KeyboardEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      )
        return;
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setOpen(false);
    };
    document.addEventListener("click", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [open]);

  return (
    <span
      className="group relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-1 dark:hover:bg-zinc-600 dark:hover:text-zinc-300 dark:focus:ring-offset-zinc-900"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </button>
      <div
        ref={tooltipRef}
        role="tooltip"
        className={`absolute left-[calc(50%+1.75rem)] top-full z-50 mt-2 -translate-x-1/2 rounded-lg border-2 border-zinc-200/80 bg-white/85 px-3 py-2 text-[13px] leading-tight text-zinc-800 shadow-xl backdrop-blur-sm dark:border-zinc-600/80 dark:bg-zinc-800/85 dark:text-zinc-100 ${
          visible ? "visible opacity-100" : "invisible opacity-0"
        } transition-[opacity,visibility] duration-150`}
        style={{ width: "220px", maxWidth: "92vw" }}
      >
        {content}
      </div>
    </span>
  );
}
