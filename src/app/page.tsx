import { getAlbums, getModels } from "@/lib/catalog";
import { shuffle } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { HomeGallery } from "@/components/home-gallery";
import { EmptyState } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export default function HomePage() {
  const albums = getAlbums();
  const models = getModels();
  const recentPool = albums.slice(0, Math.max(24, Math.ceil(albums.length / 2)));
  return <><SiteHeader models={models} /><main id="main-content" className="page-container home-container">
    {albums.length ? <HomeGallery albums={albums} recentPool={recentPool} initialRecent={shuffle(recentPool).slice(0, 8)} initialRandom={shuffle(albums).slice(0, 16)} /> : <EmptyState title="光影，等待入藏" description="库中暂无图集" />}
  </main></>;
}
