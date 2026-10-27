import { getAlbums, getModels } from "@/lib/catalog";
import { shuffle } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { HomeGallery } from "@/components/home-gallery";
import { EmptyState, Footer } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export default function HomePage() {
  const albums = getAlbums();
  const models = getModels();
  return <><SiteHeader models={models} /><main id="main-content" className="page-container home-container page-enter">
    {albums.length ? <HomeGallery albums={albums} initialRandom={shuffle(albums).slice(0, 16)} /> : <EmptyState title="光影，等待入藏" description="还没有图集。请先在项目目录运行 npm run albums:sync。" link="/models" action="查看模特" />}
    <Footer stats={{ models: models.length, albums: albums.length, photos: albums.reduce((sum, album) => sum + album.photoCount, 0) }} />
  </main></>;
}
