import { notFound } from "next/navigation";
import { findAlbum, listAlbums, listPhotos } from "@/lib/catalog";
import { AlbumView } from "@/components/album-view";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = findAlbum(id);
  return { title: album ? `${album.modelName} · ${album.title}` : "图集不存在" };
}
export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = findAlbum(id);
  if (!album) notFound();
  // One extra row leaves eight related albums after removing the current one.
  const sameModel = listAlbums({ modelId: album.modelId, page: { limit: 9, offset: 0 } });
  return <AlbumView album={album} photos={listPhotos(id)} related={sameModel.albums.filter((item) => item.id !== id).slice(0, 8)} modelAlbumCount={sameModel.total} />;
}
