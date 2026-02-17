/**
 * Quality signals mining via PyDriller (invoked as Python subprocess).
 * Caches results in-memory and optionally in a local JSON file.
 */

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityResult {
  touchedTests: Record<string, boolean | null>;
}

export interface CachedQuality {
  fetchedAt: number;
  since: string;
  result: QualityResult;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const REPO_URL = "https://github.com/PostHog/posthog";
const CACHE_KEY = "posthog-quality-v1";

// In-memory cache
let memoryCache: CachedQuality | null = null;

function getRepoPath(): string {
  return path.join(os.tmpdir(), "posthog-analytics-repo");
}

function getCachePath(): string {
  return path.join(os.tmpdir(), "posthog-quality-cache.json");
}

/** Ensure repo is cloned (shallow since cutoff). */
function ensureRepoCloned(sinceDate: string): { ok: boolean; error?: string } {
  const repoPath = getRepoPath();
  if (fs.existsSync(path.join(repoPath, ".git"))) {
    return { ok: true };
  }
  try {
    fs.mkdirSync(path.dirname(repoPath), { recursive: true });
    execSync(
      `git clone --shallow-since=${sinceDate} --single-branch ${REPO_URL} "${repoPath}"`,
      {
        timeout: 120_000,
        stdio: "pipe",
      },
    );
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Clone failed: ${msg}` };
  }
}

/** Run Python quality miner script. */
function runMiner(
  repoPath: string,
  sinceDate: string,
  mergeShas: string[],
): { ok: boolean; result?: QualityResult; error?: string } {
  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "quality_miner.py",
  );
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, error: "scripts/quality_miner.py not found" };
  }

  const python = process.env.PYTHON_PATH ?? "python3";
  const mergeShasJson = JSON.stringify(mergeShas);
  const out = spawnSync(
    python,
    [scriptPath, repoPath, mergeShasJson],
    {
      encoding: "utf-8",
      timeout: 90_000,
      env: { ...process.env, PYTHONPATH: path.join(process.cwd(), "scripts") },
    },
  );

  if (out.error) {
    return { ok: false, error: out.error.message };
  }
  if (out.status !== 0 && out.status !== null) {
    return {
      ok: false,
      error: out.stderr || `Exit code ${out.status}`,
    };
  }

  try {
    const parsed = JSON.parse(out.stdout || "{}") as {
      error?: string;
      touchedTests?: Record<string, boolean | null>;
    };
    if (parsed.error) {
      return { ok: false, error: parsed.error };
    }
    return {
      ok: true,
      result: {
        touchedTests: parsed.touchedTests ?? {},
      },
    };
  } catch {
    return { ok: false, error: "Invalid miner output" };
  }
}

/** Load from file cache if valid. */
function loadFileCache(since: string): QualityResult | null {
  const cachePath = getCachePath();
  try {
    const raw = fs.readFileSync(cachePath, "utf-8");
    const cached = JSON.parse(raw) as CachedQuality;
    if (cached.since !== since) return null;
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
    return cached.result;
  } catch {
    return null;
  }
}

/** Save to file cache. */
function saveFileCache(since: string, result: QualityResult): void {
  try {
    const cachePath = getCachePath();
    const data: CachedQuality = {
      fetchedAt: Date.now(),
      since,
      result,
    };
    fs.writeFileSync(cachePath, JSON.stringify(data), "utf-8");
  } catch {
    // Ignore file cache write errors
  }
}

/**
 * Get quality signals for the given merge commit SHAs.
 * Uses in-memory and optional file cache; runs PyDriller mining on cache miss.
 */
export function getQualitySignals(
  mergeShas: string[],
  sinceDate: string,
): { result: QualityResult | null; warning?: string } {
  const since = sinceDate;
  const cacheKey = `${CACHE_KEY}:${since}`;

  // 1. Check in-memory cache
  if (memoryCache && memoryCache.since === since) {
    const age = Date.now() - memoryCache.fetchedAt;
    if (age < CACHE_TTL_MS) {
      return { result: memoryCache.result };
    }
  }

  // 2. Check file cache
  const fileResult = loadFileCache(since);
  if (fileResult) {
    memoryCache = { fetchedAt: Date.now(), since, result: fileResult };
    return { result: fileResult };
  }

  // 3. Filter to unique SHAs
  const uniqueShas = [...new Set(mergeShas)].filter(Boolean);
  if (uniqueShas.length === 0) {
    return {
      result: { touchedTests: {} },
    };
  }

  // 4. Clone repo if needed
  const clone = ensureRepoCloned(sinceDate);
  if (!clone.ok) {
    return {
      result: null,
      warning: `Quality mining skipped: ${clone.error}`,
    };
  }

  // 5. Run miner
  const repoPath = getRepoPath();
  const miner = runMiner(repoPath, sinceDate, uniqueShas);
  if (!miner.ok || !miner.result) {
    return {
      result: null,
      warning: `Quality mining failed: ${miner.error}`,
    };
  }

  // 6. Update caches
  memoryCache = { fetchedAt: Date.now(), since, result: miner.result };
  saveFileCache(since, miner.result);

  return { result: miner.result };
}
