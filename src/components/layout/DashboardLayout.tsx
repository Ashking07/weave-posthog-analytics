"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Density = "compact" | "comfortable";

interface DensityContextValue {
  density: Density;
  setDensity: (d: Density) => void;
}

const DensityContext = createContext<DensityContextValue>({
  density: "compact",
  setDensity: () => {},
});

export function useDensity() {
  return useContext(DensityContext);
}

export function DashboardLayout({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  const [density, setDensity] = useState<Density>("compact");

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      <div className="flex min-h-screen flex-col bg-zinc-50 font-[family-name:var(--font-geist-sans)] dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="sticky top-0 z-30 shrink-0 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm dark:border-zinc-800/60 dark:bg-zinc-900/95">
          {header}
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</main>
      </div>
    </DensityContext.Provider>
  );
}
