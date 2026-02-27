/**
 * Leadership analysis — RFC/design docs + initiative driving.
 *
 * Two dimensions:
 *   1) RFC/Design PRs: classified as LEADERSHIP (docs/rfcs, ADRs, proposals)
 *   2) Initiative driving (best-effort proxy):
 *      - An "initiative issue" is a GitHub issue linked by 2+ PRs, OR linked by
 *        a PR carrying an initiative label (epic, project, initiative, etc.)
 *      - "Driver" = most frequent PR author linked to that initiative.
 *        If tied, falls back to alphabetical login. We intentionally do NOT
 *        use issue author because we lack that data from the PR-centric query.
 *
 * ⚠️  Initiative linking is best-effort. It relies on GitHub's closing keywords
 * ("fixes #123") or explicit issue references in the PR. Initiatives tracked
 * outside GitHub issues (e.g. Linear, Jira) will not appear.
 */

import type { Engineer, TopPR, LinkedIssue } from "@/types";

// ── Configuration ───────────────────────────────────────────────────

const INITIATIVE_LABELS = new Set([
  "epic",
  "project",
  "initiative",
  "roadmap",
  "milestone",
  "meta",
  "tracking",
  "umbrella",
]);

// ── RFC / Design PRs ────────────────────────────────────────────────

export interface TaggedLeadershipPR {
  pr: TopPR;
  author: string;
  authorAvatar: string;
}

export function isLeadershipPR(pr: TopPR): boolean {
  return pr.classification?.buckets?.includes("LEADERSHIP") ?? false;
}

export function collectLeadershipPRs(
  prs: TopPR[],
  author: string,
  authorAvatar: string,
): TaggedLeadershipPR[] {
  return prs
    .filter(isLeadershipPR)
    .map((pr) => ({ pr, author, authorAvatar }));
}

// ── Initiative detection ────────────────────────────────────────────

export interface InitiativeSummary {
  issue: LinkedIssue;
  prCount: number;
  contributors: string[];
  firstPRDate: string;
  lastPRDate: string;
  driver: string;
  linkedPRs: { title: string; url: string; author: string; mergedAt: string }[];
}

interface PRWithAuthor {
  pr: TopPR;
  author: string;
}

function hasInitiativeLabel(pr: TopPR): boolean {
  return (pr.labels ?? []).some((l) => INITIATIVE_LABELS.has(l.toLowerCase()));
}

export function buildInitiatives(engineers: Engineer[]): InitiativeSummary[] {
  const issueMap = new Map<
    number,
    { issue: LinkedIssue; prs: PRWithAuthor[] }
  >();

  for (const eng of engineers) {
    for (const pr of eng.topPRs) {
      if (!pr.linkedIssues || pr.linkedIssues.length === 0) continue;
      for (const issue of pr.linkedIssues) {
        let entry = issueMap.get(issue.number);
        if (!entry) {
          entry = { issue, prs: [] };
          issueMap.set(issue.number, entry);
        }
        entry.prs.push({ pr, author: eng.login });
      }
    }
  }

  const initiatives: InitiativeSummary[] = [];

  for (const { issue, prs } of issueMap.values()) {
    const isInitiative =
      prs.length >= 2 || prs.some(({ pr }) => hasInitiativeLabel(pr));

    if (!isInitiative) continue;

    const dates = prs
      .map(({ pr }) => pr.mergedAt)
      .filter(Boolean)
      .sort();

    const authorFreq = new Map<string, number>();
    for (const { author } of prs) {
      authorFreq.set(author, (authorFreq.get(author) ?? 0) + 1);
    }
    let driver = "";
    let maxCount = 0;
    for (const [login, count] of authorFreq) {
      if (count > maxCount || (count === maxCount && login < driver)) {
        driver = login;
        maxCount = count;
      }
    }

    const contributors = [...new Set(prs.map(({ author }) => author))].sort();

    initiatives.push({
      issue,
      prCount: prs.length,
      contributors,
      firstPRDate: dates[0] ?? "",
      lastPRDate: dates[dates.length - 1] ?? "",
      driver,
      linkedPRs: prs.map(({ pr, author }) => ({
        title: pr.title,
        url: pr.url,
        author,
        mergedAt: pr.mergedAt,
      })),
    });
  }

  initiatives.sort((a, b) => b.prCount - a.prCount);
  return initiatives;
}

export function engineerInitiatives(
  login: string,
  allInitiatives: InitiativeSummary[],
): InitiativeSummary[] {
  return allInitiatives.filter((init) => init.driver === login);
}
