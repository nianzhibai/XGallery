import { getAlbums } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export function GET() {
  const albums = getAlbums();
  const album = albums[Math.floor(Math.random() * albums.length)];
  return new Response(null, { status: 307, headers: { Location: album ? `/album/${album.id}` : "/", "Cache-Control": "no-store" } });
}
