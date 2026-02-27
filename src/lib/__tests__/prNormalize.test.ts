import { describe, it, expect } from "vitest";
import { normalizePRNode } from "../prNormalize";
import type { PRNode } from "@/types";

describe("normalizePRNode", () => {
  it("fills all defaults for an empty object", () => {
    const pr = normalizePRNode({});

    expect(pr.title).toBe("");
    expect(pr.url).toBe("");
    expect(pr.body).toBe("");
    expect(pr.createdAt).toBe("");
    expect(pr.mergedAt).toBe("");
    expect(pr.mergeCommit).toBeNull();
    expect(pr.additions).toBe(0);
    expect(pr.deletions).toBe(0);
    expect(pr.author).toBeNull();
    expect(pr.labels).toEqual({ nodes: [] });
    expect(pr.files).toEqual({ nodes: [] });
    expect(pr.closingIssuesReferences).toEqual({ nodes: [] });
    expect(pr.reviewThreads).toEqual({ totalCount: 0 });
    expect(pr.comments).toEqual({ totalCount: 0 });
    expect(pr.commits).toEqual({ nodes: [], totalCount: 0 });
    expect(pr.reactions).toEqual({ totalCount: 0, nodes: [] });
    expect(pr.reviews).toEqual({ nodes: [] });
  });

  it("preserves existing fields when present", () => {
    const input: Partial<PRNode> = {
      title: "feat: add auth",
      url: "https://github.com/org/repo/pull/1",
      body: "This PR adds auth.",
      additions: 100,
      deletions: 20,
      labels: { nodes: [{ name: "feature" }] },
      files: { nodes: [{ path: "src/auth.ts" }] },
      closingIssuesReferences: {
        nodes: [{ number: 42, title: "Auth needed", url: "https://github.com/org/repo/issues/42" }],
      },
      reviewThreads: { totalCount: 3 },
      comments: { totalCount: 5 },
      commits: {
        totalCount: 2,
        nodes: [
          { commit: { authoredDate: "2025-01-01T00:00:00Z", committedDate: "2025-01-01T01:00:00Z" } },
        ],
      },
      reactions: {
        totalCount: 2,
        nodes: [{ content: "THUMBS_UP" }, { content: "HEART" }],
      },
    };

    const pr = normalizePRNode(input);

    expect(pr.title).toBe("feat: add auth");
    expect(pr.body).toBe("This PR adds auth.");
    expect(pr.additions).toBe(100);
    expect(pr.labels.nodes).toHaveLength(1);
    expect(pr.files.nodes).toHaveLength(1);
    expect(pr.files.nodes[0].path).toBe("src/auth.ts");
    expect(pr.closingIssuesReferences.nodes).toHaveLength(1);
    expect(pr.closingIssuesReferences.nodes[0].number).toBe(42);
    expect(pr.reviewThreads.totalCount).toBe(3);
    expect(pr.comments.totalCount).toBe(5);
    expect(pr.commits.totalCount).toBe(2);
    expect(pr.reactions.totalCount).toBe(2);
  });

  it("handles legacy PRNode without new fields (backfill)", () => {
    const legacy = {
      title: "old PR",
      url: "https://github.com/org/repo/pull/99",
      createdAt: "2024-01-01T00:00:00Z",
      mergedAt: "2024-01-02T00:00:00Z",
      mergeCommit: { oid: "abc123" },
      additions: 50,
      deletions: 10,
      author: { login: "alice", avatarUrl: "https://example.com/alice.png" },
      reviews: {
        nodes: [
          { author: { login: "bob" }, submittedAt: "2024-01-01T12:00:00Z", state: "APPROVED" },
        ],
      },
    } as Partial<PRNode>;

    const pr = normalizePRNode(legacy);

    expect(pr.title).toBe("old PR");
    expect(pr.author?.login).toBe("alice");
    expect(pr.body).toBe("");
    expect(pr.files).toEqual({ nodes: [] });
    expect(pr.closingIssuesReferences).toEqual({ nodes: [] });
    expect(pr.reviewThreads).toEqual({ totalCount: 0 });
    expect(pr.commits).toEqual({ nodes: [], totalCount: 0 });
    expect(pr.reactions).toEqual({ totalCount: 0, nodes: [] });
    expect(pr.reviews.nodes).toHaveLength(1);
  });
});
