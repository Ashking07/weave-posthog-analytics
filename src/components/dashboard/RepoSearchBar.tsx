"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RepoSearchResult } from "@/types";

const DEBOUNCE_MS = 300;

export function RepoSearchBar({
  value,
  onChange,
  onSelect,
  placeholder = "Search any open source repo...",
  token,
}: {
  value: string;
  onChange?: (v: string) => void;
  onSelect: (repo: RepoSearchResult) => void;
  placeholder?: string;
  token?: string | null;
}) {
  const [query, setQuery] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RepoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, limit: "5" });
        const headers: HeadersInit = {};
        if (token) headers["X-GitHub-Token"] = token;
        const res = await fetch(`/api/repos/search?${params}`, { headers });
        const json = (await res.json()) as { items?: RepoSearchResult[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Search failed");
        setResults(json.items ?? []);
        setFocusedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!isSearching) setQuery(value);
  }, [value, isSearching]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    // Don't search or reopen when query matches value (user just selected a suggestion)
    if (query === value) {
      setOpen(false);
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      search(query);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, [query, search, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[focusedIndex]!;
      onSelect(r);
      setOpen(false);
      setQuery(r.full_name);
      setIsSearching(false);
      onChange?.(r.full_name);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsSearching(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
            if (query.trim() && query !== value) setIsSearching(true);
          }}
          onBlur={() => {
            if (!open) setIsSearching(false);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-200/80 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm transition-all focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
          autoComplete="off"
        />
        {loading && (
          <div
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-500 dark:border-zinc-700 dark:border-t-violet-400"
            aria-hidden
          />
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-72 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          role="listbox"
        >
          {results.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === focusedIndex}
              onMouseEnter={() => setFocusedIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setResults([]);
                setQuery(r.full_name);
                setIsSearching(false);
                onSelect(r);
                onChange?.(r.full_name);
              }}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                i === focusedIndex
                  ? "bg-violet-50 dark:bg-violet-500/10"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              }`}
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {r.full_name}
              </span>
              {r.stargazers_count > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  ★ {r.stargazers_count.toLocaleString()}
                </span>
              )}
              {r.description && (
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {r.description.slice(0, 60)}
                  {r.description.length > 60 ? "…" : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
