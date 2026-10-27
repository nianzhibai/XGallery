"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, X } from "lucide-react";
import { motion } from "motion/react";
import type { Album } from "@/lib/types";
import { imageUrl } from "@/lib/utils";
import { useLibrary } from "./providers";

export function AlbumCard({ album, index = 0, overlay = false, remove }: {
  album: Album; index?: number; overlay?: boolean; remove?: () => void;
}) {
  const { library } = useLibrary();
  const saved = library.favorites.includes(album.id);
  return <motion.article className={`album-card${overlay ? " album-card-overlay" : ""}`}
    initial={false} whileHover={{ y: -2 }}
    transition={{ duration: 0.25 }}>
    <Link href={`/album/${album.id}`} className="album-cover" aria-label={`${album.modelName} · ${album.title}，${album.photoCount} 张图片`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl(album.coverId)} alt={`${album.modelName} · ${album.title}`} loading={index < 4 ? "eager" : "lazy"} decoding="async" width={600} height={800} />
      {overlay && <span className="cover-caption"><span className="cover-title">{album.modelName} · {album.title}</span><span className="cover-meta">{album.photoCount} 张</span></span>}
      <ArrowUpRight className="hover-arrow" size={22} aria-hidden="true" />
      {saved && <span className="saved-badge" title="已收藏"><Bookmark size={13} fill="currentColor" /></span>}
    </Link>
    {!overlay && <div className="album-card-info"><Link className="album-card-title" href={`/album/${album.id}`}>{album.title}</Link><div className="album-card-meta"><Link href={`/model/${album.modelId}`}>{album.modelName}</Link><span>{album.photoCount} 张</span></div></div>}
    {remove && <button type="button" className="card-remove" onClick={remove} aria-label={`取消收藏 ${album.title}`} title="取消收藏"><X size={14} /></button>}
  </motion.article>;
}

export function AlbumGrid({ albums, overlay = false, onRemove }: { albums: Album[]; overlay?: boolean; onRemove?: (id: string) => void }) {
  return <div className="albums-grid">{albums.map((album, index) => <AlbumCard key={album.id} album={album} index={index} overlay={overlay} remove={onRemove ? () => onRemove(album.id) : undefined} />)}</div>;
}
