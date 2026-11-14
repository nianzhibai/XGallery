import { SiteHeader } from "@/components/site-header";
import { LibraryGallery } from "@/components/library-gallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "我的收藏" };
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "favorites" } = await searchParams;
  // Each tab is its own view: remounting on a tab switch revalidates its albums.
  return <><SiteHeader /><main id="main-content" className="page-container page-enter library-page"><LibraryGallery key={tab} tab={tab} /></main></>;
}
