/**
 * Optional LLM-based insights for top engineers.
 * Uses OpenAI Chat Completions API. Server-side only.
 * Cache: 6 hours in-memory + optional file in os.tmpdir().
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import OpenAI from "openai";
import type { Engineer } from "@/types";
import { getMix } from "@/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineerForInsights {
  login: string;
  merged_prs: number;
  reviews_given: number;
  rank: number;
  mix: string;
  pr_pct?: number;
  median_pr_size: number;
  median_merge_days: number;
  topPRs: { title: string; lines: number }[];
}

export interface EngineerInsight {
  summary: string;
  prTypes: Record<string, number>;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY = "llm-insights-v6";
const PR_TYPE_KEYS = ["bugfix", "feature", "refactor", "infra", "docs", "test", "other"];

// In-memory cache keyed by "since:repo"
const memoryCache = new Map<string, { fetchedAt: number; since: string; result: Record<string, EngineerInsight> }>();

function getCachePath(repo: string): string {
  const slug = repo.replace(/\//g, "-");
  return path.join(os.tmpdir(), `posthog-llm-insights-${CACHE_KEY}-${slug}.json`);
}

function loadFileCache(since: string, repo: string): Record<string, EngineerInsight> | null {
  try {
    const raw = fs.readFileSync(getCachePath(repo), "utf-8");
    const cached = JSON.parse(raw) as {
      fetchedAt: number;
      since: string;
      result: Record<string, EngineerInsight>;
    };
    if (cached.since !== since) return null;
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
    return cached.result;
  } catch {
    return null;
  }
}

function saveFileCache(since: string, repo: string, result: Record<string, EngineerInsight>): void {
  try {
    fs.writeFileSync(
      getCachePath(repo),
      JSON.stringify({ fetchedAt: Date.now(), since, result }, null, 0),
      "utf-8",
    );
  } catch {
    // Ignore
  }
}

function validateInsight(raw: unknown): EngineerInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const summary = o.summary;
  if (typeof summary !== "string" || summary.length > 500) return null;

  const prTypes: Record<string, number> = {};
  const pt = o.pr_types ?? o.prTypes;
  if (pt && typeof pt === "object") {
    for (const k of PR_TYPE_KEYS) {
      const v = (pt as Record<string, unknown>)[k];
      prTypes[k] = typeof v === "number" && v >= 0 ? Math.round(v) : 0;
    }
  }
  return { summary: summary.slice(0, 450), prTypes };
}

async function fetchFromOpenAI(
  engineers: EngineerForInsights[],
  apiKey: string,
  repo: string,
): Promise<Record<string, EngineerInsight>> {
  const input = engineers.map((e) => ({
    login: e.login,
    merged_prs: e.merged_prs,
    reviews_given: e.reviews_given,
    pr_titles: e.topPRs.map((p) => p.title),
    pr_sizes: e.topPRs.map((p) => p.lines),
  }));

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Write a short, human insight about each engineer for an OSS leader. The reader already sees PR titles and review counts in the UI—your job is to add perspective they don't have.

VOICE: Write like you're describing a colleague to a manager. Natural, varied, no templates. One engineer might get a theme ("Booking UX polish—fixed flicker when switching, made feature opt-in refresh seamless"), another a narrative ("Keeps the team unblocked while shipping reliability fixes").

WHAT TO DO:
- Synthesize their PRs into a theme or story. What area do they own? What problem are they solving?
- Be specific about impact. "Prevents flicker when switching bookings" not "improves UX"
- Vary structure. Don't start every summary the same way.
- Only mention reviews if it adds context (e.g. "heavily reviews, unblocking others" when notable)—don't repeat the number if it's redundant

AVOID:
- Listing PR titles in quotes. The UI shows them. Weave 1 into the narrative only if it helps.
- Generic filler: "improves UX", "code quality", "user experience" without specifics
- Robotic phrasing: "Shipped X, Y, and Z. Improves A and B. Unblocks team with N reviews."
- "Contributed significantly", "valuable contributor", "X merged PRs"

GOOD: "Booking flow polish—fixed the flicker when switching between bookings and made feature opt-in refresh without a full reload. The kind of work that reduces support tickets."
BAD: "Shipped 'fix: prevent BookingDetailsSheet flicker' and 'feat: re-render bookings page'. Improves user experience and code quality. Unblocks team with 25 reviews."

Reply with JSON only. Keys: engineer logins (lowercase). Values: { "summary": string (<=400 chars), "pr_types": { "bugfix": n, "feature": n, "refactor": n, "infra": n, "docs": n, "test": n, "other": n } }.`,
      },
      {
        role: "user",
        content: `Repo: ${repo}\n\nFor each engineer, summarize their impact based on their PR titles:\n\n${JSON.stringify(input, null, 2)}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2048,
    temperature: 0.5,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return {};

  // Strip markdown code blocks if present (GPT sometimes wraps despite response_format)
  let jsonStr = text;
  const codeBlock = text.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeBlock) jsonStr = codeBlock[1].trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (parseErr) {
    if (process.env.NODE_ENV === "development") {
      console.error("[llm-insights] JSON parse failed:", parseErr);
      console.error("[llm-insights] Raw response (first 500 chars):", text.slice(0, 500));
    }
    return {};
  }

  // Handle nested structure: some models return { "data": { "login": {...} } } or { "insights": {...} }
  if (Object.keys(parsed).length === 1) {
    const inner = parsed.data ?? parsed.insights ?? parsed.engineers ?? parsed.result;
    if (inner && typeof inner === "object") parsed = inner as Record<string, unknown>;
  }

  const result: Record<string, EngineerInsight> = {};
  for (const e of engineers) {
    const raw = parsed[e.login] ?? parsed[e.login.toLowerCase()];
    const val = validateInsight(raw);
    if (val) result[e.login] = val;
  }
  if (process.env.NODE_ENV === "development" && Object.keys(result).length === 0 && engineers.length > 0) {
    console.warn("[llm-insights] No valid insights parsed. Top-level keys:", Object.keys(parsed));
  }
  return result;
}

const CHUNK_SIZE = 5;

function toEngineerForInsights(engineers: Engineer[], prsCount?: number): EngineerForInsights[] {
  return engineers.map((e, i) => {
    const mix = getMix(e.breakdown).mix;
    const prPct = prsCount && prsCount > 0 ? (e.merged_prs / prsCount) * 100 : undefined;
    return {
      login: e.login,
      merged_prs: e.merged_prs,
      reviews_given: e.reviews_given,
      rank: i + 1,
      mix,
      pr_pct: prPct,
      median_pr_size: e.medianPrSize,
      median_merge_days: e.medianMergeDays,
      topPRs: e.topPRs.map((p) => ({ title: p.title, lines: p.additions + p.deletions })),
    };
  });
}

/**
 * Get LLM insights for top engineers (5 or 10).
 * Fetches in chunks of 5. Top 5 = 1 request, Top 10 = 2 requests.
 * Returns null if OPENAI_API_KEY is missing or on failure.
 * Caches for 6 hours (in-memory + file).
 */
export async function getInsights(
  topEngineers: Engineer[],
  since: string,
  repo = "PostHog/posthog",
  prsCount?: number,
): Promise<Record<string, EngineerInsight> | null> {
  const cacheKey = `${CACHE_KEY}:${since}:${repo}`;
  if (topEngineers.length === 0) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const engineersForInsights = toEngineerForInsights(topEngineers, prsCount);

  // 1. Load existing cache (may be empty or partial from prior Top 5 / Top 10)
  let result: Record<string, EngineerInsight> = {};
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && Date.now() - memoryEntry.fetchedAt < CACHE_TTL_MS) {
    result = { ...memoryEntry.result };
  } else {
    const fileResult = loadFileCache(since, repo);
    if (fileResult) result = { ...fileResult };
  }

  // 2. Split into chunks of 5, fetch only missing engineers per chunk
  const chunks: EngineerForInsights[][] = [];
  for (let i = 0; i < engineersForInsights.length; i += CHUNK_SIZE) {
    chunks.push(engineersForInsights.slice(i, i + CHUNK_SIZE));
  }

  try {
    for (const chunk of chunks) {
      const missing = chunk.filter((e) => !result[e.login] && !result[e.login.toLowerCase()]);
      if (missing.length === 0) continue;
      const fetched = await fetchFromOpenAI(missing, apiKey, repo);
      Object.assign(result, fetched);
    }
    if (Object.keys(result).length === 0) return null;

    // 3. Update cache and return subset for requested engineers
    memoryCache.set(cacheKey, { fetchedAt: Date.now(), since, result });
    saveFileCache(since, repo, result);

    const requestedLogins = new Set(engineersForInsights.map((e) => e.login.toLowerCase()));
    return Object.fromEntries(
      Object.entries(result).filter(([login]) => requestedLogins.has(login.toLowerCase())),
    );
  } catch (err) {
    console.error("LLM insights error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
