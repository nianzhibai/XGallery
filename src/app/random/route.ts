import { NextResponse } from "next/server";
import { getAlbums } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const albums = getAlbums();
  const album = albums[Math.floor(Math.random() * albums.length)];
  return NextResponse.redirect(new URL(album ? `/album/${album.id}` : "/", request.url));
}
