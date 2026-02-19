/**
 * Impact API route – orchestrates GitHub fetch, metrics, and LLM insights.
 * Streams progress steps (NDJSON) then final result.
 * Query params: repo (owner/name), top (5|10), token (optional user token)
 */

import { fetchMergedPRs } from "@/lib/github";
import { sinceDate, computeMetrics, WINDOW_DAYS } from "@/lib/impact-metrics";
import { getInsights } from "@/lib/llm-insights";

const DEFAULT_REPO = "facebook/react";

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

        controller.enqueue(encoder.encode(line( { type: "step_start", id: "metrics", label: "Computing impact metrics…" })));
        const all = computeMetrics(prs, windowStart);
        const top = all.slice(0, topLimit);
        controller.enqueue(encoder.encode(line( { type: "step_done", id: "metrics" })));

        // Send partial result immediately so user sees table ~5–10s faster
        controller.enqueue(encoder.encode(line( {
          type: "partial",
          data: {
            generatedAt: new Date().toISOString(),
            windowDays: WINDOW_DAYS,
            repo,
            top,
          },
        })));

        controller.enqueue(encoder.encode(line( { type: "step_start", id: "insights", label: "Generating AI insights…" })));
        const insights = await getInsights(top, since, repo);
        controller.enqueue(encoder.encode(line( { type: "step_done", id: "insights" })));

        controller.enqueue(encoder.encode(line( {
          type: "done",
          data: {
            generatedAt: new Date().toISOString(),
            windowDays: WINDOW_DAYS,
            repo,
            top,
            insights: insights ?? undefined,
          },
        })));
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
