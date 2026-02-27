import type { Engineer, EngineerInsight } from "@/types";
import { Avatar } from "@/components/ui";

export function LLMInsightsSection({
  engineers,
  selected,
  insights,
  onSelectEngineer,
}: {
  engineers: Engineer[];
  selected: Engineer | null;
  insights: Record<string, EngineerInsight> | null | undefined;
  onSelectEngineer?: (login: string) => void;
}) {
  const hasInsights = insights && Object.keys(insights).length > 0;

  if (!hasInsights) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-6 dark:border-zinc-600 dark:bg-zinc-900/30">
        <svg className="mb-2 h-8 w-8 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          AI insights require <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">OPENAI_API_KEY</code>
        </p>
      </div>
    );
  }

  const selectedInsight = selected
    ? insights?.[selected.login] ?? insights?.[selected.login.toLowerCase()]
    : null;

  if (selected && selectedInsight?.summary) {
    return (
      <div className="overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 dark:border-violet-500/25 dark:from-violet-500/10 dark:to-fuchsia-500/5">
        <div className="flex items-center gap-2 border-b border-violet-500/10 px-3 py-2.5 dark:border-violet-500/20">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20 dark:bg-violet-500/30">
            <svg className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
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
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            &ldquo;{selectedInsight.summary}&rdquo;
          </p>
        </div>
      </div>
    );
  }

  const engineersWithInsights = engineers.filter(
    (e) => insights?.[e.login]?.summary ?? insights?.[e.login.toLowerCase()]?.summary,
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/30">
        <svg className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">AI Insights</span>
      </div>
      <div className="min-h-[120px] max-h-[200px] overflow-y-auto">
        {engineersWithInsights.map((eng) => {
          const insight = insights?.[eng.login] ?? insights?.[eng.login.toLowerCase()];
          if (!insight?.summary) return null;
          const isSelected = selected?.login === eng.login;
          return (
            <button
              key={eng.login}
              type="button"
              onClick={() => onSelectEngineer?.(eng.login)}
              className={`w-full border-b border-zinc-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40 ${
                isSelected ? "bg-violet-500/10 dark:bg-violet-500/15" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                {eng.avatarUrl ? (
                  <div className="mt-0.5 shrink-0">
                    <Avatar src={eng.avatarUrl} alt={eng.login} size={24} />
                  </div>
                ) : (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-500 dark:bg-zinc-700">
                    {eng.login[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{eng.login}</span>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
                    {insight.summary}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
