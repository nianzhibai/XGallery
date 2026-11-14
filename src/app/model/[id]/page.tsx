import { NavigationLink as Link } from "@/components/navigation-link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { findModel, listAlbums } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { AlbumGrid } from "@/components/album-card";
import { PageHeading } from "@/components/page-parts";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
const albumsPerPage = 24;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: findModel(id)?.name ?? "模特不存在" };
}
export default async function ModelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> }) {
  const { id } = await params;
  const model = findModel(id);
  if (!model) notFound();
  const pageCount = Math.max(1, Math.ceil(model.albumCount / albumsPerPage));
  const requested = (await searchParams).page;
  const pageNumber = typeof requested === "string" && /^[1-9]\d*$/.test(requested) ? Number(requested) : 1;
  const page = Number.isSafeInteger(pageNumber) ? Math.min(pageNumber, pageCount) : 1;
  const { albums } = listAlbums({ modelId: id, page: { limit: albumsPerPage, offset: (page - 1) * albumsPerPage } });
  const modelUrl = `/model/${model.id}`;
  return <><SiteHeader /><main id="main-content" className="page-container page-enter">
    <PageHeading title={model.name} description={`模特主页 · ${model.albumCount} 个图集 · ${model.likeCount.toLocaleString("zh-CN")} 次点赞${pageCount > 1 ? ` · 第 ${page} / ${pageCount} 页` : ""}`}><Button asChild><Link href="/models">全部模特<ArrowRight size={13} /></Link></Button></PageHeading>
    <AlbumGrid albums={albums} overlay />
    {pageCount > 1 && <nav className="pagination" aria-label="分页">
      {page > 1 ? <Link href={page === 2 ? modelUrl : `${modelUrl}?page=${page - 1}`}>← 上一页</Link> : <span aria-disabled="true">← 上一页</span>}
      <span>{page} / {pageCount}</span>
      {page < pageCount ? <Link href={`${modelUrl}?page=${page + 1}`}>下一页 →</Link> : <span aria-disabled="true">下一页 →</span>}
    </nav>}
  </main></>;
}
