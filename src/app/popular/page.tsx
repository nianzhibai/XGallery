import Link from "next/link";
import { Heart } from "lucide-react";
import { getAlbums, getModels } from "@/lib/catalog";
import { imageUrl } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, Footer, PageHeading } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "最受喜爱" };
export default function PopularPage() {
  const albums = getAlbums().sort((a, b) => b.likes - a.likes || b.updatedAt - a.updatedAt).slice(0, 100);
  return <><SiteHeader models={getModels()} /><main id="main-content" className="page-container page-enter"><PageHeading title="最受喜爱" description="按累计点赞排序 · 每一次喜欢，都算数" />
    {albums.length ? <div className="popular-grid">{albums.map((album, index) => <article className="popular-card" key={album.id}><Link href={`/album/${album.id}`} className="popular-cover"><span className={`popular-rank${index < 3 ? " top-rank" : ""}`}>{index + 1}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl(album.coverId)} width={600} height={750} alt={`${album.modelName} · ${album.title}`} loading={index < 3 ? "eager" : "lazy"} decoding="async" />
      </Link><h2><Link href={`/album/${album.id}`}>{album.title}</Link></h2><div className="album-card-meta"><Link href={`/model/${album.modelId}`}>{album.modelName}</Link><span>{album.photoCount} 张</span></div><span className="popular-likes"><Heart size={12} fill="currentColor" />{album.likes}</span></article>)}</div> : <EmptyState title="等待第一份喜欢" description="欣赏一个图集，为喜欢的作品点一颗心。" />}
    <Footer /></main></>;
}
