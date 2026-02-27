"use client";

import { useState } from "react";
import type { TopItem } from "@/types";
import { relativeTime } from "@/utils/format";

export type { TopItem } from "@/types";

export function TopItemsList({
  items,
  maxItems = 3,
  titleTruncate = 48,
  onAuthorClick,
}: {
  items: TopItem[];
  maxItems?: number;
  titleTruncate?: number;
  onAuthorClick?: (author: string) => void;
}) {
  const displayItems = items.slice(0, maxItems);

  return (
    <ul className="space-y-0.5">
      {displayItems.map((item) => (
        <TopItemRow
          key={item.id}
          item={item}
          titleTruncate={titleTruncate}
          onAuthorClick={onAuthorClick}
        />
      ))}
    </ul>
  );
}

function TopItemRow({
  item,
  titleTruncate,
  onAuthorClick,
}: {
  item: TopItem;
  titleTruncate: number;
  onAuthorClick?: (author: string) => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const truncatedTitle =
    item.title.length > titleTruncate
      ? item.title.slice(0, titleTruncate) + "\u2026"
      : item.title;

  return (
    <li className="group relative flex items-start gap-2 rounded px-1.5 py-1 transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            title={item.title}
          >
            {truncatedTitle}
          </a>
          {item.badge}
        </div>
        <div className="flex items-center gap-x-2 text-[11px] text-zinc-500">
          {onAuthorClick ? (
            <button
              type="button"
              onClick={() => onAuthorClick(item.author)}
              className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              {item.author}
            </button>
          ) : (
            <span>{item.author}</span>
          )}
          <span>{relativeTime(item.mergedAt)}</span>
        </div>
      </div>
      {item.evidenceContent && (
        <>
          <button
            type="button"
            onClick={() => setShowEvidence((v) => !v)}
            className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            title="Evidence"
          >
            {showEvidence ? "Hide" : "…"}
          </button>
          {showEvidence && (
            <div className="absolute left-full top-0 z-50 ml-2 max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
              {item.evidenceContent}
            </div>
          )}
        </>
      )}
    </li>
  );
}
