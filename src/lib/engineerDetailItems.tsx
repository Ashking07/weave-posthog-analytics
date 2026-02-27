/**
 * Builds TopItem arrays for a single engineer's detail drawer tabs.
 * Reuses scoring logic from outcome, leverage, reliability, leadership, teamImpact.
 */

import type { Engineer, TopPR, TopItem } from "@/types";
import {
  isOutcomePR,
  scoreOutcomePR,
  type OutcomeScoreBreakdown,
} from "./outcomeScoring";
import {
  isLeveragePR,
  analyzeLeveragePR,
  type LeverageAnalysis,
} from "./leverageScoring";
import {
  collectTaggedReliabilityPRs,
  type ReliabilityAnalysis,
} from "./reliabilityScoring";
import {
  collectLeadershipPRs,
  engineerInitiatives,
  type InitiativeSummary,
} from "./leadershipScoring";
import { engineerTeamImpactPRs } from "./teamImpactScoring";

function OutcomeEvidence({ pr, score }: { pr: TopPR; score: OutcomeScoreBreakdown }) {
  return (
    <div className="max-w-xs space-y-2 text-xs">
      <div className="space-y-0.5 text-zinc-400">
        {score.customerLabel > 0 && <p>Customer label: +{score.customerLabel}</p>}
        {score.highImpactLabel > 0 && <p>High-impact label: +{score.highImpactLabel}</p>}
        {score.filesBucket > 0 && <p>Files: +{score.filesBucket}</p>}
        {score.reactions > 0 && <p>Reactions: +{score.reactions}</p>}
      </div>
      {pr.classification?.reasons?.length ? (
        <ul className="space-y-0.5 text-zinc-400">
          {pr.classification.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LeverageEvidence({ pr, analysis }: { pr: TopPR; analysis: LeverageAnalysis }) {
  return (
    <div className="max-w-xs space-y-2 text-xs text-zinc-400">
      <p>
        {analysis.breadth} dirs: {analysis.topLevelDirs.slice(0, 5).join(", ")}
        {analysis.topLevelDirs.length > 5 && " …"}
      </p>
      {pr.classification?.reasons?.length ? (
        <ul className="space-y-0.5">
          {pr.classification.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReliabilityEvidence({ pr, analysis }: { pr: TopPR; analysis: ReliabilityAnalysis }) {
  return (
    <div className="max-w-xs space-y-2 text-xs text-zinc-400">
      <ul className="space-y-0.5">
        {analysis.signals.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      {pr.classification?.reasons?.length ? (
        <ul className="space-y-0.5">
          {pr.classification.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LeadershipPREvidence({ pr }: { pr: TopPR }) {
  return (
    <div className="max-w-xs space-y-2 text-xs text-zinc-400">
      {pr.classification?.reasons?.length ? (
        <ul className="space-y-0.5">
          {pr.classification.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function InitiativeEvidence({ init }: { init: InitiativeSummary }) {
  return (
    <div className="max-w-xs space-y-2 text-xs text-zinc-400">
      <p>{init.prCount} PRs · {init.contributors.length} contributors</p>
      <ul className="space-y-0.5">
        {init.linkedPRs.slice(0, 3).map((lpr) => (
          <li key={lpr.url}>
            <a href={lpr.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {lpr.title.slice(0, 35)}…
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamImpactEvidence({ pr }: { pr: TopPR }) {
  return (
    <div className="max-w-xs space-y-2 text-xs text-zinc-400">
      {pr.classification?.reasons?.length ? (
        <ul className="space-y-0.5">
          {pr.classification.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function getEngineerOutcomeItems(engineer: Engineer): TopItem[] {
  const prs = engineer.topPRs
    .filter(isOutcomePR)
    .map((pr) => ({ pr, score: scoreOutcomePR(pr) }))
    .sort((a, b) => b.score.total - a.score.total);

  return prs.map(({ pr, score }) => ({
    id: pr.url,
    title: pr.title,
    url: pr.url,
    author: engineer.login,
    mergedAt: pr.mergedAt,
    badge: score.total > 0 ? (
      <span className="shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        +{score.total}
      </span>
    ) : undefined,
    evidenceContent: <OutcomeEvidence pr={pr} score={score} />,
  }));
}


export function getEngineerLeverageItems(engineer: Engineer): TopItem[] {
  return engineer.topPRs
    .filter(isLeveragePR)
    .map((pr) => {
      const analysis = analyzeLeveragePR(pr);
      return {
        id: pr.url,
        title: pr.title,
        url: pr.url,
        author: engineer.login,
        mergedAt: pr.mergedAt,
        badge: (
          <span className="shrink-0 rounded bg-cyan-50 px-1 py-0.5 text-[10px] text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {analysis.breadth} dirs
          </span>
        ),
        evidenceContent: <LeverageEvidence pr={pr} analysis={analysis} />,
      };
    })
    .sort((a, b) => {
      const aPr = engineer.topPRs.find((p) => p.url === a.url);
      const bPr = engineer.topPRs.find((p) => p.url === b.url);
      const aB = aPr ? analyzeLeveragePR(aPr).breadth : 0;
      const bB = bPr ? analyzeLeveragePR(bPr).breadth : 0;
      return bB - aB;
    });
}

export function getEngineerReliabilityItems(engineer: Engineer): TopItem[] {
  const tagged = collectTaggedReliabilityPRs(
    engineer.topPRs,
    engineer.login,
    engineer.avatarUrl,
  );
  return tagged.map(({ pr, analysis }) => ({
    id: pr.url,
    title: pr.title,
    url: pr.url,
    author: engineer.login,
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
    evidenceContent: <ReliabilityEvidence pr={pr} analysis={analysis} />,
  }));
}

export function getEngineerLeadershipItems(
  engineer: Engineer,
  allInitiatives: InitiativeSummary[],
): TopItem[] {
  const rfcItems = collectLeadershipPRs(
    engineer.topPRs,
    engineer.login,
    engineer.avatarUrl,
  );
  const driven = engineerInitiatives(engineer.login, allInitiatives);

  const rfcTopItems: TopItem[] = rfcItems.map(({ pr }) => ({
    id: `rfc-${pr.url}`,
    title: pr.title,
    url: pr.url,
    author: engineer.login,
    mergedAt: pr.mergedAt,
    badge: (
      <span className="shrink-0 rounded bg-purple-50 px-1 py-0.5 text-[10px] text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
        RFC
      </span>
    ),
    evidenceContent: <LeadershipPREvidence pr={pr} />,
  }));

  const initTopItems: TopItem[] = driven.map((init) => ({
    id: `init-${init.issue.number}`,
    title: `#${init.issue.number}: ${init.issue.title}`,
    url: init.issue.url,
    author: init.driver,
    mergedAt: init.lastPRDate,
    badge: (
      <span className="shrink-0 rounded bg-indigo-50 px-1 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
        {init.prCount} PRs
      </span>
    ),
    evidenceContent: <InitiativeEvidence init={init} />,
  }));

  const combined = [...rfcTopItems, ...initTopItems];
  combined.sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());
  return combined;
}

export function getEngineerTeamImpactItems(engineer: Engineer): TopItem[] {
  const items = engineerTeamImpactPRs(engineer);
  return items.map(({ pr }) => ({
    id: pr.url,
    title: pr.title,
    url: pr.url,
    author: engineer.login,
    mergedAt: pr.mergedAt,
    badge: (
      <span className="shrink-0 rounded bg-slate-50 px-1 py-0.5 text-[10px] text-slate-700 dark:bg-slate-500/10 dark:text-slate-300">
        team
      </span>
    ),
    evidenceContent: <TeamImpactEvidence pr={pr} />,
  }));
}

export function getEngineerActivityItems(engineer: Engineer): TopItem[] {
  return [...engineer.topPRs]
    .sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime())
    .map((pr) => ({
      id: pr.url,
      title: pr.title,
      url: pr.url,
      author: engineer.login,
      mergedAt: pr.mergedAt,
      badge: (
        <span className="shrink-0 rounded bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
          +{pr.additions} −{pr.deletions}
        </span>
      ),
    }));
}
