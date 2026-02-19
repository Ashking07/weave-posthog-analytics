"use client";

import { useEffect, useState } from "react";
import type { ImpactResponse } from "@/types";

const CACHE_KEY_PREFIX = "oss-impact-cache-v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface UseImpactDataOptions {
  repo: string;
  top: 5 | 10;
  token?: string | null;
}

export interface LoadingStep {
  id: string;
  label: string;
}

export interface LoadingProgress {
  currentStep: LoadingStep | null;
  completedSteps: string[];
}

function getCacheKey(repo: string, top: 5 | 10): string {
  return `${CACHE_KEY_PREFIX}:${repo}:${top}`;
}

function loadFromCache(repo: string, top: 5 | 10): ImpactResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getCacheKey(repo, top));
    if (!raw) return null;
    const { fetchedAt, data } = JSON.parse(raw) as { fetchedAt: number; data: ImpactResponse };
    if (!data?.top || Date.now() - fetchedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function saveToCache(repo: string, top: 5 | 10, data: ImpactResponse): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getCacheKey(repo, top),
      JSON.stringify({ fetchedAt: Date.now(), data }),
    );
  } catch {
    // Ignore quota / storage errors
  }
}

export function useImpactData({ repo, top, token }: UseImpactDataOptions) {
  const [data, setData] = useState<ImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({ currentStep: null, completedSteps: [] });

  useEffect(() => {
    if (!repo) {
      setLoading(false);
      setLoadingProgress({ currentStep: null, completedSteps: [] });
      return;
    }

    // 1. Try cache first – show immediately if valid
    const cached = loadFromCache(repo, top);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
    setLoadingProgress({ currentStep: { id: "fetch_prs", label: "Starting…" }, completedSteps: [] });

    const params = new URLSearchParams({ repo, top: String(top) });
    const headers: HeadersInit = {};
    if (token) headers["X-GitHub-Token"] = token;

    const abort = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/impact?${params}`, { headers, signal: abort.signal });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const trimmed = raw.trim();
            if (!trimmed) continue;
            try {
              const msg = JSON.parse(trimmed) as { type: string; id?: string; label?: string; data?: ImpactResponse; error?: string };
              if (msg.type === "step_start" && msg.id && msg.label) {
                setLoadingProgress((p) => ({ ...p, currentStep: { id: msg.id!, label: msg.label! } }));
              } else if (msg.type === "step_done" && msg.id) {
                setLoadingProgress((p) => ({
                  currentStep: p.currentStep?.id === msg.id ? null : p.currentStep,
                  completedSteps: p.completedSteps.includes(msg.id!) ? p.completedSteps : [...p.completedSteps, msg.id!],
                }));
              } else if (msg.type === "partial" && msg.data) {
                const payload = msg.data as ImpactResponse;
                setData(payload);
                if (!cached) setLoading(false);
              } else if (msg.type === "done" && msg.data) {
                const payload = msg.data as ImpactResponse;
                setData(payload);
                saveToCache(repo, top, payload);
              } else if (msg.type === "error" && msg.error) {
                throw new Error(msg.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue; // Skip parse errors for partial chunks
              throw e;
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          if (!cached) setError((e as Error).message);
          // If we had cache, keep showing it – background refresh failed silently
        }
      } finally {
        setLoading(false);
        setLoadingProgress({ currentStep: null, completedSteps: [] });
      }
    })();

    return () => abort.abort();
  }, [repo, top, token]);

  return { data, error, loading, loadingProgress };
}
