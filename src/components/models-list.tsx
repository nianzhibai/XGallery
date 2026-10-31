"use client";

import { NavigationLink as Link } from "./navigation-link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, Search } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Model } from "@/lib/types";
import { Button } from "./ui/button";
import { PageHeading } from "./page-parts";

type SortMode = "name" | "popular";

const sortGridVariants = {
  idle: { opacity: 1 },
  exiting: { opacity: 1, transition: { when: "afterChildren" as const } },
  entering: { opacity: 1, transition: { when: "afterChildren" as const } },
};

const sortCardVariants = {
  idle: { opacity: 1 },
  exiting: (delay: number) => ({ opacity: 0, transition: { duration: 0.05, delay, ease: "easeOut" as const } }),
  entering: (delay: number) => ({ opacity: 1, transition: { duration: 0.12, delay, ease: "easeOut" as const } }),
};

export function ModelsList({ models }: { models: (Model & { likeCount: number })[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("name");
  const [hasSorted, setHasSorted] = useState(false);
  const [sortTransition, setSortTransition] = useState<{ phase: "exiting" | "entering"; target: SortMode } | null>(null);
  const [columns, setColumns] = useState(3);
  const [pointerFocusedSort, setPointerFocusedSort] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const menuPointerInteraction = useRef(false);
  const pointerSelectedSort = useRef(false);
  const reducedMotion = useReducedMotion();
  const collator = useMemo(() => new Intl.Collator("zh-CN"), []);
  const visible = useMemo(() => models.filter((model) => model.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => (sort === "popular" ? b.likeCount - a.likeCount : 0) || collator.compare(a.name, b.name)), [models, query, sort, collator]);
  const lastRow = Math.max(0, Math.ceil(visible.length / columns) - 1);
  // Keep the first rows distinct while bounding the wait for long lists.
  const laterRowDelay = Math.min(0.018, 0.09 / Math.max(lastRow - 20, 1));

  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const updateColumns = () => {
      const tracks = getComputedStyle(element).gridTemplateColumns;
      setColumns(tracks === "none" ? 1 : tracks.trim().split(/\s+/).length);
    };
    const observer = new ResizeObserver(updateColumns);
    observer.observe(element);
    updateColumns();
    return () => observer.disconnect();
  }, []);

  function changeSort(next: string) {
    if (sortTransition || next === sort || (next !== "name" && next !== "popular")) return;
    setHasSorted(true);
    if (reducedMotion || visible.length === 0) setSort(next);
    else setSortTransition({ phase: "exiting", target: next });
  }

  function finishSortTransition() {
    if (sortTransition?.phase === "exiting") {
      setSort(sortTransition.target);
      setSortTransition({ ...sortTransition, phase: "entering" });
    } else if (sortTransition?.phase === "entering") setSortTransition(null);
  }

  function changeQuery(next: string) {
    if (sortTransition) {
      setSort(sortTransition.target);
      setSortTransition(null);
    }
    setQuery(next);
  }

  return <>
    <PageHeading title="模特" description={`${models.length} 位模特 · 点击进入模特主页`}>
      <div className="model-tools"><label className="model-search"><Search size={13} /><input placeholder="查找模特" aria-label="查找模特" value={query} onChange={(event) => changeQuery(event.target.value)} /></label>
        <DropdownMenu.Root modal={false} onOpenChange={(open) => { if (open) { menuPointerInteraction.current = false; pointerSelectedSort.current = false; } }}><DropdownMenu.Trigger asChild><Button size="small" aria-disabled={!!sortTransition} data-pointer-focus={pointerFocusedSort || undefined}
          onBlur={() => setPointerFocusedSort(false)}
          onPointerDown={(event) => { if (sortTransition) event.preventDefault(); }}
          onKeyDown={(event) => { setPointerFocusedSort(false); if (sortTransition && ["Enter", " ", "ArrowDown"].includes(event.key)) event.preventDefault(); }}>
          {sort === "popular" ? "按热度" : "按名称"}<ChevronDown size={12} /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="dropdown-content" align="end" sideOffset={8}
          onPointerDownCapture={() => { menuPointerInteraction.current = true; }}
          onPointerUpCapture={() => { menuPointerInteraction.current = true; }}
          onKeyDownCapture={() => { menuPointerInteraction.current = false; }}
          onCloseAutoFocus={() => { if (pointerSelectedSort.current) setPointerFocusedSort(true); pointerSelectedSort.current = false; }}>
          <DropdownMenu.RadioGroup value={sort} onValueChange={changeSort}><DropdownMenu.RadioItem className="dropdown-item" value="name" onSelect={() => { pointerSelectedSort.current = menuPointerInteraction.current; }}>按名称排序</DropdownMenu.RadioItem><DropdownMenu.RadioItem className="dropdown-item" value="popular" onSelect={() => { pointerSelectedSort.current = menuPointerInteraction.current; }}>按热度排序</DropdownMenu.RadioItem></DropdownMenu.RadioGroup>
        </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
      </div>
    </PageHeading>
    <motion.div ref={grid} className="models-grid" data-sorted={hasSorted || undefined} aria-busy={!!sortTransition} inert={!!sortTransition} variants={sortGridVariants} initial={false} animate={sortTransition?.phase ?? "idle"} onAnimationComplete={finishSortTransition}>
      <AnimatePresence initial={false} mode="popLayout">{visible.map((model, index) => {
        const row = Math.floor(index / columns);
        const delay = Math.min(row, 20) * 0.018 + Math.max(row - 20, 0) * laterRowDelay;
        return <motion.div key={model.id} custom={delay} variants={sortCardVariants} layout="position" initial={false} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1], layout: { duration: sortTransition?.phase === "entering" || reducedMotion ? 0 : 0.28, ease: [0.2, 0.7, 0.2, 1] } }}>
      <div className="model-reveal" style={{ "--model-index": Math.min(index, 20) } as CSSProperties}><Link href={`/model/${model.id}`} className="model-row"><span className="model-initial" aria-hidden="true">{Array.from(model.name)[0]}</span><span className="model-info"><span className="model-name">{model.name}</span><span className="model-meta">{model.albumCount} 个图集</span></span><span className="model-rank">{index + 1}</span></Link></div>
    </motion.div>; })}</AnimatePresence></motion.div>
    {visible.length === 0 && <p className="no-results">没有找到<span className="quote-mark">「</span>{query}<span className="quote-mark">」</span>相关模特</p>}
  </>;
}
