import { getAlbums, getModels } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { AlbumGrid } from "@/components/album-card";
import { EmptyState, PageHeading } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "搜索图集" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const albums = query ? getAlbums().filter((album) => terms.every((term) => `${album.modelName} ${album.title}`.toLocaleLowerCase().includes(term))) : [];
  return <><SiteHeader models={getModels()} query={query} /><main id="main-content" className="page-container page-enter"><PageHeading title={query ? <>搜索<span className="quote-mark">「</span>{query}<span className="quote-mark">」</span></> : "搜索图集"} description={query ? `找到 ${albums.length} 个图集` : "输入模特名字或图集关键词，发现喜欢的照片"} />{albums.length ? <AlbumGrid albums={albums} overlay /> : <EmptyState title={query ? "没有找到相关图集" : "想看些什么？"} description={query ? "试试其他关键词，或者去模特页找找" : "在上方搜索框中输入模特或图集名称"} />}</main></>;
}
