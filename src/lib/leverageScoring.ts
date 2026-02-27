/**
 * Leverage PR scoring and analysis.
 *
 * Leverage PRs are classified as LEVERAGE via pathRules/labels
 * (CI, tooling, shared libs, build, test infra).
 *
 * ⚠️ These are proxies based on file path patterns and labels.
 * They may miss leverage work that doesn't follow naming conventions.
 */

import type { TopPR } from "@/types";

const INFRA_PATH_RE =
  /\.(github|ci|circleci)\/(workflows|actions)|scripts\/|tooling\/|tools\/|build\//i;

export interface LeverageAnalysis {
  breadth: number;
  topLevelDirs: string[];
  infraTouch: boolean;
}

export interface ScoredLeveragePR {
  pr: TopPR;
  author: string;
  authorAvatar: string;
  analysis: LeverageAnalysis;
}

function topLevelDir(filePath: string): string {
  const parts = filePath.split("/");
  return parts[0] || filePath;
}

export function analyzeLeveragePR(pr: TopPR): LeverageAnalysis {
  const paths = pr.filePaths ?? [];
  const dirs = new Set(paths.map(topLevelDir));
  const infraTouch = paths.some((p) => INFRA_PATH_RE.test(p));

  return {
    breadth: dirs.size,
    topLevelDirs: [...dirs].sort(),
    infraTouch,
  };
}

export function isLeveragePR(pr: TopPR): boolean {
  return pr.classification?.buckets?.includes("LEVERAGE") ?? false;
}
