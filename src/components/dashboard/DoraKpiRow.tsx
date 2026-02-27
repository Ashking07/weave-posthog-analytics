"use client";

import { useState, useRef, useEffect } from "react";
import type {
  DoraProxies,
  LeadTimeResult,
  DeployFrequencyResult,
  ChangeFailureRateResult,
  MTTRResult,
} from "@/lib/doraMetrics";
import { DORA_PROXY_TOOLTIPS } from "@/lib/doraMetrics";

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-0.5 inline-flex">
      <span
        className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        aria-label="Proxy formula"
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 max-w-[220px] rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-600 shadow-lg opacity-0 transition-opacity group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}

function NotesPopover({ notes }: { notes: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[10px] font-medium text-violet-600 hover:underline dark:text-violet-400"
      >
        Notes
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-w-xs rounded-lg border border-zinc-200 bg-white p-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <ul className="space-y-1.5 text-[10px] text-zinc-600 dark:text-zinc-300">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface TileProps {
  label: string;
  value: string;
  secondary?: string;
  tooltip: string;
}

function KpiTile({ label, value, secondary, tooltip }: TileProps) {
  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div className="flex items-center gap-0.5">
        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
        <InfoTooltip text={tooltip} />
      </div>
      <p className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {secondary && (
        <p className="text-[10px] text-zinc-400">{secondary}</p>
      )}
    </div>
  );
}

function tileFromLeadTime(d: LeadTimeResult): TileProps {
  return {
    label: "Lead time",
    value: formatHours(d.medianHours),
    secondary: `p75 ${formatHours(d.p75Hours)} · ${d.sampleSize} PRs`,
    tooltip: DORA_PROXY_TOOLTIPS.leadTime,
  };
}

function tileFromDeployFreq(d: DeployFrequencyResult, windowDays: number): TileProps {
  return {
    label: "Deploy freq",
    value: d.perWeek.toFixed(2) + "/wk",
    secondary: `${d.totalDeploys} in ${windowDays}d`,
    tooltip: DORA_PROXY_TOOLTIPS.deployFreq,
  };
}

function tileFromChangeFailure(d: ChangeFailureRateResult): TileProps {
  return {
    label: "Change failure",
    value: `${d.rate}%`,
    secondary: `${d.failedDeploys}/${d.totalDeploys} · ${d.windowDays}d window`,
    tooltip: DORA_PROXY_TOOLTIPS.changeFailureRate,
  };
}

function tileFromMTTR(d: MTTRResult): TileProps {
  return {
    label: "MTTR",
    value: formatHours(d.medianHours),
    secondary: `${d.sampleSize} ${d.method === "incident_issues" ? "issues" : "hotfixes"}`,
    tooltip: DORA_PROXY_TOOLTIPS.mttr,
  };
}

export function DoraKpiRow({
  doraProxies,
  windowDays = 90,
}: {
  doraProxies?: DoraProxies | null;
  windowDays?: number;
}) {
  const tiles: TileProps[] = [];
  const notes: string[] = doraProxies?.notes ?? [];

  if (doraProxies?.leadTime) {
    tiles.push(tileFromLeadTime(doraProxies.leadTime));
  } else {
    tiles.push({
      label: "Lead time",
      value: "—",
      tooltip: DORA_PROXY_TOOLTIPS.leadTime,
    });
  }

  if (doraProxies?.deployFreq) {
    tiles.push(tileFromDeployFreq(doraProxies.deployFreq, windowDays));
  } else {
    tiles.push({
      label: "Deploy freq",
      value: "—",
      tooltip: DORA_PROXY_TOOLTIPS.deployFreq,
    });
  }

  if (doraProxies?.changeFailureRate) {
    tiles.push(tileFromChangeFailure(doraProxies.changeFailureRate));
  } else {
    tiles.push({
      label: "Change failure",
      value: "—",
      tooltip: DORA_PROXY_TOOLTIPS.changeFailureRate,
    });
  }

  if (doraProxies?.mttr) {
    tiles.push(tileFromMTTR(doraProxies.mttr));
  } else {
    tiles.push({
      label: "MTTR",
      value: "—",
      tooltip: DORA_PROXY_TOOLTIPS.mttr,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile, i) => (
          <KpiTile key={i} {...tile} />
        ))}
      </div>
      {notes.length > 0 && (
        <div className="flex justify-end">
          <NotesPopover notes={notes} />
        </div>
      )}
    </div>
  );
}
