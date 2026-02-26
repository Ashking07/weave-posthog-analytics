"use client";

import { useState } from "react";
import type { Engineer } from "@/types";
import { Avatar } from "@/components/ui";
import { MixBadge } from "./MixBadge";
import { formatPrSize, formatPrSizeCompact, getMix } from "@/utils/format";

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function TopEngineersTable({
  engineers,
  selected,
  onSelect,
  prsCount,
}: {
  engineers: Engineer[];
  selected: Engineer | null;
  onSelect: (eng: Engineer | null) => void;
  prsCount?: number;
}) {
  const medianPrs = median(engineers.map((e) => e.merged_prs));
  const medianReviews = median(engineers.map((e) => e.reviews_given));

  const topShipper = engineers.reduce((a, b) =>
    a.breakdown.pr_points >= b.breakdown.pr_points ? a : b,
  );
  const topUnblocker = engineers.reduce((a, b) =>
    a.breakdown.review_points >= b.breakdown.review_points ? a : b,
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[2rem_1fr_4rem_5rem_6rem_2.5rem] items-center gap-2 px-1 pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        <span>#</span>
        <span>Engineer</span>
        <span className="text-right">Total</span>
        <span className="text-right">Shipped</span>
        <span className="text-right">Unblocked</span>
        <span />
      </div>
      <div className="space-y-2">
        {engineers.map((eng, i) => (
          <TopEngineerRow
            key={eng.login}
            rank={i + 1}
            engineer={eng}
            isSelected={selected?.login === eng.login}
            onSelect={() => onSelect(selected?.login === eng.login ? null : eng)}
            prsCount={prsCount}
            medianPrs={medianPrs}
            medianReviews={medianReviews}
            isTopShipper={eng.login === topShipper.login}
            isTopUnblocker={eng.login === topUnblocker.login}
          />
        ))}
      </div>
    </div>
  );
}

function TopEngineerRow({
  rank,
  engineer,
  isSelected,
  onSelect,
  prsCount,
  medianPrs,
  medianReviews,
  isTopShipper,
  isTopUnblocker,
}: {
  rank: number;
  engineer: Engineer;
  isSelected: boolean;
  onSelect: () => void;
  prsCount?: number;
  medianPrs: number;
  medianReviews: number;
  isTopShipper: boolean;
  isTopUnblocker: boolean;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const info = getMix(engineer.breakdown);

  const prPct = prsCount && prsCount > 0 ? (engineer.merged_prs / prsCount) * 100 : null;
  const prTimesMedian = medianPrs > 0 ? engineer.merged_prs / medianPrs : null;
  const revTimesMedian = medianReviews > 0 ? engineer.reviews_given / medianReviews : null;

  return (
    <div className="space-y-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`grid cursor-pointer grid-cols-[2rem_1fr_4rem_5rem_6rem_2.5rem] items-center gap-2 rounded-lg px-3 py-2.5 transition-all duration-150 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 ${
          isSelected
            ? "bg-violet-500/10 ring-1 ring-violet-500/30 dark:bg-violet-500/15 dark:ring-violet-500/40"
            : "bg-zinc-50/60 dark:bg-zinc-800/30"
        }`}
      >
        <span className="text-xs tabular-nums text-zinc-400">{rank}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {engineer.avatarUrl ? (
            <Avatar src={engineer.avatarUrl} alt={engineer.login} size={28} />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-500 dark:bg-zinc-700">
              {engineer.login[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{engineer.login}</span>
            <MixBadge mix={info.mix} />
            {isTopShipper && (
              <span
                className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30"
                title="Highest shipped (PR) score"
              >
                Top shipper
              </span>
            )}
            {isTopUnblocker && (
              <span
                className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                title="Highest unblocked (review) score"
              >
                Top unblocker
              </span>
            )}
            {engineer.medianPrSize > 0 && (
              <span
                className="text-[10px] text-zinc-500 dark:text-zinc-400"
                title={`Median PR size: ${formatPrSize(engineer.medianPrSize)}`}
              >
                {formatPrSizeCompact(engineer.medianPrSize)}
              </span>
            )}
          </div>
        </div>
        <span className="text-right font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {engineer.total.toFixed(1)}
        </span>
        <div className="flex flex-col items-end">
          <span className="font-mono text-xs tabular-nums text-violet-600 dark:text-violet-400">
            {engineer.breakdown.pr_points.toFixed(1)}
          </span>
          {(prPct != null || prTimesMedian != null) && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500">
              {prPct != null && `${prPct.toFixed(1)}%`}
              {prPct != null && prTimesMedian != null && " · "}
              {prTimesMedian != null && `${prTimesMedian.toFixed(1)}×`}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
            {engineer.breakdown.review_points.toFixed(1)}
          </span>
          {revTimesMedian != null && revTimesMedian > 0 && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-500">
              {revTimesMedian.toFixed(1)}×
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowWhy((v) => !v);
          }}
          className="rounded-md px-2 py-1 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          Why
        </button>
      </div>
      {showWhy && (
        <div className="rounded-lg bg-zinc-50/80 px-3 py-2 dark:bg-zinc-900/50">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {engineer.topPRs.slice(0, 3).map((pr) => (
              <a
                key={pr.url}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                title={pr.title}
                onClick={(e) => e.stopPropagation()}
              >
                {pr.title.length > 40 ? pr.title.slice(0, 40) + "…" : pr.title}
              </a>
            ))}
            {engineer.topPRs.length === 0 && (
              <span className="text-zinc-400">No PRs</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
