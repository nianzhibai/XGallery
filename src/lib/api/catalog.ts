import { getDatabase } from "../db";

function photoUrl(id: string, version: string) {
  return `/api/v1/photos/${id}?v=${encodeURIComponent(version)}`;
}

type Page = { limit: number; offset: number };
type AlbumRow = { id: string; title: string; modelId: string; modelName: string; coverId: string; coverVersion: string; photoCount: number; totalBytes: number; updatedAt: number; likeCount: number };
type ModelRow = { id: string; name: string; albumCount: number; photoCount: number; coverId: string; coverVersion: string };
type PhotoRow = { id: string; filename: string; width: number; height: number; position: number; version: string };

function photo(row: PhotoRow) {
  return { id: row.id, filename: row.filename, width: row.width, height: row.height,
    position: row.position, imageUrl: photoUrl(row.id, row.version) };
}

const albumSelect = `SELECT a.id, a.title, m.id AS modelId, m.name AS modelName,
  a.cover_id AS coverId, CAST(p.modified_at AS TEXT) || '-' || CAST(p.bytes AS TEXT) AS coverVersion,
  a.photo_count AS photoCount, a.total_bytes AS totalBytes, a.updated_at AS updatedAt,
  (SELECT count(*) FROM likes l WHERE l.album_id = a.id) AS likeCount
  FROM albums a JOIN models m ON m.id = a.model_id JOIN photos p ON p.id = a.cover_id`;
const modelSelect = `SELECT m.id, m.name, count(a.id) AS albumCount, sum(a.photo_count) AS photoCount,
  p.id AS coverId, CAST(p.modified_at AS TEXT) || '-' || CAST(p.bytes AS TEXT) AS coverVersion
  FROM models m JOIN albums a ON a.model_id = m.id
  JOIN photos p ON p.id = (SELECT cover_id FROM albums WHERE model_id = m.id ORDER BY updated_at DESC, id ASC LIMIT 1)`;

function album(row: AlbumRow) {
  return { id: row.id, title: row.title, model: { id: row.modelId, name: row.modelName },
    photoCount: row.photoCount, totalBytes: row.totalBytes, likeCount: row.likeCount,
    coverUrl: photoUrl(row.coverId, row.coverVersion), updatedAt: new Date(row.updatedAt).toISOString() };
}
function model(row: ModelRow) {
  return { id: row.id, name: row.name, albumCount: row.albumCount, photoCount: row.photoCount,
    coverUrl: photoUrl(row.coverId, row.coverVersion) };
}

export function listModels(page: Page) {
  const db = getDatabase().sqlite;
  const total = (db.prepare("SELECT count(*) AS total FROM models WHERE EXISTS (SELECT 1 FROM albums WHERE model_id = models.id)").get() as { total: number }).total;
  const rows = db.prepare(`${modelSelect} GROUP BY m.id ORDER BY m.name ASC, m.id ASC LIMIT ? OFFSET ?`).all(page.limit, page.offset) as ModelRow[];
  return { total, data: rows.map(model) };
}

export function listAlbums(page: Page, options: { modelId?: string; query?: string; sort: "updated" | "title" | "popular" }) {
  const conditions: string[] = [];
  const values: string[] = [];
  if (options.modelId) { conditions.push("a.model_id = ?"); values.push(options.modelId); }
  for (const term of (options.query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean)) {
    conditions.push("instr(lower(m.name || ' ' || a.title), ?) > 0"); values.push(term);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const order = { updated: "a.updated_at DESC, a.title ASC, a.id ASC", title: "a.title ASC, a.id ASC", popular: "likeCount DESC, a.updated_at DESC, a.id ASC" }[options.sort];
  const db = getDatabase().sqlite;
  const total = (db.prepare(`SELECT count(*) AS total FROM albums a JOIN models m ON m.id = a.model_id JOIN photos p ON p.id = a.cover_id${where}`).get(...values) as { total: number }).total;
  const rows = db.prepare(`${albumSelect}${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...values, page.limit, page.offset) as AlbumRow[];
  return { total, data: rows.map(album) };
}

export function findAlbum(id: string) {
  const row = getDatabase().sqlite.prepare(`${albumSelect} WHERE a.id = ?`).get(id) as AlbumRow | undefined;
  return row && album(row);
}

export function listPhotos(albumId: string, page: Page) {
  const db = getDatabase().sqlite;
  const total = (db.prepare("SELECT count(*) AS total FROM photos WHERE album_id = ?").get(albumId) as { total: number }).total;
  const rows = db.prepare(`SELECT id, filename, width, height, position,
    CAST(modified_at AS TEXT) || '-' || CAST(bytes AS TEXT) AS version FROM photos
    WHERE album_id = ? ORDER BY position ASC, id ASC LIMIT ? OFFSET ?`).all(albumId, page.limit, page.offset) as PhotoRow[];
  return { total, data: rows.map(photo) };
}

export function randomPhoto() {
  const row = getDatabase().sqlite.prepare(`SELECT p.id, p.album_id AS albumId, a.model_id AS modelId, m.name AS modelName,
    p.filename, p.width, p.height, p.position,
    CAST(p.modified_at AS TEXT) || '-' || CAST(p.bytes AS TEXT) AS version
    FROM photos p JOIN albums a ON a.id = p.album_id JOIN models m ON m.id = a.model_id
    ORDER BY random() LIMIT 1`).get() as (PhotoRow & { albumId: string; modelId: string; modelName: string }) | undefined;
  return row && { ...photo(row), albumId: row.albumId, modelId: row.modelId, modelName: row.modelName };
}
