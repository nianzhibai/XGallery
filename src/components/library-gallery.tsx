"use client";

import Link from "next/link";
import type { Album } from "@/lib/types";
import { AlbumGrid } from "./album-card";
import { EmptyState, PageHeading } from "./page-parts";
import { useLibrary } from "./providers";
import { Button } from "./ui/button";

export function LibraryGallery({ albums, tab }: { albums: Album[]; tab: string }) {
  const { library, ready, toggleFavorite, clearRecent, toast } = useLibrary();
  const isRecent = tab === "recent";
  const ids = isRecent ? library.recent : library.favorites;
  const visible = ids.map((id) => albums.find((album) => album.id === id)).filter((album): album is Album => !!album);
  return <>
    <PageHeading title="我的收藏" description="把喜欢的光影，留在这里。">
      <nav className="library-tabs" aria-label="我的图库"><Link href="/library" className={!isRecent ? "is-active" : ""}>收藏 <span>{library.favorites.length}</span></Link><Link href="/library?tab=recent" className={isRecent ? "is-active" : ""}>最近看过 <span>{library.recent.length}</span></Link></nav>
    </PageHeading>
    {!ready ? <div className="library-loading" aria-label="正在读取收藏" /> : visible.length ? <>
      {isRecent && <div className="library-toolbar"><Button size="small" variant="ghost" onClick={() => { clearRecent(); toast("浏览记录已清空"); }}>清空浏览记录</Button></div>}
      <AlbumGrid albums={visible} onRemove={isRecent ? undefined : (id) => { toggleFavorite(id); toast("已取消收藏"); }} />
    </> : <EmptyState title={isRecent ? "还没有浏览记录" : "还没有收藏"} description={isRecent ? "打开一个图集，下次就能从这里继续。" : "在图集页点「收藏」，就会出现在这里。"} />}
    <p className="library-note">收藏和浏览记录保存在当前浏览器中，清除浏览器数据后将不再保留。</p>
  </>;
}
