import { asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "./db";
import { albums, likes, models, photos } from "./db/schema";
import type { Album, Model } from "./types";

export function getAlbums(): Album[] {
  return getDatabase().db.select({
    id: albums.id, title: albums.title, modelId: albums.modelId,
    modelName: models.name, coverId: albums.coverId, photoCount: albums.photoCount,
    totalBytes: albums.totalBytes, updatedAt: albums.updatedAt,
    likes: sql<number>`(select count(*) from likes where likes.album_id = ${albums.id})`,
  }).from(albums).innerJoin(models, eq(models.id, albums.modelId))
    .orderBy(desc(albums.updatedAt), asc(albums.title)).all();
}

export function getModels(): Model[] {
  return getDatabase().db.select({
    id: models.id, name: models.name,
    albumCount: sql<number>`count(${albums.id})`,
    photoCount: sql<number>`coalesce(sum(${albums.photoCount}), 0)`,
    coverId: sql<string>`(select cover_id from albums a where a.model_id = ${models.id} order by a.updated_at desc, a.id limit 1)`,
  }).from(models).innerJoin(albums, eq(albums.modelId, models.id))
    .groupBy(models.id).orderBy(asc(models.name)).all();
}

export function getAlbum(id: string) {
  return getAlbums().find((album) => album.id === id);
}

export function getPhotos(albumId: string) {
  return getDatabase().db.select({
    id: photos.id, filename: photos.filename,
    width: photos.width, height: photos.height, position: photos.position,
  }).from(photos).where(eq(photos.albumId, albumId)).orderBy(asc(photos.position)).all();
}

export function getPhotoFile(id: string) {
  return getDatabase().db.select().from(photos).where(eq(photos.id, id)).get();
}

export function setLike(albumId: string, visitorId: string, liked: boolean) {
  const { db } = getDatabase();
  if (liked) db.insert(likes).values({ albumId, visitorId, createdAt: Date.now() }).onConflictDoNothing().run();
  else db.delete(likes).where(sql`${likes.albumId} = ${albumId} and ${likes.visitorId} = ${visitorId}`).run();
  return db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.albumId, albumId)).get()!.count;
}
