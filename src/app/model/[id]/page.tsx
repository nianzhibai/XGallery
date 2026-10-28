import { NavigationLink as Link } from "@/components/navigation-link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getAlbums, getModels } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { AlbumGrid } from "@/components/album-card";
import { PageHeading } from "@/components/page-parts";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: getModels().find((model) => model.id === id)?.name ?? "模特不存在" };
}
export default async function ModelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> }) {
  const { id } = await params;
  const models = getModels();
  const model = models.find((model) => model.id === id);
  if (!model) notFound();
  const albums = getAlbums().filter((album) => album.modelId === id);
  const pageCount = Math.max(1, Math.ceil(albums.length / 24));
  const requested = (await searchParams).page;
  const pageNumber = typeof requested === "string" && /^[1-9]\d*$/.test(requested) ? Number(requested) : 1;
  const page = Number.isSafeInteger(pageNumber) ? Math.min(pageNumber, pageCount) : 1;
  const likes = albums.reduce((total, album) => total + album.likes, 0);
  const modelUrl = `/model/${model.id}`;
  return <><SiteHeader models={models} /><main id="main-content" className="page-container page-enter">
    <PageHeading title={model.name} description={`模特主页 · ${model.albumCount} 个图集 · ${likes.toLocaleString("zh-CN")} 次点赞${pageCount > 1 ? ` · 第 ${page} / ${pageCount} 页` : ""}`}><Button asChild><Link href="/models">全部模特<ArrowRight size={13} /></Link></Button></PageHeading>
    <AlbumGrid albums={albums.slice((page - 1) * 24, page * 24)} overlay />
    {pageCount > 1 && <nav className="pagination" aria-label="分页">
      {page > 1 ? <Link href={page === 2 ? modelUrl : `${modelUrl}?page=${page - 1}`}>← 上一页</Link> : <span aria-disabled="true">← 上一页</span>}
      <span>{page} / {pageCount}</span>
      {page < pageCount ? <Link href={`${modelUrl}?page=${page + 1}`}>下一页 →</Link> : <span aria-disabled="true">下一页 →</span>}
    </nav>}
  </main></>;
}
