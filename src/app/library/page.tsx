import { getAlbums, getModels } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { LibraryGallery } from "@/components/library-gallery";
import { Footer } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "我的收藏" };
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <><SiteHeader models={getModels()} /><main id="main-content" className="page-container page-enter"><LibraryGallery albums={getAlbums()} tab={tab ?? "favorites"} /><Footer /></main></>;
}
