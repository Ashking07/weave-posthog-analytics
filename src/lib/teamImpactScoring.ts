/**
 * Team Impact PR classification.
 *
 * PRs classified as TEAM_IMPACT (refactor, tech debt, onboarding, documentation).
 * These multiply team effectiveness rather than direct user value.
 */

import type { Engineer, TopPR } from "@/types";

export interface TaggedTeamImpactPR {
  pr: TopPR;
  author: string;
  authorAvatar: string;
}

export function isTeamImpactPR(pr: TopPR): boolean {
  return pr.classification?.buckets?.includes("TEAM_IMPACT") ?? false;
}

export function collectTeamImpactPRs(
  engineers: Engineer[],
  limit: number,
): TaggedTeamImpactPR[] {
  const all: TaggedTeamImpactPR[] = [];
  for (const eng of engineers) {
    for (const pr of eng.topPRs) {
      if (!isTeamImpactPR(pr)) continue;
      all.push({
        pr,
        author: eng.login,
        authorAvatar: eng.avatarUrl,
      });
    }
  }
  all.sort((a, b) => {
    const aSize = (a.pr.additions ?? 0) + (a.pr.deletions ?? 0);
    const bSize = (b.pr.additions ?? 0) + (b.pr.deletions ?? 0);
    return bSize - aSize;
  });
  return all.slice(0, limit);
}

export function engineerTeamImpactPRs(engineer: Engineer): TaggedTeamImpactPR[] {
  return engineer.topPRs
    .filter(isTeamImpactPR)
    .map((pr) => ({
      pr,
      author: engineer.login,
      authorAvatar: engineer.avatarUrl,
    }))
    .sort((a, b) => {
      const aSize = (a.pr.additions ?? 0) + (a.pr.deletions ?? 0);
      const bSize = (b.pr.additions ?? 0) + (b.pr.deletions ?? 0);
      return bSize - aSize;
    });
}
