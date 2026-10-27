import { notFound } from "next/navigation";
import { getAlbum, getAlbums, getPhotos } from "@/lib/catalog";
import { AlbumView } from "@/components/album-view";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = getAlbum(id);
  return { title: album ? `${album.modelName} · ${album.title}` : "图集不存在" };
}
export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = getAlbum(id);
  if (!album) notFound();
  const sameModel = getAlbums().filter((item) => item.modelId === album.modelId);
  return <AlbumView album={album} photos={getPhotos(id)} related={sameModel.filter((item) => item.id !== id).slice(0, 8)} modelAlbumCount={sameModel.length} />;
}
