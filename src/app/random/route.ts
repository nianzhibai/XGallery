import { randomAlbumId } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export function GET() {
  const id = randomAlbumId();
  return new Response(null, { status: 307, headers: { Location: id ? `/album/${id}` : "/", "Cache-Control": "no-store" } });
}
