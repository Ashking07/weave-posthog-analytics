"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, InfoTooltip } from "@/components/ui";
import { DashboardLayout } from "@/components/layout";
import {
  DashboardHeader,
  DoraKpiRow,
  EngineerDetailDrawer,
  ExecutiveSummaryStrip,
  ImpactGrid,
  ImpactOutcomes,
  JumpToNav,
  LeadershipSection,
  LeverageSection,
  ReliabilitySection,
  RepoSearchBar,
  ScoreChart,
  TeamImpactSection,
  TopEngineersTable,
} from "@/components/dashboard";
import { useGitHubToken } from "@/hooks/useGitHubToken";
import { useImpactData, GITHUB_PAT_URL } from "@/hooks/useImpactData";
import type { Engineer, RepoSearchResult } from "@/types";

const DEFAULT_REPO = "PostHog/posthog";

const LOADING_STEPS = [
  { id: "fetch_prs", label: "Fetching merged PRs…" },
  { id: "metrics", label: "Computing metrics…" },
  { id: "insights", label: "AI insights (optional)…" },
] as const;

const LOADING_DURATION_MS = 10_000;
const STEP_INTERVAL_MS = LOADING_DURATION_MS / LOADING_STEPS.length;

function LoadingSteps({
  steps,
  timerStepIndex,
  completedSteps,
}: {
  steps: readonly { id: string; label: string }[];
  timerStepIndex: number;
  completedSteps: string[];
}) {
  const displayedIndex = Math.min(
    Math.max(timerStepIndex, completedSteps.length),
    steps.length - 1,
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const done = completedSteps.includes(step.id) || i < displayedIndex;
          const current = i === displayedIndex && !done;
          return (
            <div
              key={step.id}
              className="flex items-center gap-3 text-sm text-zinc-500 transition-colors duration-300"
            >
              {done ? (
                <svg
                  className="h-4 w-4 shrink-0 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : current ? (
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-400 border-t-violet-500" />
              ) : (
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-400"
                  aria-hidden
                />
              )}
              <span className={current ? "text-violet-600 dark:text-violet-400 font-medium" : ""}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full bg-violet-500 transition-all duration-500 ease-out"
          style={{
            width: `${((displayedIndex + 1) / steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [topLimit, setTopLimit] = useState<5 | 10>(5);
  const [windowDays, setWindowDays] = useState(90);
  const [excludeBots, setExcludeBots] = useState(true);
  const [engineerSearch, setEngineerSearch] = useState("");
  const [userToken, setUserToken] = useGitHubToken();
  const [showTokenInput, setShowTokenInput] = useState(false);

  const { data, error, loading, loadingProgress, retry } = useImpactData({
    repo,
    top: topLimit,
    token: userToken || undefined,
  });

  const [selected, setSelected] = useState<Engineer | null>(null);

  const [timerStepIndex, setTimerStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredEngineers = useMemo(() => {
    const top = data?.top ?? [];
    if (!engineerSearch.trim()) return top;
    const q = engineerSearch.toLowerCase().trim();
    return top.filter((e) => e.login.toLowerCase().includes(q));
  }, [data?.top, engineerSearch]);

  useEffect(() => {
    if (!loading || data) {
      setTimerStepIndex(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setTimerStepIndex(0);
    timerRef.current = setInterval(() => {
      setTimerStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, data]);

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300"
            >
              {showTokenInput ? "Hide token" : "GitHub token"}
            </button>
            {showTokenInput && (
              <input
                type="password"
                placeholder="ghp_..."
                value={userToken ?? ""}
                onChange={(e) => setUserToken(e.target.value.trim() || null)}
                className="max-w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                autoComplete="off"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
        <DashboardLayout
        header={
          <DashboardHeader
            repo={repo}
            onRepoSelect={handleRepoSelect}
            windowDays={windowDays}
            onWindowDaysChange={setWindowDays}
            topLimit={topLimit}
            onTopLimitChange={setTopLimit}
            excludeBots={excludeBots}
            onExcludeBotsChange={setExcludeBots}
            engineerSearch={engineerSearch}
            onEngineerSearchChange={setEngineerSearch}
            userToken={userToken}
            showTokenInput={showTokenInput}
            setShowTokenInput={setShowTokenInput}
            setUserToken={setUserToken}
            loading={loading}
          />
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
          <p className="text-xs text-zinc-500">Fetching data for {repo}…</p>
          <LoadingSteps
            steps={LOADING_STEPS}
            timerStepIndex={timerStepIndex}
            completedSteps={loadingProgress.completedSteps}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !data) {
    return (
        <DashboardLayout
        header={
          <DashboardHeader
            repo={repo}
            onRepoSelect={handleRepoSelect}
            windowDays={windowDays}
            onWindowDaysChange={setWindowDays}
            topLimit={topLimit}
            onTopLimitChange={setTopLimit}
            excludeBots={excludeBots}
            onExcludeBotsChange={setExcludeBots}
            engineerSearch={engineerSearch}
            onEngineerSearchChange={setEngineerSearch}
            userToken={userToken}
            showTokenInput={showTokenInput}
            setShowTokenInput={setShowTokenInput}
            setUserToken={setUserToken}
            loading={loading}
          />
        }
      >
        <div className="flex flex-1 items-center justify-center px-4 py-12">
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
      </DashboardLayout>
    );
  }

  const top = data!.top;
  const prsCount = data!.prsCount;
  const reviewsCount = data!.reviewsCount;
  const effectiveWindowDays = data!.windowDays ?? windowDays;

  return (
    <DashboardLayout
      header={
        <DashboardHeader
          repo={repo}
          onRepoSelect={handleRepoSelect}
          windowDays={effectiveWindowDays}
          onWindowDaysChange={setWindowDays}
          topLimit={topLimit}
          onTopLimitChange={setTopLimit}
          excludeBots={excludeBots}
          onExcludeBotsChange={setExcludeBots}
          engineerSearch={engineerSearch}
          onEngineerSearchChange={setEngineerSearch}
          userToken={userToken}
          showTokenInput={showTokenInput}
          setShowTokenInput={setShowTokenInput}
          setUserToken={setUserToken}
          loading={loading}
        />
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <ExecutiveSummaryStrip
          engineers={filteredEngineers}
          prsCount={prsCount}
          reviewsCount={reviewsCount}
          windowDays={effectiveWindowDays}
        />

        <div className="flex flex-col gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <JumpToNav />
        </div>

        <DoraKpiRow
          doraProxies={data!.doraProxies}
          windowDays={effectiveWindowDays}
        />

        <ImpactGrid>
          <ImpactOutcomes
            engineers={filteredEngineers}
            totalPrs={prsCount ?? undefined}
            onSelectEngineer={(login) => {
              const eng = top.find((e) => e.login === login);
              if (eng) setSelected(eng);
            }}
          />
          <LeverageSection
            engineers={filteredEngineers}
            onSelectEngineer={(login) => {
              const eng = top.find((e) => e.login === login);
              if (eng) setSelected(eng);
            }}
          />
          <ReliabilitySection
            engineers={filteredEngineers}
            onSelectEngineer={(login) => {
              const eng = top.find((e) => e.login === login);
              if (eng) setSelected(eng);
            }}
          />
          <LeadershipSection
            engineers={filteredEngineers}
            onSelectEngineer={(login) => {
              const eng = top.find((e) => e.login === login);
              if (eng) setSelected(eng);
            }}
          />
          <TeamImpactSection
            engineers={filteredEngineers}
            onSelectEngineer={(login) => {
              const eng = top.find((e) => e.login === login);
              if (eng) setSelected(eng);
            }}
          />
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/30">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Engineers
              </h3>
              <InfoTooltip
                content="Impact score = PRs (3 pts each + complexity from size) + reviews (1.2 pts each). Higher = more shipped and unblocked."
                label="How is the score calculated?"
              />
            </div>
            <div className="max-h-[260px] min-h-0 overflow-y-auto p-2">
              <TopEngineersTable
                engineers={filteredEngineers}
                selected={selected}
                onSelect={setSelected}
                prsCount={prsCount ?? undefined}
              />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Total Scores
            </h3>
            <div className="min-h-[120px]">
              <ScoreChart
                engineers={filteredEngineers}
                selectedLogin={selected?.login ?? null}
                onSelect={(eng) => setSelected(selected?.login === eng.login ? null : eng)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {selected && (
              <EngineerDetailDrawer
                engineer={selected}
                engineers={top}
                windowDays={effectiveWindowDays}
                insights={data!.insights}
                onClose={() => setSelected(null)}
              />
            )}
            {loading && data && (
              <p className="text-[11px] text-zinc-500">Updating AI insights…</p>
            )}
          </div>
        </ImpactGrid>
      </div>
    </DashboardLayout>
  );
}
