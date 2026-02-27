import { describe, it, expect } from "vitest";
import {
  classifyPullRequest,
  ImpactBucket,
  type ClassifiablePR,
} from "../impactTaxonomy";

function classify(pr: ClassifiablePR) {
  const result = classifyPullRequest(pr);
  return {
    buckets: [...result.buckets],
    reasons: result.reasons,
  };
}

describe("classifyPullRequest", () => {
  describe("label-based classification", () => {
    it("classifies a feature label as OUTCOME", () => {
      const result = classify({ title: "Some PR", labels: ["feature"] });
      expect(result.buckets).toContain(ImpactBucket.OUTCOME);
      expect(result.reasons.some((r) => r.includes('Label "feature"'))).toBe(true);
    });

    it("classifies an infra label as RELIABILITY", () => {
      const result = classify({ title: "Update config", labels: ["infrastructure"] });
      expect(result.buckets).toContain(ImpactBucket.RELIABILITY);
      expect(result.reasons.some((r) => r.includes("Label"))).toBe(true);
    });

    it("classifies a chore label as ACTIVITY_ONLY", () => {
      const result = classify({ title: "Bump version", labels: ["chore"] });
      expect(result.buckets).toContain(ImpactBucket.ACTIVITY_ONLY);
    });
  });

  describe("path-based classification", () => {
    it("classifies CI workflow paths as LEVERAGE", () => {
      const result = classify({
        title: "Update CI",
        filePaths: [".github/workflows/ci.yml"],
      });
      expect(result.buckets).toContain(ImpactBucket.LEVERAGE);
      expect(result.reasons.some((r) => r.includes("CI/workflows"))).toBe(true);
    });

    it("classifies migration paths as RELIABILITY", () => {
      const result = classify({
        title: "Add migration",
        filePaths: ["db/migrations/0042_add_column.sql"],
      });
      expect(result.buckets).toContain(ImpactBucket.RELIABILITY);
      expect(result.reasons.some((r) => r.includes("infra/migrations"))).toBe(true);
    });

    it("classifies RFC docs as LEADERSHIP", () => {
      const result = classify({
        title: "RFC: new auth flow",
        filePaths: ["docs/rfcs/0012-auth-flow.md"],
      });
      expect(result.buckets).toContain(ImpactBucket.LEADERSHIP);
      expect(result.reasons.some((r) => r.includes("design docs/RFCs"))).toBe(true);
    });
  });

  describe("keyword-based classification", () => {
    it("classifies feat: prefix as OUTCOME", () => {
      const result = classify({ title: "feat: add dark mode toggle" });
      expect(result.buckets).toContain(ImpactBucket.OUTCOME);
      expect(result.reasons.some((r) => r.includes("feature keyword"))).toBe(true);
    });

    it("classifies hotfix as RELIABILITY", () => {
      const result = classify({ title: "hotfix: fix production crash" });
      expect(result.buckets).toContain(ImpactBucket.RELIABILITY);
      expect(result.reasons.some((r) => r.includes("incident/hotfix"))).toBe(true);
    });

    it("classifies refactor as TEAM_IMPACT", () => {
      const result = classify({ title: "refactor: extract shared utils" });
      expect(result.buckets).toContain(ImpactBucket.TEAM_IMPACT);
      expect(result.reasons.some((r) => r.includes("refactor/debt"))).toBe(true);
    });

    it("classifies chore/deps as ACTIVITY_ONLY", () => {
      const result = classify({ title: "chore: bump dependencies" });
      expect(result.buckets).toContain(ImpactBucket.ACTIVITY_ONLY);
      expect(result.reasons.some((r) => r.includes("chore/deps"))).toBe(true);
    });
  });

  describe("multiple matches", () => {
    it("returns multiple buckets when label + keyword match different buckets", () => {
      const result = classify({
        title: "feat: add monitoring dashboard",
        labels: ["infrastructure"],
      });
      expect(result.buckets).toContain(ImpactBucket.OUTCOME);
      expect(result.buckets).toContain(ImpactBucket.RELIABILITY);
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it("returns multiple buckets when path + keyword match different buckets", () => {
      const result = classify({
        title: "fix: update CI workflow for flaky tests",
        filePaths: [".github/workflows/test.yml"],
      });
      expect(result.buckets).toContain(ImpactBucket.OUTCOME);
      expect(result.buckets).toContain(ImpactBucket.LEVERAGE);
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("default fallback", () => {
    it("returns ACTIVITY_ONLY when no rules match", () => {
      const result = classify({ title: "misc update" });
      expect(result.buckets).toEqual([ImpactBucket.ACTIVITY_ONLY]);
      expect(result.reasons).toEqual(["No rules matched → ACTIVITY_ONLY (default)"]);
    });
  });
});
