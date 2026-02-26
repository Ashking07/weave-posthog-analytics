/**
 * Formatting utilities for the dashboard.
 */

import type { EngineerBreakdown } from "@/types";

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function pct(value: number, total: number): number {
  return total === 0 ? 0 : (value / total) * 100;
}

export function formatMedianMerge(days: number): string {
  if (days < 1) {
    const hrs = Math.round(days * 24);
    return `${hrs}h`;
  }
  return `${days.toFixed(1)}d`;
}

/** Format median review response time (hours) — e.g. "4h", "1.2d" */
export function formatReviewResponse(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return days < 1 ? `${hours.toFixed(1)}h` : `${days.toFixed(1)}d`;
}

export function formatPrSize(lines: number): string {
  if (lines < 1000) return `~${lines} lines`;
  return `~${(lines / 1000).toFixed(1)}k lines`;
}

/** Compact form for Substance badge: "~120" or "~1.2k" */
export function formatPrSizeCompact(lines: number): string {
  if (lines < 1000) return `~${lines}`;
  return `~${(lines / 1000).toFixed(1)}k`;
}

export type MixLabel = "Delivery-heavy" | "Review-heavy" | "Balanced";

export interface MixInfo {
  mix: MixLabel;
  mixReason: string;
  prPct: number;
  revPct: number;
}

export function getMix(breakdown: EngineerBreakdown): MixInfo {
  const total = breakdown.pr_points + breakdown.review_points;
  const prPct = Math.round(pct(breakdown.pr_points, total));
  const revPct = Math.round(pct(breakdown.review_points, total));

  if (prPct >= 70) {
    return { mix: "Delivery-heavy", mixReason: `${prPct}% of points from PRs`, prPct, revPct };
  }
  if (revPct >= 50) {
    return { mix: "Review-heavy", mixReason: `${revPct}% of points from reviews`, prPct, revPct };
  }
  return { mix: "Balanced", mixReason: `${prPct}% PRs / ${revPct}% reviews`, prPct, revPct };
}
