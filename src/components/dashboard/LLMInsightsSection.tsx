import type { Engineer, EngineerInsight } from "@/types";
import { Avatar } from "@/components/ui";

export function LLMInsightsSection({
  selected,
  insights,
}: {
  selected: Engineer | null;
  insights: Record<string, EngineerInsight> | null | undefined;
}) {
  if (!selected) return null;
  const insight = insights?.[selected.login] ?? insights?.[selected.login.toLowerCase()];
  if (!insight?.summary) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 dark:border-violet-500/25 dark:from-violet-500/10 dark:to-fuchsia-500/5">
      <div className="flex items-center gap-2 border-b border-violet-500/10 px-3 py-2.5 dark:border-violet-500/20">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20 dark:bg-violet-500/30">
          <svg className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-violet-700/90 dark:text-violet-300/90">
          AI Insight
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">·</span>
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{selected.login}</span>
      </div>
      <div className="flex gap-3 px-3 py-3">
        {selected.avatarUrl ? (
          <div className="shrink-0">
            <Avatar src={selected.avatarUrl} alt={selected.login} size={32} />
          </div>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-zinc-700">
            {selected.login[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            &ldquo;{insight.summary}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
