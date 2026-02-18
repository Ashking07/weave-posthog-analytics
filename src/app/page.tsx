"use client";

import { useEffect, useState } from "react";
import { Avatar, Card } from "@/components/ui";
import {
  BreakdownBar,
  DetailPanel,
  MixBadge,
  RepoSearchBar,
  ScoreChart,
} from "@/components/dashboard";
import { useGitHubToken } from "@/hooks/useGitHubToken";
import { useImpactData } from "@/hooks/useImpactData";
import type { Engineer, RepoSearchResult } from "@/types";
import { getMix, relativeTime, formatMedianMerge } from "@/utils/format";

const DEFAULT_REPO = "PostHog/posthog";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [topLimit, setTopLimit] = useState<5 | 10>(5);
  const [userToken, setUserToken] = useGitHubToken();
  const [showTokenInput, setShowTokenInput] = useState(false);

  const { data, error, loading } = useImpactData({
    repo,
    top: topLimit,
    token: userToken || undefined,
  });

  const [selected, setSelected] = useState<Engineer | null>(null);

  // Auto-show token input when API fails due to missing token
  useEffect(() => {
    if (error && /token|GITHUB|401|403/i.test(error)) setShowTokenInput(true);
  }, [error]);

  const handleRepoSelect = (r: RepoSearchResult) => {
    setRepo(r.full_name);
    setSelected(null);
  };

  if (!repo) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 font-[family-name:var(--font-geist-sans)]">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
          <h1 className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            OSS Engineering Impact
          </h1>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Search for any open source repo to analyze top contributor impact
          </p>
          <div className="w-full">
            <RepoSearchBar
              value=""
              onSelect={handleRepoSelect}
              placeholder="e.g. PostHog/posthog, facebook/react..."
              token={userToken}
            />
          </div>
          <AdvancedSection
            showTokenInput={showTokenInput}
            setShowTokenInput={setShowTokenInput}
            userToken={userToken}
            setUserToken={setUserToken}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 font-[family-name:var(--font-geist-sans)]">
        <Header
          repo={repo}
          onRepoSelect={handleRepoSelect}
          userToken={userToken}
          showTokenInput={showTokenInput}
          setShowTokenInput={setShowTokenInput}
          setUserToken={setUserToken}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
            <p className="text-sm text-zinc-400">Loading {repo} analytics…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <Header
          repo={repo}
          onRepoSelect={handleRepoSelect}
          userToken={userToken}
          showTokenInput={showTokenInput}
          setShowTokenInput={setShowTokenInput}
          setUserToken={setUserToken}
        />
        <div className="flex flex-1 items-center justify-center">
          <Card className="max-w-md border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="mb-1 text-sm font-semibold text-red-400">Failed to load</p>
            <p className="text-xs text-red-400/80">
              {/401|Bad credentials/i.test(error ?? "")
                ? "GitHub token is invalid or expired. Clear it and enter a new token."
                : error ?? "Unknown error"}
            </p>
            {/401|Bad credentials/i.test(error ?? "") && userToken && (
              <button
                type="button"
                onClick={() => setUserToken(null)}
                className="mt-3 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                Clear token & enter new one
              </button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const top = data.top;
  const totalPr = top.reduce((s, e) => s + e.breakdown.pr_points, 0);
  const totalRev = top.reduce((s, e) => s + e.breakdown.review_points, 0);
  const totalAll = totalPr + totalRev;
  const summaryPrPct = totalAll > 0 ? Math.round((totalPr / totalAll) * 100) : 0;
  const summaryRevPct = totalAll > 0 ? 100 - summaryPrPct : 0;
  const totalMergedPrs = top.reduce((s, e) => s + e.merged_prs, 0);
  const totalReviews = top.reduce((s, e) => s + e.reviews_given, 0);

  const mixCounts = top.reduce(
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
  if (mixCounts.delivery) mixParts.push(`${mixCounts.delivery} delivery-heavy`);
  if (mixCounts.review) mixParts.push(`${mixCounts.review} review-heavy`);
  if (mixCounts.balanced) mixParts.push(`${mixCounts.balanced} balanced`);

  const insight =
    selected && data.insights
      ? data.insights[selected.login] ?? data.insights[selected.login.toLowerCase()]
      : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 font-[family-name:var(--font-geist-sans)] dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Header
        repo={repo}
        onRepoSelect={handleRepoSelect}
        userToken={userToken}
        showTokenInput={showTokenInput}
        setShowTokenInput={setShowTokenInput}
        setUserToken={setUserToken}
      />

      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-zinc-800/60 px-6 py-2">
        <div className="flex items-center gap-4">
          <TopToggle value={topLimit} onChange={setTopLimit} />
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span>
              <span className="font-mono font-semibold text-violet-400">{totalMergedPrs}</span>{" "}
              PRs
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span>
              <span className="font-mono font-semibold text-emerald-400">{totalReviews}</span>{" "}
              reviews
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span>
              <span className="font-mono font-semibold text-cyan-400">{summaryPrPct}%</span> PR share
            </span>
          </div>
        </div>
        <span className="truncate text-xs text-zinc-500">
          {data.windowDays}d · {relativeTime(data.generatedAt)}
          {data.qualityWarning && (
            <span className="ml-2" title={data.qualityWarning}>
              (quality: unavailable)
            </span>
          )}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-3 px-6 py-3.5">
          <p className="flex-shrink-0 text-xs text-zinc-600 dark:text-zinc-500">
            Impact: {summaryPrPct}% PRs, {summaryRevPct}% reviews.
            {mixParts.length > 0 && ` Mix: ${mixParts.join(", ")}.`}
          </p>

          <div className="grid min-h-0 flex-1 grid-cols-[1fr_310px] gap-4">
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              <Card className="flex h-[280px] flex-col overflow-hidden border-zinc-800/80 bg-zinc-900/50 dark:border-zinc-700/50">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
                      <tr className="border-b border-zinc-800/80 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-700/60">
                      <th className="w-9 py-2 pl-4 pr-1">#</th>
                      <th className="py-2 pr-3">Engineer</th>
                      <th className="w-16 py-2 pr-3 text-right">Score</th>
                      <th className="w-12 py-2 pr-3 text-right">PRs</th>
                      <th className="w-14 py-2 pr-3 text-right">Reviews</th>
                      <th className="w-18 py-2 pr-3 text-right" title="Median time-to-merge">
                        Med merge
                      </th>
                      <th className="w-24 py-2 pr-3">Mix</th>
                      <th className="w-28 py-2 pr-4">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((eng, i) => {
                      const isSelected = selected?.login === eng.login;
                      return (
                        <tr
                          key={eng.login}
                          onClick={() => setSelected(isSelected ? null : eng)}
                          className={`cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800/40 dark:hover:bg-zinc-800/30 ${
                            isSelected ? "bg-violet-50 dark:bg-violet-500/10" : ""
                          }`}
                        >
                          <td className="py-2.5 pl-4 pr-1 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                            {i + 1}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2.5">
                              {eng.avatarUrl ? (
                                <Avatar src={eng.avatarUrl} alt={eng.login} size={28} />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                                  {eng.login[0]?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                {eng.login}
                              </span>
                              <a
                                href={`https://github.com/${eng.login}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-200"
                                aria-label={`View ${eng.login} on GitHub`}
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                              </a>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {eng.total.toFixed(1)}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums text-zinc-500">
                            {eng.merged_prs}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums text-zinc-500">
                            {eng.reviews_given}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs tabular-nums text-zinc-500">
                            {formatMedianMerge(eng.medianMergeDays)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <MixBadge mix={getMix(eng.breakdown).mix} />
                          </td>
                          <td className="py-2.5 pr-4">
                            <BreakdownBar breakdown={eng.breakdown} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </Card>

              <Card className="border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  How the Top {topLimit} contribute
                </h3>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {top.map((eng) => {
                    const info = getMix(eng.breakdown);
                    return (
                      <div key={eng.login} className="flex items-center gap-2 text-xs">
                        <span className="w-24 truncate font-medium text-zinc-300" title={eng.login}>
                          {eng.login}
                        </span>
                        <MixBadge mix={info.mix} />
                        <span className="flex items-center gap-1 text-[11px]">
                          <span className="font-mono text-violet-400">{info.prPct}%</span>
                          <span className="text-zinc-400 dark:text-zinc-600">/</span>
                          <span className="font-mono text-emerald-400">{info.revPct}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {insight && selected && (
                <Card className="border-l-4 border-l-violet-500/50 border-zinc-800/80 bg-zinc-800/30 px-4 py-2.5 dark:border-zinc-700/50">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    LLM Insight · {selected.login}
                  </p>
                  <blockquote className="mt-1 border-0 pl-0 text-sm italic leading-snug text-zinc-600 dark:text-zinc-300">
                    &ldquo;{insight.summary}&rdquo;
                  </blockquote>
                </Card>
              )}
            </div>

            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              {selected && (
                <DetailPanel
                  engineer={selected}
                  insight={
                    data.insights
                      ? data.insights[selected.login] ?? data.insights[selected.login.toLowerCase()]
                      : null
                  }
                  onClose={() => setSelected(null)}
                />
              )}
              <Card className="flex shrink-0 flex-col overflow-hidden border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5 dark:border-zinc-700/50">
                <h3 className="mb-2 shrink-0 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Total Scores
                </h3>
                <div className="h-[200px] min-h-0 overflow-y-auto">
                  <ScoreChart
                    engineers={top}
                    selectedLogin={selected?.login ?? null}
                    onSelect={(eng) =>
                      setSelected(selected?.login === eng.login ? null : eng)
                    }
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({
  repo,
  onRepoSelect,
  userToken,
  showTokenInput,
  setShowTokenInput,
  setUserToken,
}: {
  repo: string;
  onRepoSelect: (r: RepoSearchResult) => void;
  userToken: string | null;
  showTokenInput: boolean;
  setShowTokenInput: (v: boolean) => void;
  setUserToken: (v: string | null) => void;
}) {
  return (
    <header className="relative z-20 flex-shrink-0 border-b border-zinc-200 bg-white px-6 py-3 backdrop-blur-sm transition-colors duration-200 dark:border-zinc-800/60 dark:bg-zinc-900/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h1 className="shrink-0 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            OSS Impact
          </h1>
          <div className="min-w-0 flex-1">
            <RepoSearchBar
              value={repo}
              onSelect={onRepoSelect}
              placeholder="Search repo..."
              token={userToken}
            />
          </div>
        </div>
        <AdvancedSection
          showTokenInput={showTokenInput}
          setShowTokenInput={setShowTokenInput}
          userToken={userToken}
          setUserToken={setUserToken}
        />
      </div>
    </header>
  );
}

function AdvancedSection({
  showTokenInput,
  setShowTokenInput,
  userToken,
  setUserToken,
}: {
  showTokenInput: boolean;
  setShowTokenInput: (v: boolean) => void;
  userToken: string | null;
  setUserToken: (v: string | null) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setShowTokenInput(!showTokenInput)}
        className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20 hover:text-violet-200"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        {showTokenInput ? "Hide token" : "GitHub token"}
      </button>
      {showTokenInput && (
        <input
          type="password"
          placeholder="ghp_... (persisted in browser)"
          value={userToken ?? ""}
          onChange={(e) => setUserToken(e.target.value.trim() || null)}
          className="max-w-48 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          autoComplete="off"
        />
      )}
    </div>
  );
}

function TopToggle({ value, onChange }: { value: 5 | 10; onChange: (v: 5 | 10) => void }) {
  return (
    <div className="flex rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-0.5">
      {([5, 10] as const).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === n
              ? "bg-violet-500/20 text-violet-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Top {n}
        </button>
      ))}
    </div>
  );
}
