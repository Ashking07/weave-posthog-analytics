"use client";

import { useDensity } from "@/components/layout";
import { RepoSearchBar } from "./RepoSearchBar";
import type { RepoSearchResult } from "@/types";
import { GITHUB_PAT_URL } from "@/hooks/useImpactData";

export function DashboardHeader({
  repo,
  onRepoSelect,
  windowDays,
  onWindowDaysChange,
  topLimit,
  onTopLimitChange,
  excludeBots,
  onExcludeBotsChange,
  engineerSearch,
  onEngineerSearchChange,
  userToken,
  showTokenInput,
  setShowTokenInput,
  setUserToken,
  loading,
}: {
  repo: string;
  onRepoSelect: (r: RepoSearchResult) => void;
  windowDays: number;
  onWindowDaysChange: (d: number) => void;
  topLimit: 5 | 10;
  onTopLimitChange: (v: 5 | 10) => void;
  excludeBots: boolean;
  onExcludeBotsChange: (v: boolean) => void;
  engineerSearch: string;
  onEngineerSearchChange: (v: string) => void;
  userToken: string | null;
  showTokenInput: boolean;
  setShowTokenInput: (v: boolean) => void;
  setUserToken: (v: string | null) => void;
  loading?: boolean;
}) {
  const { density, setDensity } = useDensity();

  return (
    <header className="px-4 py-2">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="shrink-0 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-base font-bold tracking-tight text-transparent">
            OSS Impact
          </h1>

          <div className="min-w-0 flex-1 sm:max-w-72">
            <RepoSearchBar
              value={repo}
              onSelect={onRepoSelect}
              placeholder="Repo..."
              token={userToken}
            />
          </div>

          <select
            value={windowDays}
            onChange={(e) => onWindowDaysChange(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value={30}>30d</option>
            <option value={60}>60d</option>
            <option value={90}>90d</option>
            <option value={180}>180d</option>
          </select>

          <div className="flex rounded-md border border-zinc-300 bg-zinc-50 p-0.5 dark:border-zinc-600 dark:bg-zinc-800/50">
            {([5, 10] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onTopLimitChange(n)}
                disabled={loading}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-70 ${
                  topLimit === n
                    ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={excludeBots}
              onChange={(e) => onExcludeBotsChange(e.target.checked)}
              className="rounded border-zinc-400 text-violet-500 focus:ring-violet-500"
            />
            Exclude bots
          </label>

          <div className="flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 p-0.5 dark:border-zinc-600 dark:bg-zinc-800/50">
            <button
              type="button"
              onClick={() => setDensity("compact")}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                density === "compact"
                  ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setDensity("comfortable")}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                density === "comfortable"
                  ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
              }`}
            >
              Comfortable
            </button>
          </div>

          <input
            type="search"
            placeholder="Search engineer..."
            value={engineerSearch}
            onChange={(e) => onEngineerSearchChange(e.target.value)}
            className="max-w-32 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder-zinc-500"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-400"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {showTokenInput ? "Hide" : "Token"}
          </button>
          {showTokenInput && (
            <>
              <input
                type="password"
                placeholder="ghp_..."
                value={userToken ?? ""}
                onChange={(e) => setUserToken(e.target.value.trim() || null)}
                className="max-w-32 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-500 focus:border-violet-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800"
                autoComplete="off"
              />
              <a
                href={GITHUB_PAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-400"
              >
                Create token
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
