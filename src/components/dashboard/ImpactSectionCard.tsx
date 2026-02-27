"use client";

import { useState } from "react";
import { SectionCard } from "@/components/layout";
import { TopItemsList, type TopItem } from "./TopItemsList";
import { SectionListDrawer } from "./SectionListDrawer";

export function ImpactSectionCard({
  title,
  kpiLine,
  items,
  onAuthorClick,
  emptyMessage = "No items",
  sectionId,
  icon,
}: {
  title: string;
  kpiLine: React.ReactNode;
  items: TopItem[];
  onAuthorClick?: (author: string) => void;
  emptyMessage?: string;
  sectionId?: string;
  icon?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <SectionCard
        id={sectionId}
        title={title}
        subtitle={kpiLine}
        icon={icon}
        body={
          <TopItemsList
            items={items}
            maxItems={3}
            titleTruncate={48}
            onAuthorClick={onAuthorClick}
          />
        }
        footer={
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="text-[10px] font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            View all ({items.length})
          </button>
        }
      />
      <SectionListDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={title}
        items={items}
        onAuthorClick={onAuthorClick}
      />
    </>
  );
}
