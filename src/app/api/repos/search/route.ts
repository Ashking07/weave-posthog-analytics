/**
 * Repo search API – powers autocomplete.
 * Uses Meilisearch when configured, falls back to GitHub search.
 */

import { NextResponse } from "next/server";
import { searchRepos } from "@/lib/repo-search";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") ?? "5", 10)));
  const token =
    req.headers.get("x-github-token") ??
    searchParams.get("token") ??
    process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "GitHub token required. Set GITHUB_TOKEN or pass X-GitHub-Token header." },
      { status: 400 },
    );
  }

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await searchRepos(token, q, limit);
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
