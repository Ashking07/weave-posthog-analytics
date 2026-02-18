"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * GitHub token persisted in localStorage (client-only).
 * Security: Stored client-side only; sent via X-GitHub-Token header to same-origin API;
 * never logged, persisted server-side, or exposed in URLs. Use HTTPS in production.
 */
const STORAGE_KEY = "oss-impact-github-token";

function getStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function setStored(value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function useGitHubToken(): [string | null, (v: string | null) => void] {
  const [token, setTokenState] = useState<string | null>(() => getStored());

  // Sync from storage on mount (handles cross-tab or initial load)
  useEffect(() => {
    setTokenState(getStored());
  }, []);

  const setToken = useCallback((value: string | null) => {
    const trimmed = value && value.trim() ? value.trim() : null;
    setTokenState(trimmed);
    setStored(trimmed);
  }, []);

  return [token, setToken];
}
