import type { MixLabel } from "@/utils/format";

const MIX_STYLES: Record<MixLabel, string> = {
  "Delivery-heavy":
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30",
  "Review-heavy":
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  Balanced:
    "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-300 dark:ring-zinc-500/30",
};

export function MixBadge({ mix }: { mix: MixLabel }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-medium leading-4 ${MIX_STYLES[mix]}`}
    >
      {mix}
    </span>
  );
}
