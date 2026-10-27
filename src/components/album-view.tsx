"use client";

import { Tooltip } from "./ui/tooltip";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronLeft, Dice5, Heart, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Album, Photo } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { AlbumGrid } from "./album-card";
import { PhotoWall } from "./photo-wall";
import { useLibrary } from "./providers";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useScrollHeader } from "@/lib/use-scroll-header";

export function AlbumView({ album, photos, related, modelAlbumCount }: { album: Album; photos: Photo[]; related: Album[]; modelAlbumCount: number }) {
  const router = useRouter();
  const header = useScrollHeader<HTMLElement>();
  const { library, ready, toggleFavorite, visit, toast, setLiked } = useLibrary();
  const [likeCount, setLikeCount] = useState(album.likes);
  const [pending, setPending] = useState(false);
  const likeLock = useRef(false);
  const saved = library.favorites.includes(album.id);
  const liked = library.liked.includes(album.id);
  useEffect(() => { if (ready) visit(album.id); }, [album.id, ready, visit]);
  const like = useCallback(async () => {
    if (likeLock.current || !ready) return;
    likeLock.current = true; setPending(true);
    try {
      const response = await fetch(`/api/albums/${album.id}/like`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liked: !liked }) });
      if (!response.ok) throw new Error("点赞失败");
      const data = await response.json(); setLikeCount(data.count); setLiked(album.id, data.liked);
      if (data.liked) toast("谢谢你的喜欢 ♡");
    } catch { toast("暂时无法点赞，请稍后重试"); }
    finally { likeLock.current = false; setPending(false); }
  }, [album.id, liked, ready, setLiked, toast]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: `${album.modelName} · ${album.title}`, url }); return; }
      await navigator.clipboard.writeText(url); toast("图集链接已复制");
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast("请复制地址栏中的图集链接");
    }
  }

  return <div className="album-page page-enter">
    <header ref={header} className="album-topbar scroll-header"><Button variant="ghost" className="back-link" onClick={() => window.history.length > 1 ? router.back() : router.push("/")}><ChevronLeft size={17} />返回</Button><div className="album-top-actions"><span>{photos.length} 张</span><Tooltip label="随机漫游"><Link href="/random" prefetch={false} className="icon-button" aria-label="随机浏览图集"><Dice5 /></Link></Tooltip><ThemeToggle /></div></header>
    <main id="main-content" className="album-main">
      <div className="album-intro">
        <Link href={`/model/${album.modelId}`} className="model-breadcrumb"><span className="breadcrumb-label">模特主页</span><span>{album.modelName}</span><span className="breadcrumb-meta">全部 {modelAlbumCount} 个图集 <ArrowRight size={12} /></span></Link>
        <h1 className="album-title">{album.title}</h1>
        <div className="album-actions"><Button size="small" className={`album-like${liked ? " is-liked" : ""}`} disabled={pending || !ready} onClick={() => void like()} aria-label={liked ? "取消点赞" : "点赞图集"} aria-pressed={liked}>
          <Heart size={14} fill={liked ? "currentColor" : "none"} />{liked && <span className="like-ring" aria-hidden="true" />}
          <AnimatePresence initial={false} mode="popLayout"><motion.span key={likeCount} className="like-count" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>{likeCount}</motion.span></AnimatePresence>
        </Button>
          <Button size="small" className={`favorite-button${saved ? " is-active" : ""}`} onClick={() => { toggleFavorite(album.id); toast(saved ? "已取消收藏" : "已加入收藏"); }} aria-pressed={saved}><Bookmark size={13} fill={saved ? "currentColor" : "none"} /><span>{saved ? "已收藏" : "收藏"}</span></Button>
          <Button size="small" onClick={() => void share()}><Share2 size={13} />分享</Button><span className="album-hint">点击照片沉浸浏览 · 双击大图点赞</span><span className="album-size">{formatBytes(album.totalBytes)}</span>
        </div>
      </div>
      <PhotoWall photos={photos} title={album.title} onLike={() => { if (!liked) void like(); }} />
      <div className="wall-end"><span className="brand-mark" /><span>已欣赏全部 {photos.length} 张照片</span></div>
      {related.length > 0 && <section className="home-section related-section"><div className="section-head"><div><h2 className="section-title">更多「{album.modelName}」</h2><p className="section-subtitle">继续发现同一份光影</p></div><Button asChild><Link href={`/model/${album.modelId}`}>模特主页<ArrowRight size={13} /></Link></Button></div><AlbumGrid albums={related} /></section>}
      <div className="album-bottom"><Link href="/">返回 XGallery <ArrowRight size={13} /></Link></div>
    </main>
  </div>;
}
