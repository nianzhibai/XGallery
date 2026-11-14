import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDatabase } from "./db";
import { albums, likes, models, photos } from "./db/schema";
import type { Album, AlbumSort, Model, ModelSuggestion, Photo } from "./types";

type Page = { limit: number; offset: number };
export type AlbumPool = "all" | "recent";

const photoVersion = sql<string>`cast(${photos.modifiedAt} as text) || '-' || cast(${photos.bytes} as text)`;
const albumLikes = sql<number>`(select count(*) from ${likes} where ${likes.albumId} = ${albums.id})`;
const albumOrder: Record<AlbumSort, SQL[]> = {
  updated: [desc(albums.updatedAt), asc(albums.title), asc(albums.id)],
  title: [asc(albums.title), asc(albums.id)],
  popular: [desc(albumLikes), desc(albums.updatedAt), asc(albums.id)],
};
// The recent pool is the newer half of the catalog, but never fewer than 24 albums.
const recentAlbumIds = sql`(select id from albums order by updated_at desc, title asc, id asc
  limit max(24, (select (count(*) + 1) / 2 from albums)))`;
const inPool = (pool: AlbumPool) => pool === "recent" ? sql`${albums.id} in ${recentAlbumIds}` : undefined;

function selectAlbums(where?: SQL) {
  return getDatabase().db.select({
    id: albums.id, title: albums.title, model: { id: models.id, name: models.name },
    coverId: albums.coverId, coverVersion: photoVersion, photoCount: albums.photoCount,
    totalBytes: albums.totalBytes, updatedAt: albums.updatedAt, likes: albumLikes,
  }).from(albums)
    .leftJoin(models, eq(models.id, albums.modelId))
    .innerJoin(photos, eq(photos.id, albums.coverId))
    .where(where).$dynamic();
}

// SQLite's built-in lower() only folds ASCII; unicode_lower is registered on the connection.
function matchesQuery(query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return and(...terms.map((term) => sql`instr(unicode_lower(coalesce(${models.name} || ' ', '') || ${albums.title}), ${term}) > 0`));
}

export function listAlbums({ modelId, query = "", sort = "updated", page }: {
  modelId?: string; query?: string; sort?: AlbumSort; page?: Page;
} = {}): { albums: Album[]; total: number } {
  const where = and(modelId ? eq(albums.modelId, modelId) : undefined, matchesQuery(query));
  const rows = selectAlbums(where).orderBy(...albumOrder[sort]);
  if (!page) {
    const all = rows.all();
    return { albums: all, total: all.length };
  }
  const { total } = getDatabase().db.select({ total: count() }).from(albums)
    .leftJoin(models, eq(models.id, albums.modelId)).where(where).get()!;
  return { albums: rows.limit(page.limit).offset(page.offset).all(), total };
}

export function findAlbum(id: string): Album | undefined {
  return selectAlbums(eq(albums.id, id)).get();
}

/** Returns the albums that still exist in `pool`, in the order of `ids`. */
export function findAlbums(ids: string[], pool: AlbumPool = "all"): Album[] {
  const found = new Map(selectAlbums(and(inArray(albums.id, ids), inPool(pool))).all().map((album) => [album.id, album]));
  return ids.flatMap((id) => found.get(id) ?? []);
}

export function countAlbums(pool: AlbumPool = "all") {
  return getDatabase().db.select({ total: count() }).from(albums).where(inPool(pool)).get()!.total;
}

/** Picks random albums, using albums outside `exclude` first. */
export function randomAlbums({ count: limit, pool, exclude = [] }: { count: number; pool: AlbumPool; exclude?: string[] }): Album[] {
  return selectAlbums(inPool(pool))
    .orderBy(inArray(albums.id, exclude), sql`random()`).limit(limit).all();
}

export function randomAlbumId(): string | undefined {
  return getDatabase().db.select({ id: albums.id }).from(albums).orderBy(sql`random()`).limit(1).get()?.id;
}

function selectModels(where?: SQL) {
  const latestCoverId = sql`(select cover_id from albums a where a.model_id = ${models.id}
    order by a.updated_at desc, a.id asc limit 1)`;
  return getDatabase().db.select({
    id: models.id, name: models.name,
    albumCount: count(albums.id),
    photoCount: sql<number>`sum(${albums.photoCount})`,
    likeCount: sql<number>`(select count(*) from likes l join albums a on a.id = l.album_id where a.model_id = ${models.id})`,
    coverId: photos.id, coverVersion: photoVersion,
  }).from(models)
    .innerJoin(albums, eq(albums.modelId, models.id))
    .innerJoin(photos, eq(photos.id, latestCoverId))
    .where(where).groupBy(models.id).orderBy(asc(models.name), asc(models.id)).$dynamic();
}

export function listModels(page?: Page): { models: Model[]; total: number } {
  if (!page) {
    const all = selectModels().all();
    return { models: all, total: all.length };
  }
  const { total } = getDatabase().db.select({ total: sql<number>`count(distinct ${albums.modelId})` }).from(albums).get()!;
  return { models: selectModels().limit(page.limit).offset(page.offset).all(), total };
}

export function findModel(id: string): Model | undefined {
  return selectModels(eq(models.id, id)).get();
}

export function listModelSuggestions(): ModelSuggestion[] {
  return getDatabase().db.select({ id: models.id, name: models.name, albumCount: count(albums.id) })
    .from(models).innerJoin(albums, eq(albums.modelId, models.id))
    .groupBy(models.id).orderBy(asc(models.name), asc(models.id)).all();
}

export function listPhotos(albumId: string, page?: Page): Photo[] {
  const rows = getDatabase().db.select({
    id: photos.id, filename: photos.filename,
    width: photos.width, height: photos.height, position: photos.position,
    version: photoVersion,
  }).from(photos).where(eq(photos.albumId, albumId)).orderBy(asc(photos.position), asc(photos.id)).$dynamic();
  return page ? rows.limit(page.limit).offset(page.offset).all() : rows.all();
}

export function randomPhoto() {
  return getDatabase().db.select({
    id: photos.id, filename: photos.filename,
    width: photos.width, height: photos.height, position: photos.position,
    version: photoVersion,
    albumId: photos.albumId, model: { id: models.id, name: models.name },
  }).from(photos)
    .innerJoin(albums, eq(albums.id, photos.albumId))
    .leftJoin(models, eq(models.id, albums.modelId))
    .orderBy(sql`random()`).limit(1).get();
}

export function getPhotoFile(id: string) {
  return getDatabase().db.select().from(photos).where(eq(photos.id, id)).get();
}

export function setLike(albumId: string, visitorId: string, liked: boolean) {
  const { db } = getDatabase();
  if (liked) db.insert(likes).values({ albumId, visitorId, createdAt: Date.now() }).onConflictDoNothing().run();
  else db.delete(likes).where(and(eq(likes.albumId, albumId), eq(likes.visitorId, visitorId))).run();
  return db.select({ count: count() }).from(likes).where(eq(likes.albumId, albumId)).get()!.count;
}
