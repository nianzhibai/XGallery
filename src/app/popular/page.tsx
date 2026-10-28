import { NavigationLink as Link } from "@/components/navigation-link";
import { getImageProps } from "next/image";
import { Heart } from "lucide-react";
import { getAlbums, getModels } from "@/lib/catalog";
import { thumbnailUrl } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, PageHeading } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "最受喜爱" };
export default function PopularPage() {
  const albums = getAlbums().sort((a, b) => b.likes - a.likes || b.updatedAt - a.updatedAt).slice(0, 100);
  const highestLikes = albums[0]?.likes ?? 0;
  return <><SiteHeader models={getModels()} /><main id="main-content" className="page-container page-enter"><PageHeading title="最受喜爱" description={`按累计点赞排序 · 前 ${albums.length} 名`} />
    {albums.length ? <><ol className="popular-grid">{albums.slice(0, 3).map((album, index) => {
      const { props: cover } = getImageProps({ src: thumbnailUrl(album.coverId, album.coverVersion), alt: `${album.modelName} · ${album.title}`, width: 600, height: 750,
        sizes: "(max-width: 680px) 100vw, 33vw", loading: "eager" });
      return <li className="popular-card" key={album.id}><Link href={`/album/${album.id}`} className="popular-cover"><span className={`popular-rank${index === 0 ? " top-rank" : ""}`}>{index + 1}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...cover} />
      </Link><h2><Link href={`/album/${album.id}`}>{album.title}</Link></h2><div className="album-card-meta"><Link href={`/model/${album.modelId}`}>{album.modelName}</Link><span>{album.photoCount} 张</span></div><span className="popular-likes"><Heart size={12} fill="currentColor" />{album.likes}</span></li>;
    })}</ol>{albums.length > 3 && <ol className="rank-list" start={4}>{albums.slice(3).map((album, index) => <li key={album.id}>
      <span className="rank-list-number">{index + 4}</span>
      <div className="rank-list-main"><Link className="rank-list-title" href={`/album/${album.id}`}>{album.title}</Link><div className="album-card-meta"><Link href={`/model/${album.modelId}`}>{album.modelName}</Link><span>{album.photoCount} 张</span></div></div>
      <div className="rank-list-score"><span className="rank-list-likes" aria-label={`${album.likes} 次点赞`}>♥ {album.likes}</span><span className="rank-list-bar" aria-hidden="true"><span style={{ width: `${highestLikes ? album.likes / highestLikes * 100 : 0}%` }} /></span></div>
    </li>)}</ol>}</> : <EmptyState title="等待第一份喜欢" description="欣赏一个图集，为喜欢的作品点一颗心" />}
  </main></>;
}
