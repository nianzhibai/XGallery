"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ProgressToken = symbol;
type ProgressActions = { start: (token: ProgressToken) => void; finish: (token: ProgressToken) => void };
const ProgressContext = createContext<ProgressActions>({ start: () => {}, finish: () => {} });

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const active = useRef<ProgressToken | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const start = useCallback((token: ProgressToken) => {
    if (active.current === token) return;
    active.current = token;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setPhase("loading");
  }, []);
  const finish = useCallback((token: ProgressToken) => {
    if (active.current !== token) return;
    active.current = null;
    setPhase("done");
    resetTimer.current = setTimeout(() => { resetTimer.current = null; setPhase("idle"); }, 500);
  }, []);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  const actions = useMemo(() => ({ start, finish }), [start, finish]);

  return <ProgressContext.Provider value={actions}>
    <div className={`nav-progress is-${phase}`} aria-hidden="true" />
    <Suspense fallback={null}><HistoryProgress /></Suspense>
    {children}
  </ProgressContext.Provider>;
}

export function useNavigationPending(pending: boolean) {
  const { start, finish } = useContext(ProgressContext);
  const token = useRef<ProgressToken>(Symbol("navigation"));
  useEffect(() => {
    if (!pending) return;
    const current = token.current;
    start(current);
    return () => finish(current);
  }, [pending, start, finish]);
}

function HistoryProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { start, finish } = useContext(ProgressContext);
  const token = useRef<ProgressToken>(Symbol("history"));
  const committed = useRef(`${pathname}?${search}`);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    committed.current = `${pathname}?${search}`;
    if (timeout.current) clearTimeout(timeout.current);
    finish(token.current);
  }, [pathname, search, finish]);
  useEffect(() => {
    const onPopState = () => {
      const next = `${window.location.pathname}?${new URLSearchParams(window.location.search)}`;
      if (next === committed.current) return;
      start(token.current);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => finish(token.current), 10_000);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (timeout.current) clearTimeout(timeout.current);
      finish(token.current);
    };
  }, [start, finish]);
  return null;
}

export function useDocumentNavigationProgress() {
  const { start, finish } = useContext(ProgressContext);
  const token = useRef<ProgressToken>(Symbol("document-navigation"));
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const reset = () => { if (timeout.current) clearTimeout(timeout.current); finish(token.current); };
    window.addEventListener("pageshow", reset);
    return () => { window.removeEventListener("pageshow", reset); reset(); };
  }, [finish]);
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    start(token.current);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => finish(token.current), 10_000);
  };
}
