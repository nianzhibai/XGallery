"use client";

import { NavigationLink as Link } from "./navigation-link";
import { getImageProps } from "next/image";
import { forwardRef, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Bookmark, ImageOff, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Album } from "@/lib/types";
import { thumbnailUrl } from "@/lib/utils";
import { Tooltip } from "./ui/tooltip";
import { useLibrary } from "./providers";

export const AlbumCard = forwardRef<HTMLElement, {
  album: Album; index?: number; overlay?: boolean; showModelName?: boolean; remove?: () => void; removeLabel?: string; onEnterComplete?: () => void;
}>(function AlbumCard({ album, index = 0, overlay = false, showModelName = true, remove, removeLabel = "取消收藏", onEnterComplete }, ref) {
  const { library } = useLibrary();
  const saved = library.favorites.includes(album.id);
  const image = useRef<HTMLImageElement>(null);
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading");
  const { props: cover } = getImageProps({ src: thumbnailUrl(album.coverId, album.coverVersion), alt: `${album.modelName} · ${album.title}`, width: 600, height: 800,
    sizes: "(max-width: 440px) 100vw, (max-width: 680px) 50vw, (max-width: 1100px) 33vw, 25vw", loading: index < 4 ? "eager" : "lazy" });

  useEffect(() => {
    const element = image.current;
    if (!element?.complete) setImageState("loading");
    else setImageState(element.naturalWidth > 0 ? "loaded" : "error");
  }, [cover.src]);

  return <motion.article ref={ref} className={`album-card${overlay ? " album-card-overlay" : ""}`}
    layout="position" initial={false} exit={{ opacity: 0, scale: 0.985 }}
    transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
    {/* CSS entrance works without JavaScript; the wrapper leaves Motion free to animate layout. */}
    <div className="album-card-body" style={{ "--card-index": Math.min(index, 7) } as CSSProperties}
      onAnimationEnd={(event) => { if (event.animationName === "album-enter") onEnterComplete?.(); }}>
      <Link href={`/album/${album.id}`} className="album-cover" data-image-state={imageState} aria-label={`${album.modelName} · ${album.title}，${album.photoCount} 张图片${saved ? "，已收藏" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...cover} ref={image} onLoad={() => setImageState("loaded")} onError={() => setImageState("error")} />
        {imageState === "error" && <span className="cover-error"><ImageOff size={22} strokeWidth={1} /><span>封面暂时无法加载</span></span>}
        {overlay && <span className="cover-caption"><span className="cover-title">{showModelName ? `${album.modelName} · ${album.title}` : album.title}</span><span className="cover-meta">{album.photoCount} 张</span></span>}
        <span className="hover-arrow" aria-hidden="true"><ArrowUpRight size={15} /></span>
        {saved && !remove && <Tooltip label="已收藏"><span className="saved-badge"><Bookmark size={13} fill="currentColor" /></span></Tooltip>}
      </Link>
      {!overlay && <div className="album-card-info"><Link className="album-card-title" href={`/album/${album.id}`}>{album.title}</Link><div className="album-card-meta"><Link href={`/model/${album.modelId}`}>{album.modelName}</Link><span>{album.photoCount} 张</span></div></div>}
      {remove && <Tooltip label={removeLabel}><button type="button" className="card-remove" onClick={remove} aria-label={`${removeLabel} ${album.title}`}><X size={14} /></button></Tooltip>}
    </div>
  </motion.article>;
});

export function AlbumGrid({ albums, overlay = false, showModelName = true, onRemove, removeLabel, batchKey = 0, onEnterComplete }: {
  albums: Album[]; overlay?: boolean; showModelName?: boolean; onRemove?: (id: string) => void; removeLabel?: string; batchKey?: number; onEnterComplete?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  return <AnimatePresence mode="wait"><motion.div key={batchKey} className="albums-grid" initial={false}
    exit={{ opacity: 0, y: reducedMotion ? 0 : -5 }} transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.4, 0, 1, 1] }}>
    <AnimatePresence initial={false} mode="popLayout">{albums.map((album, index) => <AlbumCard key={album.id} album={album} index={index} overlay={overlay} showModelName={showModelName}
      remove={onRemove ? () => onRemove(album.id) : undefined} removeLabel={removeLabel} onEnterComplete={index === albums.length - 1 ? onEnterComplete : undefined} />)}</AnimatePresence>
  </motion.div></AnimatePresence>;
}
