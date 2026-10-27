"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import type { Album } from "@/lib/types";
import { shuffle } from "@/lib/utils";
import { AlbumGrid } from "./album-card";
import { useLibrary } from "./providers";
import { Button } from "./ui/button";

function RefreshButton({ onClick }: { onClick: () => void }) {
  const [spinning, setSpinning] = useState(false);
  return <Button className="refresh-button" disabled={spinning} onClick={() => { onClick(); setSpinning(true); setTimeout(() => setSpinning(false), 550); }}><RotateCw size={13} className={spinning ? "spinning" : ""} />换一批</Button>;
}

export function HomeGallery({ albums, initialRandom }: { albums: Album[]; initialRandom: Album[] }) {
  const [recent, setRecent] = useState(albums.slice(0, 8));
  const [random, setRandom] = useState(initialRandom);
  const { library } = useLibrary();
  const viewed = library.recent.map((id) => albums.find((album) => album.id === id)).filter((album): album is Album => !!album).slice(0, 8);
  return <>
    <section className="home-section home-section-first" aria-labelledby="recent-heading">
      <div className="section-head"><h1 id="recent-heading" className="section-title">最近更新</h1><RefreshButton onClick={() => setRecent(shuffle(albums.slice(0, Math.max(24, Math.ceil(albums.length / 2)))) .slice(0, 8))} /></div>
      <AlbumGrid albums={recent} overlay />
    </section>
    <section className="home-section" aria-labelledby="random-heading">
      <div className="section-head"><h2 id="random-heading" className="section-title">随机漫游</h2><RefreshButton onClick={() => setRandom(shuffle(albums).slice(0, 16))} /></div>
      <AlbumGrid albums={random} overlay />
    </section>
    {viewed.length > 0 && <section className="home-section" aria-labelledby="viewed-heading"><div className="section-head"><h2 id="viewed-heading" className="section-title">最近看过</h2><Button asChild><Link href="/library?tab=recent">全部<ArrowRight size={13} /></Link></Button></div><AlbumGrid albums={viewed} overlay /></section>}
  </>;
}
