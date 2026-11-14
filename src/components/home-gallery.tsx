"use client";

import { useEffect, useRef, useState } from "react";
import { NavigationLink as Link } from "./navigation-link";
import { ArrowRight, RotateCw } from "lucide-react";
import { motion } from "motion/react";
import type { Album, HomeSection } from "@/lib/types";
import { useAlbumLookup } from "./album-cache";
import { AlbumGrid } from "./album-card";
import { useLibrary } from "./providers";
import { Button } from "./ui/button";
import { useHomeBatches } from "./home-batches";

/** `exclude` fetches the next batch; `restore` reconciles a saved batch with the catalog. */
async function fetchBatch(section: HomeSection, mode: "exclude" | "restore", albums: Album[], signal?: AbortSignal) {
  const ids = albums.map((album) => album.id).join(",");
  const response = await fetch(`/api/home/${section}?${mode}=${ids}`, { signal });
  if (!response.ok) throw new Error("换一批失败");
  return (await response.json() as { data: Album[] }).data;
}

function RefreshableSection({ section, title, headingId, initialAlbums, restored, first = false }: {
  section: HomeSection; title: string; headingId: string; initialAlbums: Album[]; restored: boolean; first?: boolean;
}) {
  const { batches, saveBatch } = useHomeBatches();
  const { toast } = useLibrary();
  const [restoredBatch] = useState(() => batches[section]);
  const [batch, setBatch] = useState(() => ({ albums: restoredBatch ?? initialAlbums, key: 0 }));
  const [refreshing, setRefreshing] = useState(false);
  const pendingBatch = useRef<number | null>(null);
  const nextBatch = useRef<Promise<Album[]> | null>(null);

  useEffect(() => { saveBatch(section, batch.albums); }, [batch.albums, saveBatch, section]);
  // A restored batch renders immediately for scroll restoration; the server then returns
  // it refreshed, or a new batch if it no longer fits the current catalog.
  useEffect(() => {
    if (!restoredBatch) return;
    const controller = new AbortController();
    fetchBatch(section, "restore", restoredBatch, controller.signal)
      .then((albums) => setBatch((current) => current.key === 0 && albums.length ? { ...current, albums } : current))
      .catch(() => {});
    return () => controller.abort();
  }, [restoredBatch, section]);
  // Prefetch the following batch so that refreshing swaps immediately.
  useEffect(() => {
    const request = fetchBatch(section, "exclude", batch.albums);
    request.catch(() => {});
    nextBatch.current = request;
  }, [batch.albums, section]);

  async function refresh() {
    if (pendingBatch.current !== null) return;
    const key = batch.key + 1;
    pendingBatch.current = key;
    setRefreshing(true);
    try {
      const albums = await (nextBatch.current ?? fetchBatch(section, "exclude", batch.albums));
      // The last card's entrance releases the lock, so an empty batch could never finish.
      if (!albums.length) throw new Error("没有可显示的图集");
      setBatch({ albums, key });
    } catch {
      nextBatch.current = null;
      pendingBatch.current = null;
      setRefreshing(false);
      toast("暂时无法换一批，请稍后重试");
    }
  }

  function finishRefresh(key: number) {
    if (pendingBatch.current !== key) return;
    pendingBatch.current = null;
    setRefreshing(false);
  }

  const Heading = first ? "h1" : "h2";
  return <section className={`home-section${first ? " home-section-first" : ""}${restored ? " home-section-restored" : ""}`} aria-labelledby={headingId} aria-busy={refreshing}>
    <div className="section-head"><Heading id={headingId} className="section-title">{title}</Heading>
      <Button className="refresh-button" aria-disabled={refreshing} aria-busy={refreshing} onClick={() => void refresh()}>
        <motion.span className="refresh-icon" aria-hidden="true" initial={false} animate={{ rotate: batch.key * 360 }} transition={{ duration: 0.9, ease: [0.45, 0, 0.2, 1] }}><RotateCw size={13} /></motion.span>换一批
      </Button>
    </div>
    <AlbumGrid albums={batch.albums} overlay batchKey={batch.key} skipEntrance={restored && batch.key === 0} onEnterComplete={() => finishRefresh(batch.key)} />
  </section>;
}

export function HomeGallery({ initialRecent, initialRandom }: { initialRecent: Album[]; initialRandom: Album[] }) {
  const { library, ready } = useLibrary();
  const { batches } = useHomeBatches();
  const [restored] = useState(() => !!batches.recent && !!batches.random);
  const viewed = useAlbumLookup(library.recent, ready).albums.slice(0, 8);
  return <>
    <RefreshableSection section="recent" title="最近更新" headingId="recent-heading" initialAlbums={initialRecent} restored={restored} first />
    <RefreshableSection section="random" title="随机漫游" headingId="random-heading" initialAlbums={initialRandom} restored={restored} />
    {viewed.length > 0 && <section className={`home-section${restored ? " home-section-restored" : ""}`} aria-labelledby="viewed-heading"><div className="section-head"><h2 id="viewed-heading" className="section-title">最近看过</h2><Button asChild><Link href="/library?tab=recent">全部<ArrowRight size={13} /></Link></Button></div><AlbumGrid albums={viewed} overlay skipEntrance={restored} /></section>}
  </>;
}
