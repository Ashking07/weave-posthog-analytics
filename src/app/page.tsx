"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types (mirror API response)
// ---------------------------------------------------------------------------

interface EngineerBreakdown {
  pr_points: number;
  review_points: number;
}

interface TopPR {
  title: string;
  url: string;
  mergedAt: string;
  additions: number;
  deletions: number;
}

interface QualitySignals {
  prs_with_tests: number;
  total_prs_with_merge_commit_found: number;
  test_touch_ratio: number | null;
}

interface Engineer {
  login: string;
  avatarUrl: string;
  total: number;
  breakdown: EngineerBreakdown;
  merged_prs: number;
  reviews_given: number;
  medianMergeDays: number;
  quality: QualitySignals | null;
  topPRs: TopPR[];
}

interface EngineerInsight {
  summary: string;
  prTypes: Record<string, number>;
}

interface ImpactResponse {
  generatedAt: string;
  windowDays: number;
  qualityWarning?: string;
  top: Engineer[];
  insights?: Record<string, EngineerInsight> | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLUE = "#3b82f6";
const EMERALD = "#10b981";
const BAR_COLORS = [BLUE, "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function pct(value: number, total: number): number {
  return total === 0 ? 0 : (value / total) * 100;
}

function formatMedianMerge(days: number): string {
  if (days < 1) {
    const hrs = Math.round(days * 24);
    return `${hrs}h`;
  }
  return `${days.toFixed(1)}d`;
}

type MixLabel = "Delivery-heavy" | "Review-heavy" | "Balanced";

interface MixInfo {
  mix: MixLabel;
  mixReason: string;
  prPct: number;
  revPct: number;
}

function getMix(breakdown: EngineerBreakdown): MixInfo {
  const total = breakdown.pr_points + breakdown.review_points;
  const prPct = Math.round(pct(breakdown.pr_points, total));
  const revPct = Math.round(pct(breakdown.review_points, total));

  if (prPct >= 70) {
    return { mix: "Delivery-heavy", mixReason: `${prPct}% of points from PRs`, prPct, revPct };
  }
  if (revPct >= 50) {
    return { mix: "Review-heavy", mixReason: `${revPct}% of points from reviews`, prPct, revPct };
  }
  return { mix: "Balanced", mixReason: `${prPct}% PRs / ${revPct}% reviews`, prPct, revPct };
}

const MIX_STYLES: Record<MixLabel, string> = {
  "Delivery-heavy":
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30",
  "Review-heavy":
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  Balanced:
    "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-300 dark:ring-zinc-500/30",
};

function MixBadge({ mix }: { mix: MixLabel }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-medium leading-4 ${MIX_STYLES[mix]}`}
    >
      {mix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared card wrapper
// ---------------------------------------------------------------------------

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function BreakdownBar({ breakdown }: { breakdown: EngineerBreakdown }) {
  const total = breakdown.pr_points + breakdown.review_points;
  if (total === 0)
    return (
      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
    );

  const prW = pct(breakdown.pr_points, total);
  const revW = pct(breakdown.review_points, total);

  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      title={`PR ${prW.toFixed(0)}% / Review ${revW.toFixed(0)}%`}
    >
      <div
        className="rounded-l-full bg-blue-500 transition-all"
        style={{ width: `${prW}%` }}
      />
      <div
        className="bg-emerald-500 transition-all"
        style={{ width: `${revW}%` }}
      />
    </div>
  );
}

function ScoreChart({
  engineers,
  selectedLogin,
  onSelect,
}: {
  engineers: Engineer[];
  selectedLogin: string | null;
  onSelect: (eng: Engineer) => void;
}) {
  const data = [...engineers].reverse().map((eng) => ({
    login: eng.login,
    total: eng.total,
    _eng: eng,
  }));

  return (
    <ResponsiveContainer width="100%" height={engineers.length * 36 + 12}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="login"
          width={86}
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: "1px solid #e4e4e7",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "6px 10px",
          }}
          formatter={(value: number | undefined) => [
            (value ?? 0).toFixed(1),
            "Score",
          ]}
        />
        <Bar
          dataKey="total"
          radius={[0, 5, 5, 0]}
          barSize={18}
          onClick={(entry) => {
            const d = entry as unknown as { _eng: Engineer };
            if (d._eng) onSelect(d._eng);
          }}
          className="cursor-pointer"
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.login}
              fill={BAR_COLORS[engineers.length - 1 - i] ?? BLUE}
              opacity={
                selectedLogin && selectedLogin !== entry.login ? 0.35 : 1
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StackedBreakdownChart({
  breakdown,
}: {
  breakdown: EngineerBreakdown;
}) {
  const data = [
    {
      name: "Breakdown",
      pr: breakdown.pr_points,
      review: breakdown.review_points,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={24}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip
          cursor={false}
          contentStyle={{
            fontSize: 11,
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            padding: "4px 8px",
          }}
          formatter={(value: number | undefined, name?: string) => [
            (value ?? 0).toFixed(1),
            name === "pr" ? "PR pts" : "Review pts",
          ]}
        />
        <Bar
          dataKey="pr"
          stackId="a"
          fill={BLUE}
          radius={[5, 0, 0, 5]}
          barSize={14}
        />
        <Bar
          dataKey="review"
          stackId="a"
          fill={EMERALD}
          radius={[0, 5, 5, 0]}
          barSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DetailPanel({
  engineer,
  onClose,
}: {
  engineer: Engineer;
  onClose: () => void;
}) {
  const info = getMix(engineer.breakdown);

  return (
    <Card className="px-3.5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {engineer.avatarUrl ? (
            <img
              src={engineer.avatarUrl}
              alt={engineer.login}
              className="h-7 w-7 rounded-full ring-1 ring-white dark:ring-zinc-800"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold dark:bg-zinc-700">
              {engineer.login[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {engineer.login}
          </span>
          <MixBadge mix={info.mix} />
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-md bg-blue-50/80 px-2 py-1.5 dark:bg-blue-500/10">
          <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
            {engineer.breakdown.pr_points.toFixed(1)}
          </span>
          <span className="ml-1 text-blue-600/60 dark:text-blue-400/60">PR</span>
        </div>
        <div className="rounded-md bg-emerald-50/80 px-2 py-1.5 dark:bg-emerald-500/10">
          <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {engineer.breakdown.review_points.toFixed(1)}
          </span>
          <span className="ml-1 text-emerald-600/60 dark:text-emerald-400/60">Rev</span>
        </div>
      </div>

      <div className="mt-2.5">
        <StackedBreakdownChart breakdown={engineer.breakdown} />
      </div>

      <div className="mt-2.5">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Median time to merge: {formatMedianMerge(engineer.medianMergeDays)}
        </p>
      </div>

      {engineer.quality && (
        <div className="mt-2.5">
          <h4 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Quality signal
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Tests touched: {engineer.quality.prs_with_tests}/{engineer.quality.total_prs_with_merge_commit_found}
            {engineer.quality.test_touch_ratio != null && (
              <> ({Math.round(engineer.quality.test_touch_ratio * 100)}%)</>
            )}
          </p>
          <p className="mt-1 text-[10px] italic text-zinc-400 dark:text-zinc-500">
            Test-touch is a heuristic quality signal (context-only).
          </p>
        </div>
      )}

      <div className="mt-2.5">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Recent PRs
        </h4>
        {engineer.topPRs.length === 0 ? (
          <p className="text-xs text-zinc-400">No PRs</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {engineer.topPRs.slice(0, 3).map((pr) => (
              <li key={pr.url} className="truncate text-xs leading-normal">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  title={pr.title}
                >
                  {pr.title.length > 48
                    ? pr.title.slice(0, 48) + "\u2026"
                    : pr.title}
                </a>
                <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                  +{pr.additions} &minus;{pr.deletions} &middot; {relativeTime(pr.mergedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [data, setData] = useState<ImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Engineer | null>(null);

  useEffect(() => {
    fetch("/api/impact")
      .then(async (res) => {
        const json = (await res.json()) as ImpactResponse;
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        return json;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
          <p className="text-sm font-medium text-zinc-500">Loading analytics&hellip;</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Card className="max-w-sm p-6 text-center">
          <p className="mb-1 text-sm font-semibold text-red-600 dark:text-red-400">
            Failed to load data
          </p>
          <p className="text-xs text-red-500/80">{error ?? "Unknown error"}</p>
        </Card>
      </div>
    );
  }

  const top5 = data.top.slice(0, 5);

  // KPI aggregates
  const totalPr = top5.reduce((s, e) => s + e.breakdown.pr_points, 0);
  const totalRev = top5.reduce((s, e) => s + e.breakdown.review_points, 0);
  const totalAll = totalPr + totalRev;
  const summaryPrPct =
    totalAll > 0 ? Math.round((totalPr / totalAll) * 100) : 0;
  const summaryRevPct = totalAll > 0 ? 100 - summaryPrPct : 0;

  const totalMergedPrs = top5.reduce((s, e) => s + e.merged_prs, 0);
  const totalReviews = top5.reduce((s, e) => s + e.reviews_given, 0);

  const mixCounts = top5.reduce(
    (acc, e) => {
      const m = getMix(e.breakdown).mix;
      if (m === "Delivery-heavy") acc.delivery++;
      else if (m === "Review-heavy") acc.review++;
      else acc.balanced++;
      return acc;
    },
    { delivery: 0, review: 0, balanced: 0 },
  );
  const mixParts: string[] = [];
  if (mixCounts.delivery)
    mixParts.push(`${mixCounts.delivery} delivery-heavy`);
  if (mixCounts.review) mixParts.push(`${mixCounts.review} review-heavy`);
  if (mixCounts.balanced) mixParts.push(`${mixCounts.balanced} balanced`);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 font-[family-name:var(--font-geist-sans)] dark:bg-zinc-950">
      {/* ── Top bar ────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-zinc-200/80 bg-white px-6 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-baseline justify-between gap-4">
          <h1 className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            PostHog Analytics
          </h1>
          <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
            Engineering impact &middot; Last {data.windowDays} days &middot; Generated {relativeTime(data.generatedAt)}
          </p>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-3 px-6 py-3.5">
          {/* Inline stats + summary */}
          <div className="flex flex-shrink-0 items-center gap-4 text-xs">
            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
              <span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{totalMergedPrs}</span> merged PRs
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
              <span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{totalReviews}</span> reviews
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
              <span>
                <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">{summaryPrPct}%</span> PR share
              </span>
            </div>
            <span className="truncate text-zinc-400 dark:text-zinc-500">
              Impact driven by PR work ({summaryPrPct}%), reviews {summaryRevPct}%.
              {mixParts.length > 0 && ` Mix: ${mixParts.join(", ")}.`}
            </span>
            <span className="ml-auto flex-shrink-0 text-[10px] italic text-zinc-300 dark:text-zinc-600">
              Med merge = context only
              {data.qualityWarning && (
                <span className="ml-2" title={data.qualityWarning}>
                  (quality: unavailable)
                </span>
              )}
            </span>
          </div>

          {/* Legend */}
          <div className="flex flex-shrink-0 items-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              PRs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Reviews
            </span>
          </div>

          {/* ── Grid: table left · chart right ─────────────────────── */}
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_310px] gap-4">
            {/* Left column */}
            <div className="flex flex-col gap-3">
              {/* Table card */}
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500">
                      <th className="w-9 py-2 pl-4 pr-1">#</th>
                      <th className="py-2 pr-3">Engineer</th>
                      <th className="w-16 py-2 pr-3 text-right">Score</th>
                      <th className="w-12 py-2 pr-3 text-right">PRs</th>
                      <th className="w-14 py-2 pr-3 text-right">Reviews</th>
                      <th className="w-18 py-2 pr-3 text-right" title="Median time-to-merge (context only, not part of score)">
                        Med merge
                      </th>
                      <th className="w-24 py-2 pr-3">Mix</th>
                      <th className="w-28 py-2 pr-4">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5.map((eng, i) => {
                      const isSelected = selected?.login === eng.login;
                      return (
                        <tr
                          key={eng.login}
                          onClick={() =>
                            setSelected(isSelected ? null : eng)
                          }
                          className={`cursor-pointer border-b border-zinc-100 transition-colors last:border-0 dark:border-zinc-800/60 ${
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-500/[.06]"
                              : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                          }`}
                        >
                          <td className="py-2.5 pl-4 pr-1 text-xs tabular-nums text-zinc-400">
                            {i + 1}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2.5">
                              {eng.avatarUrl ? (
                                <img
                                  src={eng.avatarUrl}
                                  alt={eng.login}
                                  className="h-7 w-7 rounded-full ring-1 ring-white dark:ring-zinc-900"
                                />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  {eng.login[0]?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                {eng.login}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {eng.total.toFixed(1)}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                            {eng.merged_prs}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                            {eng.reviews_given}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                            {formatMedianMerge(eng.medianMergeDays)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <MixBadge
                              mix={getMix(eng.breakdown).mix}
                            />
                          </td>
                          <td className="py-2.5 pr-4">
                            <BreakdownBar breakdown={eng.breakdown} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              {/* How the Top 5 contribute */}
              <Card className="px-4 py-2.5">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  How the Top 5 contribute
                </h3>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {top5.map((eng) => {
                    const info = getMix(eng.breakdown);
                    return (
                      <div
                        key={eng.login}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-24 truncate font-medium text-zinc-700 dark:text-zinc-300"
                          title={eng.login}
                        >
                          {eng.login}
                        </span>
                        <MixBadge mix={info.mix} />
                        <span className="flex items-center gap-1 text-[11px]">
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {info.prPct}%
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-700">
                            /
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {info.revPct}%
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* LLM Insight – shown when an engineer is selected */}
              {selected && data?.insights && (() => {
                const insight = data.insights[selected.login] ?? data.insights[selected.login.toLowerCase()];
                return insight ? (
                  <Card className="border-l-4 border-l-zinc-300 bg-zinc-50/80 px-4 py-2.5 dark:border-l-zinc-600 dark:bg-zinc-800/40">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      LLM Insight · {selected.login}
                    </p>
                    <blockquote className="mt-1 border-0 pl-0 text-sm italic leading-snug text-zinc-600 dark:text-zinc-400">
                      &ldquo;{insight.summary}&rdquo;
                    </blockquote>
                  </Card>
                ) : null;
              })()}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-3">
              {/* Score chart */}
              <Card className="px-3 py-2.5">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Total Scores
                </h3>
                <ScoreChart
                  engineers={top5}
                  selectedLogin={selected?.login ?? null}
                  onSelect={(eng) =>
                    setSelected(
                      selected?.login === eng.login ? null : eng,
                    )
                  }
                />
              </Card>

              {/* Detail panel */}
              {selected && (
                <DetailPanel
                  engineer={selected}
                  onClose={() => setSelected(null)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
