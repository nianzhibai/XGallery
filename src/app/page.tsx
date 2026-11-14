import { homeBatch } from "@/lib/home";
import { SiteHeader } from "@/components/site-header";
import { HomeGallery } from "@/components/home-gallery";
import { EmptyState } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export default function HomePage() {
  const initialRandom = homeBatch("random");
  return <><SiteHeader /><main id="main-content" className="page-container home-container">
    {initialRandom.length ? <HomeGallery initialRecent={homeBatch("recent")} initialRandom={initialRandom} /> : <EmptyState title="光影，等待入藏" description="库中暂无图集" />}
  </main></>;
}
