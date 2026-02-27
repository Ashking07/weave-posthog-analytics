"use client";

import { SECTION_ICONS } from "./sectionIcons";

const SECTIONS = [
  { id: "section-outcomes", label: "Outcomes", icon: SECTION_ICONS.outcomes, chipClass: "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10" },
  { id: "section-leverage", label: "Leverage", icon: SECTION_ICONS.leverage, chipClass: "text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10" },
  { id: "section-reliability", label: "Reliability", icon: SECTION_ICONS.reliability, chipClass: "text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-500/10" },
  { id: "section-leadership", label: "Leadership", icon: SECTION_ICONS.leadership, chipClass: "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10" },
  { id: "section-team-impact", label: "Team Impact", icon: SECTION_ICONS.teamImpact, chipClass: "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-500/10" },
] as const;

export function JumpToNav() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        Jump to
      </span>
      {SECTIONS.map(({ id, label, icon, chipClass }) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollTo(id)}
          className={`inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-[11px] font-medium transition-colors ${chipClass}`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
