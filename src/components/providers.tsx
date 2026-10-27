"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { TooltipProvider } from "./ui/tooltip";
import type { LibraryState } from "@/lib/types";

const initialLibrary: LibraryState = { favorites: [], recent: [], liked: [] };
const storageKey = "xgallery-library-v1";
const LibraryContext = createContext<{
  library: LibraryState; ready: boolean;
  toggleFavorite: (id: string) => void;
  visit: (id: string) => void;
  setLiked: (id: string, value: boolean) => void;
  clearRecent: () => void;
  toast: (message: string) => void;
}>({ library: initialLibrary, ready: false, toggleFavorite: () => {}, visit: () => {}, setLiked: () => {}, clearRecent: () => {}, toast: () => {} });

function parseLibrary(value: string | null): LibraryState {
  try {
    const data = JSON.parse(value || "{}");
    const ids = (key: string) => Array.isArray(data[key]) ? [...new Set<string>(data[key].filter((item: unknown) => typeof item === "string" && /^[a-f0-9]{24}$/.test(item)))].slice(0, 1000) : [];
    return { favorites: ids("favorites"), recent: ids("recent").slice(0, 100), liked: ids("liked") };
  } catch { return initialLibrary; }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<LibraryState>(initialLibrary);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try { setLibrary(parseLibrary(localStorage.getItem(storageKey))); } catch { /* Private browsing may disable storage. */ }
    setReady(true);
    const handle = (event: StorageEvent) => { if (event.key === storageKey) setLibrary(parseLibrary(event.newValue)); };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem(storageKey, JSON.stringify(library)); } catch { /* In-memory browsing still works. */ }
  }, [library, ready]);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 2600);
    return () => clearTimeout(timeout);
  }, [message]);
  const toast = useCallback((text: string) => setMessage(text), []);
  const toggleFavorite = useCallback((id: string) => setLibrary((state) => ({ ...state, favorites: state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [id, ...state.favorites] })), []);
  const visit = useCallback((id: string) => setLibrary((state) => ({ ...state, recent: [id, ...state.recent.filter((item) => item !== id)].slice(0, 100) })), []);
  const setLiked = useCallback((id: string, value: boolean) => setLibrary((state) => ({ ...state, liked: value ? [...new Set([...state.liked, id])] : state.liked.filter((item) => item !== id) })), []);
  const clearRecent = useCallback(() => setLibrary((state) => ({ ...state, recent: [] })), []);

  return <MotionConfig reducedMotion="user">
    <TooltipProvider delayDuration={450}>
    <LibraryContext.Provider value={{ library, ready, toast, toggleFavorite, visit, setLiked, clearRecent }}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence>{message && <motion.div className="toast" key={message} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}>{message}</motion.div>}</AnimatePresence>
      </div>
    </LibraryContext.Provider>
    </TooltipProvider>
  </MotionConfig>;
}

export const useLibrary = () => useContext(LibraryContext);
