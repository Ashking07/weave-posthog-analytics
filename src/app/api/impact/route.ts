/**
 * Impact API route – orchestrates GitHub fetch, metrics, and LLM insights.
 * Streams progress steps (NDJSON) then final result.
 * Server cache: s-maxage=600 for repeat requests.
 * Query params: repo (owner/name), top (5|10), token (optional user token)
 */

import { fetchMergedPRs } from "@/lib/github";
import { sinceDate, computeMetrics, WINDOW_DAYS } from "@/lib/impact-metrics";
import { getInsights } from "@/lib/llm-insights";
import { computeDoraProxies, prNodeToDoraPR } from "@/lib/doraMetrics";

const DEFAULT_REPO = "PostHog/posthog";
const CACHE_TTL_MS = 600 * 1000; // 10 min
const IMPACT_CACHE_VERSION = "v10"; // Bump when LLM prompt or scoring changes

const serverCache = new Map<string, { fetchedAt: number; data: object }>();

function getCacheKey(repo: string, top: number): string {
  return `impact:${IMPACT_CACHE_VERSION}:${repo}:${top}`;
}

function line(obj: object): string {
  return JSON.stringify(obj) + "\n";
}

function normalizeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/rate limit|403|secondary rate limit/i.test(message)) {
    return "GitHub rate limit exceeded. Add your own token (Settings → Developer settings → Personal access tokens) for higher limits.";
  }
  if (/401|Bad credentials/i.test(message)) {
    return "Invalid GitHub token. Clear and enter a new token.";
  }
  return message;
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

  const cacheKey = getCacheKey(repo, topLimit);
  const cached = serverCache.get(cacheKey);
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const cachedData = cached?.data as { insights?: Record<string, unknown> } | undefined;
  const cachedHasInsights = cachedData?.insights && Object.keys(cachedData.insights).length > 0;
  // Skip cache when we have OpenAI key but cached response has no insights (e.g. key was added after first load)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && !(hasOpenAIKey && !cachedHasInsights)) {
    return Response.json(cached.data, {
      headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=300" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const since = sinceDate(WINDOW_DAYS);
        const windowStart = new Date(since);

        controller.enqueue(encoder.encode(line({ type: "step_start", id: "fetch_prs", label: "Fetching merged PRs from GitHub…" })));
        const prs = await fetchMergedPRs(token, since, repo);
        controller.enqueue(encoder.encode(line({ type: "step_done", id: "fetch_prs" })));

        controller.enqueue(encoder.encode(line({ type: "step_start", id: "metrics", label: "Computing impact metrics…" })));
        const { engineers, prsCount, reviewsCount } = computeMetrics(prs, windowStart);
        const top = engineers.slice(0, topLimit);
        controller.enqueue(encoder.encode(line({ type: "step_done", id: "metrics" })));

        const doraPrs = prs.map(prNodeToDoraPR);
        const doraProxies = computeDoraProxies({ prs: doraPrs, windowDays: WINDOW_DAYS });

        const partialData = {
          generatedAt: new Date().toISOString(),
          windowDays: WINDOW_DAYS,
          repo,
          top,
          prsCount,
          reviewsCount,
          doraProxies,
        };
        controller.enqueue(encoder.encode(line({ type: "partial", data: partialData })));

        controller.enqueue(encoder.encode(line({ type: "step_start", id: "insights", label: "Generating AI insights…" })));
        const insights = await getInsights(top, since, repo, prsCount);
        if (process.env.NODE_ENV === "development") {
          console.log("[impact] LLM insights:", insights ? `${Object.keys(insights).length} engineers` : "null (check OPENAI_API_KEY or server logs)");
        }
        controller.enqueue(encoder.encode(line({ type: "step_done", id: "insights" })));

        const doneData = {
          ...partialData,
          generatedAt: new Date().toISOString(),
          insights: insights ?? undefined,
        };
        controller.enqueue(encoder.encode(line({ type: "done", data: doneData })));
        serverCache.set(cacheKey, { fetchedAt: Date.now(), data: doneData });
      } catch (err) {
        const message = normalizeError(err);
        console.error("Impact API error:", message);
        controller.enqueue(encoder.encode(line({ type: "error", error: message })));
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
