"use client";

import { useMemo } from "react";
import type { Engineer, TopPR } from "@/types";
import {
  collectLeadershipPRs,
  buildInitiatives,
  engineerInitiatives,
  type TaggedLeadershipPR,
  type InitiativeSummary,
} from "@/lib/leadershipScoring";
import { ImpactSectionCard } from "./ImpactSectionCard";
import { SECTION_ICONS } from "./sectionIcons";
import type { TopItem } from "./TopItemsList";

function LeadershipPREvidence({ pr }: { pr: TopPR }) {
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

function InitiativeEvidence({ init }: { init: InitiativeSummary }) {
  return (
    <div className="max-w-xs space-y-2 text-xs">
      <p className="font-medium text-zinc-200">
        {init.prCount} PRs · {init.contributors.length} contributors
      </p>
      <ul className="space-y-0.5 text-zinc-400">
        {init.linkedPRs.slice(0, 5).map((lpr) => (
          <li key={lpr.url}>
            <a href={lpr.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {lpr.title.length > 40 ? lpr.title.slice(0, 40) + "\u2026" : lpr.title}
            </a>
            {" "}({lpr.author})
          </li>
        ))}
        {init.linkedPRs.length > 5 && (
          <li>+{init.linkedPRs.length - 5} more</li>
        )}
      </ul>
    </div>
  );
}

function toTopItems(
  rfcItems: TaggedLeadershipPR[],
  initiatives: InitiativeSummary[],
): TopItem[] {
  const rfcItemsMapped: TopItem[] = rfcItems.map(({ pr, author }) => ({
    id: `rfc-${pr.url}`,
    title: pr.title,
    url: pr.url,
    author,
    mergedAt: pr.mergedAt,
    badge: (
      <span className="shrink-0 rounded bg-purple-50 px-1 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
        RFC/design
      </span>
    ),
    evidenceContent: <LeadershipPREvidence pr={pr} />,
  }));

  const initItemsMapped: TopItem[] = initiatives.map((init) => ({
    id: `init-${init.issue.number}`,
    title: `#${init.issue.number}: ${init.issue.title}`,
    url: init.issue.url,
    author: init.driver,
    mergedAt: init.lastPRDate,
    badge: (
      <span className="shrink-0 rounded bg-indigo-50 px-1 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
        {init.prCount} PRs
      </span>
    ),
    evidenceContent: <InitiativeEvidence init={init} />,
  }));

  const combined = [...rfcItemsMapped, ...initItemsMapped];
  combined.sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());
  return combined.slice(0, 50);
}

export function LeadershipSection({
  engineers,
  onSelectEngineer,
  sectionId = "section-leadership",
}: {
  engineers: Engineer[];
  onSelectEngineer?: (login: string) => void;
  sectionId?: string;
}) {
  const rfcPRs = useMemo(() => {
    const all: TaggedLeadershipPR[] = [];
    for (const eng of engineers) {
      all.push(...collectLeadershipPRs(eng.topPRs, eng.login, eng.avatarUrl));
    }
    return all;
  }, [engineers]);

  const initiatives = useMemo(() => buildInitiatives(engineers), [engineers]);
  const topItems = useMemo(
    () => toTopItems(rfcPRs, initiatives.slice(0, 25)),
    [rfcPRs, initiatives],
  );

  const kpiLine = (
    <span className="text-[10px]">
      {rfcPRs.length} RFC/design · {initiatives.length} initiative{initiatives.length !== 1 ? "s" : ""}
    </span>
  );

  return (
    <ImpactSectionCard
      sectionId={sectionId}
      icon={SECTION_ICONS.leadership}
      title="Most leadership artifacts"
      kpiLine={kpiLine}
      items={topItems}
      onAuthorClick={onSelectEngineer}
    />
  );
}

export function EngineerLeadership({
  engineer,
  allInitiatives,
}: {
  engineer: Engineer;
  allInitiatives: InitiativeSummary[];
}) {
  const rfcPRs = collectLeadershipPRs(
    engineer.topPRs,
    engineer.login,
    engineer.avatarUrl,
  );
  const driven = engineerInitiatives(engineer.login, allInitiatives);

  if (rfcPRs.length === 0 && driven.length === 0) return null;

  return (
    <div className="mt-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Leadership (proxy)
        </h4>
        {rfcPRs.length > 0 && (
          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
            {rfcPRs.length} RFC
          </span>
        )}
        {driven.length > 0 && (
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            driving {driven.length}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {rfcPRs.length > 0 && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-zinc-500">RFC / Design docs</p>
            <ul className="space-y-0.5">
              {rfcPRs.slice(0, 5).map(({ pr }) => (
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
        )}
        {driven.length > 0 && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-zinc-500">Initiatives driven</p>
            <ul className="space-y-0.5">
              {driven.slice(0, 5).map((init) => (
                <li key={init.issue.number}>
                  <a
                    href={init.issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    #{init.issue.number}: {init.issue.title.length > 40 ? init.issue.title.slice(0, 40) + "\u2026" : init.issue.title}
                  </a>
                  <span className="ml-1 text-[10px] text-zinc-500">({init.prCount} PRs)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
