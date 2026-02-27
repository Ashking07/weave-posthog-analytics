"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { TopItem } from "@/types";
import { relativeTime } from "@/utils/format";

const MAX_DRAWER_ITEMS = 50;

export function SectionListDrawer({
  open,
  onClose,
  title,
  items,
  onAuthorClick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: TopItem[];
  onAuthorClick?: (author: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setExpandedId(null);
      const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handler);
        document.body.style.overflow = "";
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const displayItems = items.slice(0, MAX_DRAWER_ITEMS);
  const hasMore = items.length > MAX_DRAWER_ITEMS;

  const content = (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 id="drawer-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {displayItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-0.5 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div className="flex items-start gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    title={item.title}
                  >
                    {item.title}
                  </a>
                  {item.badge}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                  <span>
                    {onAuthorClick ? (
                      <button
                        type="button"
                        onClick={() => onAuthorClick(item.author)}
                        className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        {item.author}
                      </button>
                    ) : (
                      item.author
                    )}
                    {" · "}
                    {relativeTime(item.mergedAt)}
                  </span>
                  {item.evidenceContent && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                    >
                      {expandedId === item.id ? "Hide" : "Evidence"}
                    </button>
                  )}
                </div>
                {item.evidenceContent && expandedId === item.id && (
                  <div className="mt-1.5 rounded bg-zinc-100 p-2 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {item.evidenceContent}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {hasMore && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Showing top {MAX_DRAWER_ITEMS} of {items.length}
            </p>
          )}
        </div>
      </aside>
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
}
