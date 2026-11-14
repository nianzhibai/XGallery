"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Album, HomeSection } from "@/lib/types";

type Batches = Partial<Record<HomeSection, Album[]>>;

const HomeBatchesContext = createContext<{
  batches: Batches;
  saveBatch: (section: HomeSection, albums: Album[]) => void;
}>({ batches: {}, saveBatch: () => {} });

export function HomeBatchesProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<Batches>({});
  const saveBatch = useCallback((section: HomeSection, albums: Album[]) => {
    setBatches((current) => ({ ...current, [section]: albums }));
  }, []);
  return <HomeBatchesContext.Provider value={{ batches, saveBatch }}>{children}</HomeBatchesContext.Provider>;
}

export const useHomeBatches = () => useContext(HomeBatchesContext);
