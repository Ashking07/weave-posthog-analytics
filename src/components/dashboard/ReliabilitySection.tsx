"use client";

import { useMemo } from "react";
import type { Engineer, TopPR } from "@/types";
import {
  collectTaggedReliabilityPRs,
  countReliabilityPRs,
  type TaggedReliabilityPR,
  type ReliabilityAnalysis,
  type ReliabilityCounts,
} from "@/lib/reliabilityScoring";
import { ImpactSectionCard } from "./ImpactSectionCard";
import { SECTION_ICONS } from "./sectionIcons";
import type { TopItem } from "./TopItemsList";

function gatherTeamReliabilityPRs(engineers: Engineer[]): TaggedReliabilityPR[] {
  const all: TaggedReliabilityPR[] = [];
  for (const eng of engineers) {
    all.push(...collectTaggedReliabilityPRs(eng.topPRs, eng.login, eng.avatarUrl));
  }
  return all;
}

function teamCounts(engineers: Engineer[]): ReliabilityCounts {
  let firefighting = 0;
  let systemic = 0;
  for (const eng of engineers) {
    const c = countReliabilityPRs(eng.topPRs);
    firefighting += c.firefighting;
    systemic += c.systemic;
  }
  return { firefighting, systemic };
}

function EvidenceContent({ pr, analysis }: { pr: TopPR; analysis: ReliabilityAnalysis }) {
  return (
    <div className="max-w-xs space-y-2 text-xs">
      <div>
        <p className="mb-1 font-medium text-zinc-200">
          {analysis.kind === "firefighting" ? "Firefighting signals" : "Systemic fix signals"}
        </p>
        <ul className="space-y-0.5 text-zinc-400">
          {analysis.signals.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
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
    </div>
  );
}

function toTopItems(items: TaggedReliabilityPR[]): TopItem[] {
  return items.map(({ pr, author, analysis }) => ({
    id: pr.url,
    title: pr.title,
    url: pr.url,
    author,
    mergedAt: pr.mergedAt,
    badge: (
      <span
        className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${
          analysis.kind === "firefighting"
            ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
            : "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
        }`}
      >
        {analysis.kind === "firefighting" ? "reactive" : "systemic"}
      </span>
    ),
    evidenceContent: <EvidenceContent pr={pr} analysis={analysis} />,
  }));
}

export function ReliabilitySection({
  engineers,
  onSelectEngineer,
  sectionId = "section-reliability",
}: {
  engineers: Engineer[];
  onSelectEngineer?: (login: string) => void;
  sectionId?: string;
}) {
  const items = useMemo(() => {
    const all = gatherTeamReliabilityPRs(engineers);
    return all.slice(0, 50);
  }, [engineers]);

  const counts = useMemo(() => teamCounts(engineers), [engineers]);
  const topItems = useMemo(() => toTopItems(items), [items]);

  const kpiLine = (
    <span className="text-[10px]">
      {counts.firefighting} reactive · {counts.systemic} systemic
    </span>
  );

  return (
    <ImpactSectionCard
      sectionId={sectionId}
      icon={SECTION_ICONS.reliability}
      title="Most reliability work"
      kpiLine={kpiLine}
      items={topItems}
      onAuthorClick={onSelectEngineer}
    />
  );
}

export function EngineerReliability({ engineer }: { engineer: Engineer }) {
  const tagged = collectTaggedReliabilityPRs(
    engineer.topPRs,
    engineer.login,
    engineer.avatarUrl,
  );

  if (tagged.length === 0) return null;

  const counts = countReliabilityPRs(engineer.topPRs);
  const firefighting = tagged
    .filter((p) => p.analysis.kind === "firefighting")
    .slice(0, 5);
  const systemic = tagged
    .filter((p) => p.analysis.kind === "systemic")
    .slice(0, 5);

  return (
    <div className="mt-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Reliability (proxy)
        </h4>
        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {counts.firefighting} reactive
        </span>
        <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
          {counts.systemic} systemic
        </span>
      </div>
      <div className="space-y-1.5">
        {firefighting.length > 0 && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-zinc-500">Firefighting</p>
            <ul className="space-y-0.5">
              {firefighting.map(({ pr }) => (
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
        {systemic.length > 0 && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-zinc-500">Systemic fixes</p>
            <ul className="space-y-0.5">
              {systemic.map(({ pr }) => (
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
      </div>
    </div>
  );
}
