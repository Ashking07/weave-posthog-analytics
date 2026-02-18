"use client";

import { useEffect, useState } from "react";
import type { ImpactResponse } from "@/types";

export interface UseImpactDataOptions {
  repo: string;
  top: 5 | 10;
  token?: string | null;
}

export function useImpactData({ repo, top, token }: UseImpactDataOptions) {
  const [data, setData] = useState<ImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ repo, top: String(top) });
    const headers: HeadersInit = {};
    if (token) headers["X-GitHub-Token"] = token;
    fetch(`/api/impact?${params}`, { headers })
      .then(async (res) => {
        const json = (await res.json()) as ImpactResponse;
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        return json;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repo, top, token]);

  return { data, error, loading };
}
