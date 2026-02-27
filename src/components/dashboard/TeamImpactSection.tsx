"use client";

import { useMemo } from "react";
import type { Engineer, TopPR } from "@/types";
import { collectTeamImpactPRs, engineerTeamImpactPRs } from "@/lib/teamImpactScoring";
import { ImpactSectionCard } from "./ImpactSectionCard";
import { SECTION_ICONS } from "./sectionIcons";
import type { TopItem } from "./TopItemsList";

function countTeamImpactPRs(engineers: Engineer[]): number {
  let count = 0;
  for (const eng of engineers) {
    for (const pr of eng.topPRs) {
      if (pr.classification?.buckets?.includes("TEAM_IMPACT")) count++;
    }
  }
  return count;
}

function EvidenceContent({ pr }: { pr: TopPR }) {
  return (
    <div className="max-w-xs space-y-2 text-xs">
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
      {pr.filePaths && pr.filePaths.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-zinc-200">Paths</p>
          <p className="text-zinc-400">
            {pr.filePaths.slice(0, 5).join(", ")}
            {pr.filePaths.length > 5 && ` +${pr.filePaths.length - 5}`}
          </p>
        </div>
      )}
    </div>
  );
}

function toTopItems(items: ReturnType<typeof collectTeamImpactPRs>): TopItem[] {
  return items.map(({ pr, author }) => ({
    id: pr.url,
    title: pr.title,
    url: pr.url,
    author,
    mergedAt: pr.mergedAt,
    badge: (
      <span className="shrink-0 rounded bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-500/10 dark:text-slate-300">
        team
      </span>
    ),
    evidenceContent: <EvidenceContent pr={pr} />,
  }));
}

export function TeamImpactSection({
  engineers,
  onSelectEngineer,
  sectionId = "section-team-impact",
}: {
  engineers: Engineer[];
  onSelectEngineer?: (login: string) => void;
  sectionId?: string;
}) {
  const items = useMemo(() => collectTeamImpactPRs(engineers, 50), [engineers]);
  const topItems = useMemo(() => toTopItems(items), [items]);
  const teamTotal = useMemo(() => countTeamImpactPRs(engineers), [engineers]);

  const sharePct = teamTotal > 0 ? Math.round((items.length / teamTotal) * 100) : null;

  const kpiLine = (
    <span className="text-[10px]">
      {items.length} PRs
      {sharePct != null && sharePct < 100 && ` · ${sharePct}% of team impact`}
    </span>
  );

  return (
    <ImpactSectionCard
      sectionId={sectionId}
      icon={SECTION_ICONS.teamImpact}
      title="Most mentorship signals"
      kpiLine={kpiLine}
      items={topItems}
      onAuthorClick={onSelectEngineer}
    />
  );
}

export function EngineerTeamImpact({ engineer }: { engineer: Engineer }) {
  const items = engineerTeamImpactPRs(engineer);

  if (items.length === 0) return null;

  return (
    <div className="mt-2.5">
      <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Team Impact (proxy)
      </h4>
      <ul className="space-y-0.5">
        {items.slice(0, 5).map(({ pr }) => (
          <li key={pr.url}>
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {pr.title.length > 48 ? pr.title.slice(0, 48) + "\u2026" : pr.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
