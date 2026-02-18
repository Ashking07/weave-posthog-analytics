/**
 * Impact API route – orchestrates GitHub fetch, quality mining, and LLM insights.
 * Query params: repo (owner/name), top (5|10), token (optional user token)
 */

import { NextResponse } from "next/server";
import { fetchMergedPRs, isBot } from "@/lib/github";
import { sinceDate, computeMetrics, WINDOW_DAYS } from "@/lib/impact-metrics";
import { getInsights } from "@/lib/llm-insights";
import { getQualitySignals } from "@/lib/quality-mining";

const DEFAULT_REPO = "PostHog/posthog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo")?.trim() || DEFAULT_REPO;
  const topParam = searchParams.get("top");
  const topLimit = topParam === "10" ? 10 : 5;
  const token =
    req.headers.get("x-github-token") ??
    searchParams.get("token") ??
    process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN required. Set env or pass X-GitHub-Token header / token param." },
      { status: 500 },
    );
  }

  try {
    const since = sinceDate(WINDOW_DAYS);
    const windowStart = new Date(since);
    const prs = await fetchMergedPRs(token, since, repo);

    const mergeShas: string[] = [];
    for (const pr of prs) {
      if (pr.author?.login && !isBot(pr.author.login) && pr.mergeCommit?.oid) {
        mergeShas.push(pr.mergeCommit.oid);
      }
    }

    const { result: qualityResult, warning: qualityWarning } =
      await getQualitySignals(mergeShas, since, repo);

    const all = computeMetrics(prs, windowStart, qualityResult ?? null);
    const top = all.slice(0, topLimit);
    const insights = await getInsights(top, since, repo);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        windowDays: WINDOW_DAYS,
        repo,
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
