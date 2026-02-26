"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import {
  DetailPanel,
  ExecutiveSummary,
  LLMInsightsSection,
  Methodology,
  RepoSearchBar,
  ScoreChart,
  TopEngineersTable,
} from "@/components/dashboard";
import { useGitHubToken } from "@/hooks/useGitHubToken";
import { useImpactData, GITHUB_PAT_URL } from "@/hooks/useImpactData";
import type { Engineer, RepoSearchResult } from "@/types";
import { relativeTime } from "@/utils/format";

const DEFAULT_REPO = "facebook/react";

export default function Home() {
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [topLimit, setTopLimit] = useState<5 | 10>(5);
  const [userToken, setUserToken] = useGitHubToken();
  const [showTokenInput, setShowTokenInput] = useState(false);

  const { data, error, loading, loadingProgress, retry } = useImpactData({
    repo,
    top: topLimit,
    token: userToken || undefined,
  });

  const [selected, setSelected] = useState<Engineer | null>(null);

  useEffect(() => {
    if (error && /token|GITHUB|401|403|rate/i.test(error)) setShowTokenInput(true);
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

  if (loading && !data) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 font-[family-name:var(--font-geist-sans)]">
        <Header
          repo={repo}
          onRepoSelect={handleRepoSelect}
          userToken={userToken}
          showTokenInput={showTokenInput}
          setShowTokenInput={setShowTokenInput}
          setUserToken={setUserToken}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-2">
          <div className="flex flex-shrink-0 items-center gap-3">
            <TopToggle value={topLimit} onChange={setTopLimit} loading />
            <p className="text-xs text-zinc-500">Fetching data for {repo}…</p>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              {[
                { id: "fetch_prs", label: "Fetching merged PRs…" },
                { id: "metrics", label: "Computing metrics…" },
                { id: "insights", label: "AI insights (optional)…" },
              ].map((step) => {
                const done = loadingProgress.completedSteps.includes(step.id);
                const current = loadingProgress.currentStep?.id === step.id;
                return (
                  <div key={step.id} className="flex items-center gap-3 text-sm text-zinc-500">
                    {done ? (
                      <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : current ? (
                      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-400 border-t-violet-500" />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-400" aria-hidden />
                    )}
                    <span className={current ? "text-violet-600 dark:text-violet-400" : ""}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
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
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-md border-red-500/20 bg-red-500/5 p-5 text-center">
            <p className="mb-1 text-sm font-semibold text-red-400">Failed to load</p>
            <p className="text-xs text-red-400/90">{error}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={retry}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                Retry
              </button>
              {(/401|Bad credentials|rate limit|token/i.test(error) || !userToken) && (
                <a
                  href={GITHUB_PAT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
                >
                  Create GitHub token
                </a>
              )}
              {/401|Bad credentials/i.test(error) && userToken && (
                <button
                  type="button"
                  onClick={() => setUserToken(null)}
                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Clear token
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const top = data!.top;
  const prsCount = data!.prsCount;
  const reviewsCount = data!.reviewsCount;

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

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-2">
        <ExecutiveSummary
          engineers={top}
          prsCount={prsCount}
          reviewsCount={reviewsCount}
          windowDays={data!.windowDays}
        />
        <div className="flex flex-shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TopToggle value={topLimit} onChange={setTopLimit} loading={loading} />
            <p className="text-xs text-zinc-500">
              {prsCount != null && reviewsCount != null ? (
                <>
                  Analyzed <strong className="font-mono text-zinc-700 dark:text-zinc-300">{prsCount}</strong> merged PRs and{" "}
                  <strong className="font-mono text-zinc-700 dark:text-zinc-300">{reviewsCount}</strong> reviews
                </>
              ) : (
                "Top contributors"
              )}{" "}
              (last {data!.windowDays} days). Bots and review-only excluded.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Methodology />
            <span className="text-[11px] text-zinc-500">{relativeTime(data!.generatedAt)}</span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px] gap-3">
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <Card className="flex shrink-0 flex-col overflow-hidden border-zinc-200 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <div className="max-h-[280px] min-h-0 overflow-y-auto p-2">
                <TopEngineersTable
                  engineers={top}
                  selected={selected}
                  onSelect={setSelected}
                  prsCount={prsCount ?? undefined}
                />
              </div>
            </Card>
            <LLMInsightsSection selected={selected} insights={data!.insights} />
            {loading && data && (
              <p className="text-[11px] text-zinc-500">Updating AI insights…</p>
            )}
          </div>

          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            {selected && (
              <DetailPanel engineer={selected} onClose={() => setSelected(null)} />
            )}
            <Card className="flex shrink-0 flex-col overflow-hidden border-zinc-200 px-2 py-2 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Total Scores
              </h3>
              <div className="min-h-[120px]">
                <ScoreChart
                  engineers={top}
                  selectedLogin={selected?.login ?? null}
                  onSelect={(eng) => setSelected(selected?.login === eng.login ? null : eng)}
                />
              </div>
            </Card>
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
    <header className="relative z-20 flex-shrink-0 border-b border-zinc-200 bg-white px-4 py-2 backdrop-blur-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center gap-1.5">
          <input
            type="password"
            placeholder="ghp_... (browser only)"
            value={userToken ?? ""}
            onChange={(e) => setUserToken(e.target.value.trim() || null)}
            className="max-w-40 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            autoComplete="off"
          />
          <a
            href={GITHUB_PAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded px-2 py-1 text-[10px] font-medium text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
          >
            Create token
          </a>
        </div>
      )}
    </div>
  );
}

function TopToggle({
  value,
  onChange,
  loading = false,
}: {
  value: 5 | 10;
  onChange: (v: 5 | 10) => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-0.5">
        {([5, 10] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            disabled={loading}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-70 ${
              value === n ? "bg-violet-500/20 text-violet-300" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Top {n}
          </button>
        ))}
      </div>
      {loading && (
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-violet-400"
          aria-hidden
        />
      )}
    </div>
  );
}
