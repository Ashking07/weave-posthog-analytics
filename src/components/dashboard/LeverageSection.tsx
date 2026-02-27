"use client";

import { useMemo } from "react";
import type { Engineer, TopPR } from "@/types";
import {
  analyzeLeveragePR,
  isLeveragePR,
  type ScoredLeveragePR,
  type LeverageAnalysis,
} from "@/lib/leverageScoring";
import { ImpactSectionCard } from "./ImpactSectionCard";
import { SECTION_ICONS } from "./sectionIcons";
import type { TopItem } from "./TopItemsList";

function collectLeveragePRs(engineers: Engineer[], limit: number): ScoredLeveragePR[] {
  const all: ScoredLeveragePR[] = [];
  for (const eng of engineers) {
    for (const pr of eng.topPRs) {
      if (!isLeveragePR(pr)) continue;
      all.push({
        pr,
        author: eng.login,
        authorAvatar: eng.avatarUrl,
        analysis: analyzeLeveragePR(pr),
      });
    }
  }
  all.sort((a, b) => b.analysis.breadth - a.analysis.breadth);
  return all.slice(0, limit);
}

export function countTeamLeveragePRs(engineers: Engineer[]): number {
  let count = 0;
  for (const eng of engineers) {
    for (const pr of eng.topPRs) {
      if (isLeveragePR(pr)) count++;
    }
  }
  return count;
}

function EvidenceContent({ pr, analysis }: { pr: TopPR; analysis: LeverageAnalysis }) {
  return (
    <div className="max-w-xs space-y-2 text-xs">
      <div>
        <p className="mb-1 font-medium text-zinc-200">Breadth</p>
        <p className="text-zinc-400">
          {analysis.breadth} top-level {analysis.breadth === 1 ? "directory" : "directories"}:{" "}
          {analysis.topLevelDirs.slice(0, 6).join(", ")}
          {analysis.topLevelDirs.length > 6 && ` +${analysis.topLevelDirs.length - 6} more`}
        </p>
      </div>
      {analysis.infraTouch && (
        <div>
          <p className="font-medium text-zinc-200">Infra touch</p>
          <p className="text-zinc-400">Modifies CI workflows, scripts, or build tooling</p>
        </div>
      )}
      {pr.classification?.reasons && pr.classification.reasons.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-zinc-200">Classification</p>
          <ul className="space-y-0.5 text-zinc-400">
            {pr.classification.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function toTopItems(items: ScoredLeveragePR[]): TopItem[] {
  return items.map(({ pr, author, analysis }) => ({
    id: pr.url,
    title: pr.title,
    url: pr.url,
    author,
    mergedAt: pr.mergedAt,
    badge: (
      <span className="flex shrink-0 gap-1">
        {analysis.breadth > 0 && (
          <span className="rounded bg-cyan-50 px-1 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {analysis.breadth} dirs
          </span>
        )}
        {analysis.infraTouch && (
          <span className="rounded bg-orange-50 px-1 py-0.5 text-[10px] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
            infra
          </span>
        )}
      </span>
    ),
    evidenceContent: <EvidenceContent pr={pr} analysis={analysis} />,
  }));
}

export function LeverageSection({
  engineers,
  onSelectEngineer,
  sectionId = "section-leverage",
}: {
  engineers: Engineer[];
  onSelectEngineer?: (login: string) => void;
  sectionId?: string;
}) {
  const items = useMemo(() => collectLeveragePRs(engineers, 50), [engineers]);
  const teamTotal = useMemo(() => countTeamLeveragePRs(engineers), [engineers]);
  const topItems = useMemo(() => toTopItems(items), [items]);

  const sharePct = teamTotal > 0 ? Math.round((items.length / teamTotal) * 100) : null;

  const kpiLine = (
    <span className="text-[10px]">
      {items.length} PRs
      {sharePct != null && ` · ${sharePct}% of team leverage`}
    </span>
  );

  return (
    <ImpactSectionCard
      sectionId={sectionId}
      icon={SECTION_ICONS.leverage}
      title="Most leverage contributions"
      kpiLine={kpiLine}
      items={topItems}
      onAuthorClick={onSelectEngineer}
    />
  );
}

export function EngineerLeverage({
  engineer,
  teamLeverageCount,
}: {
  engineer: Engineer;
  teamLeverageCount: number;
}) {
  const leveragePRs = engineer.topPRs
    .filter(isLeveragePR)
    .map((pr) => ({
      pr,
      author: engineer.login,
      authorAvatar: engineer.avatarUrl,
      analysis: analyzeLeveragePR(pr),
    }))
    .sort((a, b) => b.analysis.breadth - a.analysis.breadth)
    .slice(0, 5);

  if (leveragePRs.length === 0) return null;

  const leverageShare =
    teamLeverageCount > 0
      ? Math.round((leveragePRs.length / teamLeverageCount) * 100)
      : 0;

  return (
    <div className="mt-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Leverage (proxy)
        </h4>
        {teamLeverageCount > 0 && (
          <span
            className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
            title={`${leveragePRs.length} of ${teamLeverageCount} team leverage PRs`}
          >
            {leverageShare}% of team leverage
          </span>
        )}
      </div>
      <ul className="space-y-0.5">
        {leveragePRs.map(({ pr, analysis }) => (
          <li key={pr.url} className="flex items-center gap-2 text-xs">
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {pr.title.length > 48 ? pr.title.slice(0, 48) + "\u2026" : pr.title}
            </a>
            {analysis.breadth > 0 && (
              <span className="shrink-0 rounded bg-cyan-50 px-1 py-0.5 text-[10px] text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                {analysis.breadth} dirs
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
