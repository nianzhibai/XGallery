"use client";

import { NavigationLink as Link } from "./navigation-link";
import type { Album } from "@/lib/types";
import { AlbumGrid } from "./album-card";
import { EmptyState, PageHeading } from "./page-parts";
import { useLibrary } from "./providers";
import { Button } from "./ui/button";

export function LibraryGallery({ albums, tab }: { albums: Album[]; tab: string }) {
  const { library, ready, toggleFavorite, removeRecent, clearRecent, toast } = useLibrary();
  const isRecent = tab === "recent";
  const ids = isRecent ? library.recent : library.favorites;
  const visible = ids.map((id) => albums.find((album) => album.id === id)).filter((album): album is Album => !!album);
  return <>
    <PageHeading title="我的收藏" description="只保存在这台设备的浏览器里">
      <nav className="library-tabs" aria-label="我的图库"><Link href="/library" className={!isRecent ? "is-active" : ""}>收藏 <span>{library.favorites.length}</span></Link><Link href="/library?tab=recent" className={isRecent ? "is-active" : ""}>最近看过 <span>{library.recent.length}</span></Link></nav>
    </PageHeading>
    {!ready ? <div className="library-loading" aria-label="正在读取收藏" /> : visible.length ? <>
      <AlbumGrid albums={visible} overlay showModelName={false} removeLabel={isRecent ? "移除浏览记录" : "取消收藏"} onRemove={(id) => {
        if (isRecent) { removeRecent(id); toast("已移除浏览记录"); }
        else { toggleFavorite(id); toast("已取消收藏"); }
      }} />
      {isRecent && <div className="library-toolbar"><Button onClick={() => { clearRecent(); toast("浏览记录已清空"); }}>清空最近看过</Button></div>}
    </> : <EmptyState title={isRecent ? "还没有看过的图集" : "还没有收藏"} description={isRecent ? "浏览过的图集会出现在这里" : "在图集页点「收藏」，就会出现在这里"} action={{ href: "/", label: "去逛逛" }} />}
    <p className="library-note">收藏和浏览记录只保存在当前浏览器里，换设备或清除浏览器数据后不会保留。</p>
  </>;
}
