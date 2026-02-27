"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Engineer, EngineerInsight } from "@/types";
import { Avatar } from "@/components/ui";
import { TopItemsList } from "./TopItemsList";
import {
  getEngineerOutcomeItems,
  getEngineerLeverageItems,
  getEngineerReliabilityItems,
  getEngineerLeadershipItems,
  getEngineerTeamImpactItems,
  getEngineerActivityItems,
} from "@/lib/engineerDetailItems";
import { buildInitiatives, engineerInitiatives } from "@/lib/leadershipScoring";
import { isOutcomePR } from "@/lib/outcomeScoring";
import { isLeveragePR } from "@/lib/leverageScoring";
import { countReliabilityPRs } from "@/lib/reliabilityScoring";
import { engineerTeamImpactPRs } from "@/lib/teamImpactScoring";

const TABS = [
  { id: "outcomes", label: "Outcomes" },
  { id: "leverage", label: "Leverage" },
  { id: "reliability", label: "Reliability" },
  { id: "leadership", label: "Leadership" },
  { id: "team-impact", label: "Team Impact" },
  { id: "activity", label: "Activity" },
] as const;

const INITIAL_ITEMS = 10;

export function EngineerDetailDrawer({
  engineer,
  engineers,
  windowDays,
  insights,
  onClose,
}: {
  engineer: Engineer;
  engineers?: Engineer[];
  windowDays: number;
  insights?: Record<string, EngineerInsight> | null;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("outcomes");
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());

  const allInitiatives = useMemo(
    () => (engineers ? buildInitiatives(engineers) : []),
    [engineers],
  );

  const outcomeItems = useMemo(() => getEngineerOutcomeItems(engineer), [engineer]);
  const leverageItems = useMemo(() => getEngineerLeverageItems(engineer), [engineer]);
  const reliabilityItems = useMemo(() => getEngineerReliabilityItems(engineer), [engineer]);
  const leadershipItems = useMemo(
    () => getEngineerLeadershipItems(engineer, allInitiatives),
    [engineer, allInitiatives],
  );
  const teamImpactItems = useMemo(() => getEngineerTeamImpactItems(engineer), [engineer]);
  const activityItems = useMemo(() => getEngineerActivityItems(engineer), [engineer]);

  const counts = useMemo(() => {
    const rel = countReliabilityPRs(engineer.topPRs);
    const driven = engineerInitiatives(engineer.login, allInitiatives);
    const teamImpact = engineerTeamImpactPRs(engineer);
    return {
      outcomes: engineer.topPRs.filter(isOutcomePR).length,
      leverage: engineer.topPRs.filter(isLeveragePR).length,
      reliability: rel.firefighting + rel.systemic,
      leadership: leadershipItems.length,
      teamImpact: teamImpact.length,
      activity: engineer.topPRs.length,
    };
  }, [engineer, allInitiatives, leadershipItems.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!engineer) return null;

  const toggleExpand = (tabId: string) => {
    setExpandedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  };

  const getItemsForTab = (tabId: string) => {
    switch (tabId) {
      case "outcomes":
        return outcomeItems;
      case "leverage":
        return leverageItems;
      case "reliability":
        return reliabilityItems;
      case "leadership":
        return leadershipItems;
      case "team-impact":
        return teamImpactItems;
      case "activity":
        return activityItems;
      default:
        return [];
    }
  };

  const items = getItemsForTab(activeTab);
  const initialItems = items.slice(0, INITIAL_ITEMS);
  const restItems = items.slice(INITIAL_ITEMS);
  const isExpanded = expandedTabs.has(activeTab);
  const hasMore = restItems.length > 0;

  const content = (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-label={`Engineer details for ${engineer.login}`}
      >
        <header className="flex shrink-0 flex-col gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {engineer.avatarUrl ? (
                <Avatar src={engineer.avatarUrl} alt={engineer.login} size={36} />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold dark:bg-zinc-700">
                  {engineer.login[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 id="drawer-title" className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {engineer.login}
                </h2>
                <p className="text-[11px] text-zinc-500">Last {windowDays} days</p>
              </div>
            </div>
            <a
              href={`https://github.com/${engineer.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label={`View ${engineer.login} on GitHub`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label="Close drawer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {counts.outcomes > 0 && (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {counts.outcomes} Outcomes
              </span>
            )}
            {counts.leverage > 0 && (
              <span className="rounded bg-cyan-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                {counts.leverage} Leverage
              </span>
            )}
            {counts.reliability > 0 && (
              <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                {counts.reliability} Reliability
              </span>
            )}
            {counts.leadership > 0 && (
              <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                {counts.leadership} Leadership
              </span>
            )}
            {counts.teamImpact > 0 && (
              <span className="rounded bg-slate-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-700 dark:bg-slate-500/10 dark:text-slate-300">
                {counts.teamImpact} Team
              </span>
            )}
          </div>
          {(insights?.[engineer.login] ?? insights?.[engineer.login.toLowerCase()])?.summary && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 dark:border-violet-500/25 dark:bg-violet-500/10">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI Insight
              </div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                &ldquo;{(insights?.[engineer.login] ?? insights?.[engineer.login.toLowerCase()])!.summary}&rdquo;
              </p>
            </div>
          )}
        </header>

        <div className="flex shrink-0 gap-0.5 border-b border-zinc-200 px-2 py-1 dark:border-zinc-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">No items in this category</p>
          ) : (
            <>
              <TopItemsList
                items={initialItems}
                maxItems={INITIAL_ITEMS}
                titleTruncate={52}
              />
              {hasMore && (
                <>
                  {isExpanded ? (
                    <div className="mt-2 space-y-0.5 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                      <TopItemsList
                        items={restItems}
                        maxItems={restItems.length}
                        titleTruncate={52}
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpand(activeTab)}
                        className="mt-2 w-full rounded py-1.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      >
                        View less
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleExpand(activeTab)}
                      className="mt-2 w-full rounded py-1.5 text-[11px] font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10"
                    >
                      View more ({restItems.length})
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );

  return createPortal(content, document.body);
}
