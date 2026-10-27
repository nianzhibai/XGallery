import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getAlbums, getModels } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { AlbumGrid } from "@/components/album-card";
import { Footer, PageHeading } from "@/components/page-parts";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: getModels().find((model) => model.id === id)?.name ?? "模特不存在" };
}
export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const models = getModels();
  const model = models.find((model) => model.id === id);
  if (!model) notFound();
  const albums = getAlbums().filter((album) => album.modelId === id);
  return <><SiteHeader models={models} /><main id="main-content" className="page-container page-enter"><PageHeading title={model.name} description={`模特主页 · ${model.albumCount} 个图集 · ${model.photoCount.toLocaleString("zh-CN")} 张照片`}><Button asChild><Link href="/models">全部模特<ArrowRight size={13} /></Link></Button></PageHeading><AlbumGrid albums={albums} /><Footer /></main></>;
}
