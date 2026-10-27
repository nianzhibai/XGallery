"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import { motion } from "motion/react";
import type { Album } from "@/lib/types";
import { shuffle } from "@/lib/utils";
import { AlbumGrid } from "./album-card";
import { useLibrary } from "./providers";
import { Button } from "./ui/button";

function RefreshableSection({ title, headingId, pool, initialAlbums, count, first = false }: {
  title: string; headingId: string; pool: Album[]; initialAlbums: Album[]; count: number; first?: boolean;
}) {
  const [batch, setBatch] = useState({ albums: initialAlbums, key: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const pendingBatch = useRef<number | null>(null);

  function refresh() {
    if (pendingBatch.current !== null) return;
    const key = batch.key + 1;
    const current = new Set(batch.albums.map((album) => album.id));
    const candidates = shuffle(pool);
    const next = [...candidates.filter((album) => !current.has(album.id)), ...candidates.filter((album) => current.has(album.id))].slice(0, count);
    pendingBatch.current = key;
    setRefreshing(true);
    setBatch({ albums: next, key });
  }

  function finishRefresh(key: number) {
    if (pendingBatch.current !== key) return;
    pendingBatch.current = null;
    setRefreshing(false);
  }

  const Heading = first ? "h1" : "h2";
  return <section className={`home-section${first ? " home-section-first" : ""}`} aria-labelledby={headingId} aria-busy={refreshing}>
    <div className="section-head"><Heading id={headingId} className="section-title">{title}</Heading>
      <Button className="refresh-button" aria-disabled={refreshing} aria-busy={refreshing} onClick={refresh}>
        <motion.span className="refresh-icon" aria-hidden="true" initial={false} animate={{ rotate: batch.key * 360 }} transition={{ duration: 0.9, ease: [0.45, 0, 0.2, 1] }}><RotateCw size={13} /></motion.span>换一批
      </Button>
    </div>
    <AlbumGrid albums={batch.albums} overlay batchKey={batch.key} onEnterComplete={() => finishRefresh(batch.key)} />
  </section>;
}

export function HomeGallery({ albums, initialRandom }: { albums: Album[]; initialRandom: Album[] }) {
  const { library } = useLibrary();
  const viewed = library.recent.map((id) => albums.find((album) => album.id === id)).filter((album): album is Album => !!album).slice(0, 8);
  return <>
    <RefreshableSection title="最近更新" headingId="recent-heading" pool={albums.slice(0, Math.max(24, Math.ceil(albums.length / 2)))} initialAlbums={albums.slice(0, 8)} count={8} first />
    <RefreshableSection title="随机漫游" headingId="random-heading" pool={albums} initialAlbums={initialRandom} count={16} />
    {viewed.length > 0 && <section className="home-section" aria-labelledby="viewed-heading"><div className="section-head"><h2 id="viewed-heading" className="section-title">最近看过</h2><Button asChild><Link href="/library?tab=recent">全部<ArrowRight size={13} /></Link></Button></div><AlbumGrid albums={viewed} overlay /></section>}
  </>;
}
