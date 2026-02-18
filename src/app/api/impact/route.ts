/**
 * Impact API route – orchestrates GitHub fetch, quality mining, and LLM insights.
 * Streams progress steps (NDJSON) then final result.
 * Query params: repo (owner/name), top (5|10), token (optional user token)
 */

import { fetchMergedPRs, isBot } from "@/lib/github";
import { sinceDate, computeMetrics, WINDOW_DAYS } from "@/lib/impact-metrics";
import { getInsights } from "@/lib/llm-insights";
import { getQualitySignals } from "@/lib/quality-mining";

const DEFAULT_REPO = "PostHog/posthog";

function line(obj: object): string {
  return JSON.stringify(obj) + "\n";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo")?.trim() || DEFAULT_REPO;
  const topParam = searchParams.get("top");
  const topLimit = topParam === "10" ? 10 : 5;
  const headerToken = req.headers.get("x-github-token");
  const envToken = process.env.GITHUB_TOKEN;
  const token = headerToken ?? envToken;

  if (process.env.NODE_ENV === "development") {
    console.log("[impact] Token source:", headerToken ? "user (X-GitHub-Token header)" : envToken ? "server (GITHUB_TOKEN env)" : "none");
  }

  if (!token) {
    return Response.json(
      { error: "GITHUB_TOKEN required. Set env or pass X-GitHub-Token header." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const since = sinceDate(WINDOW_DAYS);
        const windowStart = new Date(since);

        controller.enqueue(encoder.encode(line( { type: "step_start", id: "fetch_prs", label: "Fetching merged PRs from GitHub…" })));
        const prs = await fetchMergedPRs(token, since, repo);
        controller.enqueue(encoder.encode(line( { type: "step_done", id: "fetch_prs" })));

        const mergeShas: string[] = [];
        for (const pr of prs) {
          if (pr.author?.login && !isBot(pr.author.login) && pr.mergeCommit?.oid) {
            mergeShas.push(pr.mergeCommit.oid);
          }
        }

        controller.enqueue(encoder.encode(line( { type: "step_start", id: "quality", label: "Analyzing test coverage…" })));
        const { result: qualityResult, warning: qualityWarning } =
          await getQualitySignals(mergeShas, since, repo);
        controller.enqueue(encoder.encode(line( { type: "step_done", id: "quality" })));

        controller.enqueue(encoder.encode(line( { type: "step_start", id: "metrics", label: "Computing impact metrics…" })));
        const all = computeMetrics(prs, windowStart, qualityResult ?? null);
        const top = all.slice(0, topLimit);
        controller.enqueue(encoder.encode(line( { type: "step_done", id: "metrics" })));

        controller.enqueue(encoder.encode(line( { type: "step_start", id: "insights", label: "Generating AI insights…" })));
        const insights = await getInsights(top, since, repo);
        controller.enqueue(encoder.encode(line( { type: "step_done", id: "insights" })));

        const result = {
          generatedAt: new Date().toISOString(),
          windowDays: WINDOW_DAYS,
          repo,
          qualityWarning: qualityWarning ?? undefined,
          top,
          insights: insights ?? undefined,
        };
        controller.enqueue(encoder.encode(line( { type: "done", data: result })));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Impact API error:", message);
        controller.enqueue(encoder.encode(line( { type: "error", error: message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
