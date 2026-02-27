import { describe, it, expect } from "vitest";
import {
  computeDoraProxies,
  type DoraPR,
  type DoraRelease,
  type DoraIssue,
} from "../doraMetrics";

// ── Fixtures ────────────────────────────────────────────────────────

function makePR(overrides: Partial<DoraPR> = {}): DoraPR {
  return {
    title: overrides.title ?? "feat: add feature",
    url: overrides.url ?? "https://github.com/org/repo/pull/1",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    mergedAt: overrides.mergedAt ?? "2025-01-02T00:00:00Z",
    labels: overrides.labels ?? [],
    firstCommitAt: overrides.firstCommitAt ?? null,
  };
}

function makeRelease(overrides: Partial<DoraRelease> = {}): DoraRelease {
  return {
    tagName: overrides.tagName ?? "v1.0.0",
    createdAt: overrides.createdAt ?? "2025-01-02T00:00:00Z",
    url: overrides.url ?? "https://github.com/org/repo/releases/tag/v1.0.0",
  };
}

function makeIssue(overrides: Partial<DoraIssue> = {}): DoraIssue {
  return {
    number: overrides.number ?? 1,
    title: overrides.title ?? "Bug report",
    labels: overrides.labels ?? [],
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    closedAt: overrides.closedAt ?? null,
  };
}

// ── Lead Time ───────────────────────────────────────────────────────

describe("Lead Time for Changes", () => {
  it("uses commit_to_merge when >=50% PRs have firstCommitAt", () => {
    const prs = [
      makePR({ firstCommitAt: "2025-01-01T00:00:00Z", mergedAt: "2025-01-01T12:00:00Z" }),
      makePR({ firstCommitAt: "2025-01-02T00:00:00Z", mergedAt: "2025-01-02T06:00:00Z" }),
    ];
    const result = computeDoraProxies({ prs, windowDays: 30 });

    expect(result.leadTime).not.toBeNull();
    expect(result.leadTime!.method).toBe("commit_to_merge");
    expect(result.leadTime!.sampleSize).toBe(2);
    expect(result.leadTime!.medianHours).toBeGreaterThan(0);
    expect(result.leadTime!.p75Hours).toBeGreaterThanOrEqual(result.leadTime!.medianHours);
  });

  it("falls back to created_to_merge when <50% have firstCommitAt", () => {
    const prs = [
      makePR({ createdAt: "2025-01-01T00:00:00Z", mergedAt: "2025-01-02T00:00:00Z" }),
      makePR({ createdAt: "2025-01-03T00:00:00Z", mergedAt: "2025-01-04T00:00:00Z" }),
    ];
    const result = computeDoraProxies({ prs, windowDays: 30 });

    expect(result.leadTime).not.toBeNull();
    expect(result.leadTime!.method).toBe("created_to_merge");
    expect(result.leadTime!.medianHours).toBe(24);
  });

  it("returns null with no PRs", () => {
    const result = computeDoraProxies({ prs: [], windowDays: 30 });
    expect(result.leadTime).toBeNull();
  });
});

// ── Deployment Frequency ────────────────────────────────────────────

describe("Deployment Frequency", () => {
  it("uses releases when available", () => {
    const releases = [
      makeRelease({ createdAt: "2025-01-01T00:00:00Z" }),
      makeRelease({ createdAt: "2025-01-08T00:00:00Z" }),
      makeRelease({ createdAt: "2025-01-15T00:00:00Z" }),
    ];
    const result = computeDoraProxies({
      prs: [makePR()],
      releases,
      windowDays: 30,
    });

    expect(result.deployFreq).not.toBeNull();
    expect(result.deployFreq!.method).toBe("releases");
    expect(result.deployFreq!.totalDeploys).toBe(3);
    expect(result.deployFreq!.perWeek).toBeCloseTo(0.7, 1);
  });

  it("falls back to merge frequency when no releases", () => {
    const prs = [makePR(), makePR(), makePR(), makePR()];
    const result = computeDoraProxies({ prs, windowDays: 14 });

    expect(result.deployFreq).not.toBeNull();
    expect(result.deployFreq!.method).toBe("merge_frequency");
    expect(result.deployFreq!.totalDeploys).toBe(4);
    expect(result.deployFreq!.perWeek).toBe(2);
  });

  it("returns null with no PRs and no releases", () => {
    const result = computeDoraProxies({ prs: [], windowDays: 30 });
    expect(result.deployFreq).toBeNull();
  });
});

// ── Change Failure Rate ─────────────────────────────────────────────

describe("Change Failure Rate", () => {
  it("detects revert PRs following a deploy within the window", () => {
    const prs = [
      makePR({ title: "feat: ship it", mergedAt: "2025-01-01T00:00:00Z" }),
      makePR({ title: "revert: undo ship", mergedAt: "2025-01-02T00:00:00Z" }),
      makePR({ title: "feat: another thing", mergedAt: "2025-01-10T00:00:00Z" }),
    ];
    const result = computeDoraProxies({ prs, windowDays: 30 });

    expect(result.changeFailureRate).not.toBeNull();
    expect(result.changeFailureRate!.totalDeploys).toBe(3);
    // first deploy has a revert within 7d, second (revert itself) has no follower, third has no follower
    expect(result.changeFailureRate!.failedDeploys).toBe(1);
    expect(result.changeFailureRate!.rate).toBeCloseTo(33.3, 0);
  });

  it("detects hotfix by label", () => {
    const prs = [
      makePR({ title: "feat: deploy", mergedAt: "2025-01-01T00:00:00Z" }),
      makePR({
        title: "fix: something",
        labels: ["hotfix"],
        mergedAt: "2025-01-03T00:00:00Z",
      }),
    ];
    const result = computeDoraProxies({ prs, windowDays: 30 });

    expect(result.changeFailureRate!.failedDeploys).toBe(1);
  });

  it("respects custom changeFailureWindowDays", () => {
    const prs = [
      makePR({ title: "feat: ship", mergedAt: "2025-01-01T00:00:00Z" }),
      makePR({ title: "revert: undo", mergedAt: "2025-01-10T00:00:00Z" }),
    ];
    // Default 7 days — revert is outside window
    const result7 = computeDoraProxies({ prs, windowDays: 30, changeFailureWindowDays: 7 });
    expect(result7.changeFailureRate!.failedDeploys).toBe(0);

    // 14 days — revert is inside window
    const result14 = computeDoraProxies({ prs, windowDays: 30, changeFailureWindowDays: 14 });
    expect(result14.changeFailureRate!.failedDeploys).toBe(1);
  });

  it("uses releases as deploy events when available", () => {
    const releases = [
      makeRelease({ createdAt: "2025-01-01T00:00:00Z" }),
      makeRelease({ createdAt: "2025-01-10T00:00:00Z" }),
    ];
    const prs = [
      makePR({ title: "feat: normal", mergedAt: "2025-01-01T12:00:00Z" }),
      makePR({ title: "hotfix: fix crash", mergedAt: "2025-01-02T00:00:00Z" }),
    ];
    const result = computeDoraProxies({ prs, releases, windowDays: 30 });

    expect(result.changeFailureRate!.totalDeploys).toBe(2);
    expect(result.changeFailureRate!.failedDeploys).toBe(1);
  });
});

// ── MTTR ────────────────────────────────────────────────────────────

describe("MTTR", () => {
  it("uses incident issues when >=3 exist", () => {
    const issues = [
      makeIssue({ labels: ["incident"], createdAt: "2025-01-01T00:00:00Z", closedAt: "2025-01-01T04:00:00Z" }),
      makeIssue({ labels: ["incident"], createdAt: "2025-01-05T00:00:00Z", closedAt: "2025-01-05T02:00:00Z" }),
      makeIssue({ labels: ["bug"], createdAt: "2025-01-10T00:00:00Z", closedAt: "2025-01-10T06:00:00Z" }),
    ];
    const result = computeDoraProxies({ prs: [makePR()], issues, windowDays: 30 });

    expect(result.mttr).not.toBeNull();
    expect(result.mttr!.method).toBe("incident_issues");
    expect(result.mttr!.sampleSize).toBe(3);
    expect(result.mttr!.medianHours).toBe(4);
  });

  it("falls back to hotfix resolution time when <3 incident issues", () => {
    const prs = [
      makePR({
        title: "hotfix: fix auth crash",
        createdAt: "2025-01-01T00:00:00Z",
        mergedAt: "2025-01-01T03:00:00Z",
      }),
      makePR({
        title: "revert: undo bad deploy",
        createdAt: "2025-01-05T00:00:00Z",
        mergedAt: "2025-01-05T01:00:00Z",
      }),
    ];
    const result = computeDoraProxies({ prs, windowDays: 30 });

    expect(result.mttr).not.toBeNull();
    expect(result.mttr!.method).toBe("hotfix_resolution");
    expect(result.mttr!.sampleSize).toBe(2);
    expect(result.mttr!.medianHours).toBe(2);
  });

  it("returns null when no hotfixes or incidents", () => {
    const prs = [
      makePR({ title: "feat: something" }),
      makePR({ title: "docs: update readme" }),
    ];
    const result = computeDoraProxies({ prs, windowDays: 30 });
    expect(result.mttr).toBeNull();
  });
});

// ── Notes ───────────────────────────────────────────────────────────

describe("Notes", () => {
  it("includes a note for each metric", () => {
    const prs = [
      makePR({
        title: "feat: ship",
        createdAt: "2025-01-01T00:00:00Z",
        mergedAt: "2025-01-02T00:00:00Z",
      }),
      makePR({
        title: "hotfix: fix",
        createdAt: "2025-01-03T00:00:00Z",
        mergedAt: "2025-01-03T02:00:00Z",
      }),
    ];
    const result = computeDoraProxies({ prs, windowDays: 30 });

    expect(result.notes.length).toBeGreaterThanOrEqual(4);
    expect(result.notes.some((n) => n.includes("Lead time"))).toBe(true);
    expect(result.notes.some((n) => n.includes("frequency"))).toBe(true);
    expect(result.notes.some((n) => n.includes("failure rate"))).toBe(true);
    expect(result.notes.some((n) => n.includes("MTTR"))).toBe(true);
  });
});
