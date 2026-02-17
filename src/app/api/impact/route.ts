import { NextResponse } from "next/server";
import { getInsights } from "@/lib/llm-insights";
import { getQualitySignals } from "@/lib/quality-mining";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PRNode {
  title: string;
  url: string;
  createdAt: string;
  mergedAt: string;
  mergeCommit: { oid: string } | null;
  additions: number;
  deletions: number;
  author: { login: string; avatarUrl: string } | null;
  reviews: { nodes: ReviewNode[] };
}

interface ReviewNode {
  author: { login: string } | null;
  submittedAt: string;
  state: string;
}

interface SearchResult {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: PRNode[];
  };
}

interface EngineerBreakdown {
  pr_points: number;
  review_points: number;
}

interface TopPR {
  title: string;
  url: string;
  mergedAt: string;
  additions: number;
  deletions: number;
}

interface QualitySignals {
  prs_with_tests: number;
  total_prs_with_merge_commit_found: number;
  test_touch_ratio: number | null;
}

interface Engineer {
  login: string;
  avatarUrl: string;
  total: number;
  breakdown: EngineerBreakdown;
  merged_prs: number;
  reviews_given: number;
  medianMergeDays: number;
  quality: QualitySignals | null;
  topPRs: TopPR[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GITHUB_GQL = "https://api.github.com/graphql";
const BOT_RE = /(dependabot|github-actions|renovate|bot|app$|apps$)/i
const MAX_PRS = 300;
const PAGE_SIZE = 50;
const WINDOW_DAYS = 90;

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const QUERY = `
query MergedPRs($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        title
        url
        createdAt
        mergedAt
        mergeCommit { oid }
        additions
        deletions
        author { login avatarUrl }
        reviews(first: 50) {
          nodes {
            author { login }
            submittedAt
            state
          }
        }
      }
    }
  }
}
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBot(login: string): boolean {
  return BOT_RE.test(login);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sinceDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function graphql(
  token: string,
  variables: Record<string, unknown>,
): Promise<SearchResult> {
  const res = await fetch(GITHUB_GQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { data?: SearchResult; errors?: unknown[] };
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as SearchResult;
}

// ---------------------------------------------------------------------------
// Core: fetch all merged PRs with pagination
// ---------------------------------------------------------------------------

async function fetchMergedPRs(token: string, since: string): Promise<PRNode[]> {
  const searchQuery = `repo:PostHog/posthog is:pr is:merged merged:>${since}`;
  const prs: PRNode[] = [];
  let after: string | null = null;

  while (prs.length < MAX_PRS) {
    const remaining = MAX_PRS - prs.length;
    const first = Math.min(PAGE_SIZE, remaining);

    const data = await graphql(token, { searchQuery, first, after });
    const nodes = data.search.nodes.filter((n) => n.mergedAt); // filter non-PR union noise
    prs.push(...nodes);

    if (!data.search.pageInfo.hasNextPage || !data.search.pageInfo.endCursor) {
      break;
    }
    after = data.search.pageInfo.endCursor;
  }

  return prs.slice(0, MAX_PRS);
}

// ---------------------------------------------------------------------------
// Metric computation
// ---------------------------------------------------------------------------

function computeQualityForEngineer(
  prs: PRNode[],
  quality: { touchedTests: Record<string, boolean | null> },
): QualitySignals {
  let prsWithTests = 0;
  let totalFound = 0;
  for (const pr of prs) {
    const sha = pr.mergeCommit?.oid?.toLowerCase();
    if (!sha) continue;
    const touched = quality.touchedTests[sha];
    if (touched === true || touched === false) {
      totalFound++;
      if (touched) prsWithTests++;
    }
  }
  return {
    prs_with_tests: prsWithTests,
    total_prs_with_merge_commit_found: totalFound,
    test_touch_ratio: totalFound > 0 ? Math.round((prsWithTests / totalFound) * 100) / 100 : null,
  };
}

function computeMetrics(
  prs: PRNode[],
  windowStart: Date,
  qualityResult: { touchedTests: Record<string, boolean | null> } | null,
): Engineer[] {
  const authorMap = new Map<
    string,
    {
      avatarUrl: string;
      prs: PRNode[];
      reviewsGiven: number;
    }
  >();

  const ensure = (login: string, avatarUrl = "") => {
    if (!authorMap.has(login)) {
      authorMap.set(login, { avatarUrl, prs: [], reviewsGiven: 0 });
    }
    const entry = authorMap.get(login)!;
    if (avatarUrl && !entry.avatarUrl) entry.avatarUrl = avatarUrl;
    return entry;
  };

  for (const pr of prs) {
    const prAuthor = pr.author?.login;
    if (!prAuthor || isBot(prAuthor)) continue;

    const entry = ensure(prAuthor, pr.author?.avatarUrl ?? "");
    entry.prs.push(pr);

    // Reviews given (exclude self-reviews, must be in window)
    for (const review of pr.reviews.nodes) {
      const reviewer = review.author?.login;
      if (!reviewer || isBot(reviewer)) continue;
      if (reviewer === prAuthor) continue; // self-review
      const submittedAt = new Date(review.submittedAt);
      if (submittedAt < windowStart) continue;

      const reviewerEntry = ensure(reviewer);
      reviewerEntry.reviewsGiven += 1;
    }
  }

  const engineers: Engineer[] = [];

  for (const [login, data] of authorMap) {
    const merged_prs = data.prs.length;

    // pr_points = merged_prs * 3 + Σ log1p(min(add+del, 2000))
    const codeSizeScore = data.prs.reduce((sum, pr) => {
      const linesChanged = Math.min(pr.additions + pr.deletions, 2000);
      return sum + Math.log1p(linesChanged);
    }, 0);
    const pr_points = merged_prs * 3 + codeSizeScore;

    // review_points = reviews_given * 1.2
    const review_points = data.reviewsGiven * 1.2;

    const total = pr_points + review_points;

    // Median time-to-merge in days (mergedAt - createdAt from PR timestamps; context only, not scored)
    const mergeDays = data.prs.map((pr) => {
      const created = new Date(pr.createdAt).getTime();
      const merged = new Date(pr.mergedAt).getTime();
      return (merged - created) / 86_400_000; // ms → days
    });
    const medianMergeDays = median(mergeDays); // raw days; round in UI

    // Top 3 most recent merged PRs
    const topPRs: TopPR[] = [...data.prs]
      .sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime())
      .slice(0, 3)
      .map(({ title, url, mergedAt, additions, deletions }) => ({
        title,
        url,
        mergedAt,
        additions,
        deletions,
      }));

    const quality = qualityResult
      ? computeQualityForEngineer(data.prs, qualityResult)
      : null;

    engineers.push({
      login,
      avatarUrl: data.avatarUrl,
      total: Math.round(total * 100) / 100,
      breakdown: {
        pr_points: Math.round(pr_points * 100) / 100,
        review_points: Math.round(review_points * 100) / 100,
      },
      merged_prs,
      reviews_given: data.reviewsGiven,
      medianMergeDays,
      quality,
      topPRs,
    });
  }

  engineers.sort((a, b) => b.total - a.total);
  return engineers;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN environment variable is not set" },
      { status: 500 },
    );
  }

  try {
    const since = sinceDate(WINDOW_DAYS);
    const windowStart = new Date(since);
    const prs = await fetchMergedPRs(token, since);

    // Collect merge commit SHAs from non-bot PRs for quality mining
    const mergeShas: string[] = [];
    for (const pr of prs) {
      if (pr.author?.login && !isBot(pr.author.login) && pr.mergeCommit?.oid) {
        mergeShas.push(pr.mergeCommit.oid);
      }
    }

    const { result: qualityResult, warning: qualityWarning } = getQualitySignals(
      mergeShas,
      since,
    );

    const top = computeMetrics(prs, windowStart, qualityResult ?? null);
    const insights = await getInsights(top.slice(0, 5), since);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        windowDays: WINDOW_DAYS,
        qualityWarning: qualityWarning ?? undefined,
        top,
        insights: insights ?? undefined,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=600, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Impact API error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
