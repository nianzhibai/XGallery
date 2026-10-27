"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, Search } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "motion/react";
import type { Model } from "@/lib/types";
import { Button } from "./ui/button";
import { PageHeading } from "./page-parts";

export function ModelsList({ models }: { models: Model[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("albums");
  const visible = useMemo(() => models.filter((model) => model.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "zh-CN") : b.albumCount - a.albumCount || a.name.localeCompare(b.name, "zh-CN")), [models, query, sort]);
  return <>
    <PageHeading title="模特" description={`${models.length} 位模特 · 点击进入模特主页`}>
      <div className="model-tools"><label className="model-search"><Search size={13} /><input placeholder="查找模特" aria-label="查找模特" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <DropdownMenu.Root modal={false}><DropdownMenu.Trigger asChild><Button size="small">{sort === "albums" ? "按图集数" : "按名称"}<ChevronDown size={12} /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="dropdown-content" align="end" sideOffset={8}>
          <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}><DropdownMenu.RadioItem className="dropdown-item" value="albums">按图集数排序</DropdownMenu.RadioItem><DropdownMenu.RadioItem className="dropdown-item" value="name">按名称排序</DropdownMenu.RadioItem></DropdownMenu.RadioGroup>
        </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
      </div>
    </PageHeading>
    <div className="models-grid"><AnimatePresence initial={false} mode="popLayout">{visible.map((model, index) => <motion.div key={model.id} layout="position" initial={false} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
      <div className="model-reveal" style={{ "--model-index": Math.min(index, 20) } as CSSProperties}><Link href={`/model/${model.id}`} className="model-row"><span className="model-initial" aria-hidden="true">{Array.from(model.name)[0]}</span><span className="model-info"><span className="model-name">{model.name}</span><span className="model-meta">{model.albumCount} 个图集 <span>· {model.photoCount.toLocaleString("zh-CN")} 张</span></span></span><span className="model-rank">{index + 1}</span></Link></div>
    </motion.div>)}</AnimatePresence></div>
    {visible.length === 0 && <p className="no-results">没有找到“{query}”相关模特</p>}
  </>;
}
