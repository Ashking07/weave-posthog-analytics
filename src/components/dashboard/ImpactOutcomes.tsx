"use client";

import { useMemo } from "react";
import type { Engineer, TopPR } from "@/types";
import {
  scoreOutcomePR,
  isOutcomePR,
  type ScoredOutcomePR,
  type OutcomeScoreBreakdown,
} from "@/lib/outcomeScoring";
import { ImpactSectionCard } from "./ImpactSectionCard";
import { SECTION_ICONS } from "./sectionIcons";
import type { TopItem } from "./TopItemsList";

function collectOutcomePRs(engineers: Engineer[], limit: number): ScoredOutcomePR[] {
  const all: ScoredOutcomePR[] = [];
  for (const eng of engineers) {
    for (const pr of eng.topPRs) {
      if (!isOutcomePR(pr)) continue;
      all.push({
        pr,
        author: eng.login,
        authorAvatar: eng.avatarUrl,
        score: scoreOutcomePR(pr),
      });
    }
  }
  all.sort((a, b) => b.score.total - a.score.total);
  return all.slice(0, limit);
}

function EvidenceContent({ pr, score }: { pr: TopPR; score: OutcomeScoreBreakdown }) {
  return (
    <div className="max-w-xs space-y-2 text-xs">
      <div>
        <p className="mb-1 font-medium text-zinc-200">Score breakdown</p>
        <div className="space-y-0.5 text-zinc-400">
          {score.customerLabel > 0 && <p>Customer label: +{score.customerLabel}</p>}
          {score.highImpactLabel > 0 && <p>High-impact label: +{score.highImpactLabel}</p>}
          {score.filesBucket > 0 && (
            <p>Files changed ({pr.filePaths?.length ?? 0}): +{score.filesBucket}</p>
          )}
          {score.reactions > 0 && <p>Reactions ({pr.reactions?.totalCount ?? 0}): +{score.reactions}</p>}
          {score.total === 0 && <p>Base outcome (no bonus signals)</p>}
        </div>
      </div>
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
      {pr.linkedIssues && pr.linkedIssues.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-zinc-200">Linked issues</p>
          <ul className="space-y-0.5 text-zinc-400">
            {pr.linkedIssues.map((iss) => (
              <li key={iss.number}>#{iss.number}: {iss.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function toTopItems(items: ScoredOutcomePR[], totalPrs: number): TopItem[] {
  return items.map(({ pr, author, score }) => ({
    id: pr.url,
    title: pr.title,
    url: pr.url,
    author,
    mergedAt: pr.mergedAt,
    badge:
      score.total > 0 ? (
        <span className="shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          +{score.total}
        </span>
      ) : undefined,
    evidenceContent: <EvidenceContent pr={pr} score={score} />,
  }));
}

export function ImpactOutcomes({
  engineers,
  totalPrs,
  onSelectEngineer,
  sectionId = "section-outcomes",
}: {
  engineers: Engineer[];
  totalPrs?: number;
  onSelectEngineer?: (login: string) => void;
  sectionId?: string;
}) {
  const items = useMemo(() => collectOutcomePRs(engineers, 50), [engineers]);
  const topItems = useMemo(() => toTopItems(items, totalPrs ?? 0), [items, totalPrs]);

  const sharePct =
    totalPrs && totalPrs > 0 ? Math.round((items.length / totalPrs) * 100) : null;

  const kpiLine = (
    <span className="text-[10px]">
      {items.length} PRs
      {sharePct != null && ` · ${sharePct}% of merged`}
    </span>
  );

  return (
    <ImpactSectionCard
      sectionId={sectionId}
      icon={SECTION_ICONS.outcomes}
      title="Most outcome artifacts"
      kpiLine={kpiLine}
      items={topItems}
      onAuthorClick={onSelectEngineer}
    />
  );
}

export function EngineerOutcomes({ engineer }: { engineer: Engineer }) {
  const outcomes = engineer.topPRs
    .filter(isOutcomePR)
    .map((pr) => ({
      pr,
      author: engineer.login,
      authorAvatar: engineer.avatarUrl,
      score: scoreOutcomePR(pr),
    }))
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 5);

  if (outcomes.length === 0) return null;

  return (
    <div className="mt-2.5">
      <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Most outcome artifacts
      </h4>
      <ul className="space-y-0.5">
        {outcomes.map(({ pr, score }) => (
          <li key={pr.url} className="flex items-center gap-2 text-xs">
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {pr.title.length > 48 ? pr.title.slice(0, 48) + "\u2026" : pr.title}
            </a>
            {score.total > 0 && (
              <span className="shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                +{score.total}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
