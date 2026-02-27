import { describe, it, expect } from "vitest";
import { computeMetrics } from "../impact-metrics";
import type { PRNode } from "@/types";

function makePR(overrides: Partial<PRNode> = {}): PRNode {
  return {
    title: overrides.title ?? "feat: test PR",
    url: overrides.url ?? "https://github.com/org/repo/pull/1",
    body: overrides.body ?? "PR body text",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    mergedAt: overrides.mergedAt ?? "2025-01-02T00:00:00Z",
    mergeCommit: overrides.mergeCommit ?? { oid: "abc123" },
    additions: overrides.additions ?? 100,
    deletions: overrides.deletions ?? 20,
    author: overrides.author ?? { login: "alice", avatarUrl: "https://example.com/a.png" },
    labels: overrides.labels ?? { nodes: [{ name: "feature" }] },
    files: overrides.files ?? { nodes: [{ path: "src/index.ts" }, { path: "src/utils.ts" }] },
    closingIssuesReferences: overrides.closingIssuesReferences ?? {
      nodes: [{ number: 42, title: "Add auth", url: "https://github.com/org/repo/issues/42" }],
    },
    reviewThreads: overrides.reviewThreads ?? { totalCount: 2 },
    comments: overrides.comments ?? { totalCount: 4 },
    commits: overrides.commits ?? {
      totalCount: 3,
      nodes: [
        { commit: { authoredDate: "2025-01-01T00:00:00Z", committedDate: "2025-01-01T01:00:00Z" } },
      ],
    },
    reactions: overrides.reactions ?? {
      totalCount: 3,
      nodes: [{ content: "THUMBS_UP" }, { content: "THUMBS_UP" }, { content: "HEART" }],
    },
    reviews: overrides.reviews ?? { nodes: [] },
  };
}

describe("PR DTO evidence fields", () => {
  const windowStart = new Date("2024-12-01T00:00:00Z");

  it("TopPR includes labels from the PR", () => {
    const result = computeMetrics([makePR({ labels: { nodes: [{ name: "bug" }, { name: "infra" }] } })], windowStart);
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.labels).toEqual(["bug", "infra"]);
  });

  it("TopPR includes file paths", () => {
    const result = computeMetrics(
      [makePR({ files: { nodes: [{ path: "src/auth.ts" }, { path: ".github/workflows/ci.yml" }] } })],
      windowStart,
    );
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.filePaths).toEqual(["src/auth.ts", ".github/workflows/ci.yml"]);
  });

  it("TopPR includes linked issues", () => {
    const result = computeMetrics([makePR()], windowStart);
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.linkedIssues).toHaveLength(1);
    expect(topPR.linkedIssues![0].number).toBe(42);
    expect(topPR.linkedIssues![0].title).toBe("Add auth");
  });

  it("TopPR includes review thread and comment counts", () => {
    const result = computeMetrics(
      [makePR({
        reviewThreads: { totalCount: 5 },
        reviews: {
          nodes: [
            { author: { login: "bob" }, submittedAt: "2025-01-01T12:00:00Z", state: "COMMENTED", comments: { totalCount: 3 } },
            { author: { login: "carol" }, submittedAt: "2025-01-01T13:00:00Z", state: "APPROVED", comments: { totalCount: 1 } },
          ],
        },
      })],
      windowStart,
    );
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.reviewThreadCount).toBe(5);
    expect(topPR.reviewCommentCount).toBe(4);
  });

  it("TopPR includes commit timeline", () => {
    const result = computeMetrics(
      [makePR({
        commits: {
          totalCount: 5,
          nodes: [
            { commit: { authoredDate: "2025-01-01T00:00:00Z", committedDate: "2025-01-01T08:00:00Z" } },
          ],
        },
      })],
      windowStart,
    );
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.commitTimeline).toBeDefined();
    expect(topPR.commitTimeline!.commitCount).toBe(5);
    expect(topPR.commitTimeline!.firstCommitAt).toBe("2025-01-01T00:00:00Z");
  });

  it("TopPR includes reactions summary", () => {
    const result = computeMetrics([makePR()], windowStart);
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.reactions).toBeDefined();
    expect(topPR.reactions!.totalCount).toBe(3);
    expect(topPR.reactions!.byType.THUMBS_UP).toBe(2);
    expect(topPR.reactions!.byType.HEART).toBe(1);
  });

  it("TopPR includes classification from labels + title + filePaths", () => {
    const result = computeMetrics(
      [makePR({
        title: "feat: add monitoring",
        labels: { nodes: [{ name: "infrastructure" }] },
        files: { nodes: [{ path: ".github/workflows/deploy.yml" }] },
      })],
      windowStart,
    );
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.classification).toBeDefined();
    expect(topPR.classification!.buckets).toContain("OUTCOME");
    expect(topPR.classification!.buckets).toContain("RELIABILITY");
    expect(topPR.classification!.buckets).toContain("LEVERAGE");
    expect(topPR.classification!.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("TopPR body field is stored when present", () => {
    const result = computeMetrics(
      [makePR({ body: "This fixes the SLO dashboard" })],
      windowStart,
    );
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.body).toBe("This fixes the SLO dashboard");
  });

  it("handles PR with no new fields (backfill compatibility)", () => {
    const legacyPR = {
      title: "old change",
      url: "https://github.com/org/repo/pull/99",
      createdAt: "2025-01-01T00:00:00Z",
      mergedAt: "2025-01-02T00:00:00Z",
      mergeCommit: { oid: "def456" },
      additions: 10,
      deletions: 5,
      author: { login: "dave", avatarUrl: "" },
      reviews: { nodes: [] },
    } as unknown as PRNode;

    const result = computeMetrics([legacyPR], windowStart);
    const topPR = result.engineers[0].topPRs[0];
    expect(topPR.title).toBe("old change");
    expect(topPR.filePaths).toBeUndefined();
    expect(topPR.linkedIssues).toBeUndefined();
    expect(topPR.commitTimeline).toBeDefined();
    expect(topPR.commitTimeline!.commitCount).toBe(0);
  });
});

describe("classifyPullRequest body matching", () => {
  it("classifies by body keyword when title has no match", async () => {
    const { classifyPullRequest } = await import("../impactTaxonomy");
    const result = classifyPullRequest({
      title: "misc update",
      body: "This addresses the SLO regression in production",
    });
    expect([...result.buckets]).toContain("RELIABILITY");
    expect(result.reasons.some((r: string) => r.includes("Body matches"))).toBe(true);
  });
});
