/**
 * Optional LLM-based insights for top engineers.
 * Uses OpenAI Chat Completions API. Server-side only.
 * Cache: 6 hours in-memory + optional file in os.tmpdir().
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineerForInsights {
  login: string;
  merged_prs: number;
  reviews_given: number;
  topPRs: { title: string }[];
}

export interface EngineerInsight {
  summary: string;
  prTypes: Record<string, number>;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY = "llm-insights-v1";
const PR_TYPE_KEYS = ["bugfix", "feature", "refactor", "infra", "docs", "test", "other"];

// In-memory cache keyed by "since:repo"
const memoryCache = new Map<string, { fetchedAt: number; since: string; result: Record<string, EngineerInsight> }>();

function getCachePath(repo: string): string {
  const slug = repo.replace(/\//g, "-");
  return path.join(os.tmpdir(), `posthog-llm-insights-cache-${slug}.json`);
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
  if (typeof summary !== "string" || summary.length > 280) return null;

  const prTypes: Record<string, number> = {};
  const pt = o.pr_types ?? o.prTypes;
  if (pt && typeof pt === "object") {
    for (const k of PR_TYPE_KEYS) {
      const v = (pt as Record<string, unknown>)[k];
      prTypes[k] = typeof v === "number" && v >= 0 ? Math.round(v) : 0;
    }
  }
  return { summary: summary.slice(0, 240), prTypes };
}

async function fetchFromOpenAI(
  engineers: EngineerForInsights[],
  apiKey: string,
): Promise<Record<string, EngineerInsight>> {
  const input = engineers.map((e) => ({
    login: e.login,
    merged_prs: e.merged_prs,
    reviews_given: e.reviews_given,
    top_pr_titles: e.topPRs.slice(0, 3).map((p) => p.title),
  }));

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a concise analytics assistant. Reply with a single JSON object only, no markdown or explanation. Keys are engineer logins (lowercase). Each value: { "summary": string (<=240 chars, 1-2 sentences on why impactful from PR titles and counts), "pr_types": { "bugfix": n, "feature": n, "refactor": n, "infra": n, "docs": n, "test": n, "other": n } }. Classify each PR title into exactly one type. Use 0 for missing types.`,
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1024,
    temperature: 0.2,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return {};

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }

  const result: Record<string, EngineerInsight> = {};
  for (const e of engineers) {
    const raw = parsed[e.login] ?? parsed[e.login.toLowerCase()];
    const val = validateInsight(raw);
    if (val) result[e.login] = val;
  }
  return result;
}

const CHUNK_SIZE = 5;

/**
 * Get LLM insights for top engineers (5 or 10).
 * Fetches in chunks of 5. Top 5 = 1 request, Top 10 = 2 requests.
 * Returns null if OPENAI_API_KEY is missing or on failure.
 * Caches for 6 hours (in-memory + file).
 */
export async function getInsights(
  topEngineers: EngineerForInsights[],
  since: string,
  repo = "PostHog/posthog",
): Promise<Record<string, EngineerInsight> | null> {
  const cacheKey = `${CACHE_KEY}:${since}:${repo}`;
  if (topEngineers.length === 0) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

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
  for (let i = 0; i < topEngineers.length; i += CHUNK_SIZE) {
    chunks.push(topEngineers.slice(i, i + CHUNK_SIZE));
  }

  try {
    for (const chunk of chunks) {
      const missing = chunk.filter((e) => !result[e.login] && !result[e.login.toLowerCase()]);
      if (missing.length === 0) continue;
      const fetched = await fetchFromOpenAI(missing, apiKey);
      Object.assign(result, fetched);
    }
    if (Object.keys(result).length === 0) return null;

    // 3. Update cache and return subset for requested engineers
    memoryCache.set(cacheKey, { fetchedAt: Date.now(), since, result });
    saveFileCache(since, repo, result);

    const requestedLogins = new Set(topEngineers.map((e) => e.login.toLowerCase()));
    return Object.fromEntries(
      Object.entries(result).filter(([login]) => requestedLogins.has(login.toLowerCase())),
    );
  } catch (err) {
    console.error("LLM insights error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
