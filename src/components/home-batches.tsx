"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Section = "recent" | "random";
type Batches = Partial<Record<Section, string[]>>;

const HomeBatchesContext = createContext<{
  batches: Batches;
  saveBatch: (section: Section, ids: string[]) => void;
}>({ batches: {}, saveBatch: () => {} });

export function HomeBatchesProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<Batches>({});
  const saveBatch = useCallback((section: Section, ids: string[]) => {
    setBatches((current) => ({ ...current, [section]: ids }));
  }, []);
  return <HomeBatchesContext.Provider value={{ batches, saveBatch }}>{children}</HomeBatchesContext.Provider>;
}

export const useHomeBatches = () => useContext(HomeBatchesContext);
