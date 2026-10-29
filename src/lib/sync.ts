import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ne } from "drizzle-orm";
import { albumsDirectory } from "./config";
import { getDatabase } from "./db";
import { albums, models, photos } from "./db/schema";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"]);
const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
export const stableId = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);

async function findImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findImages(filename));
    else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) result.push(filename);
  }
  return result.sort((a, b) => collator.compare(a, b));
}

export async function syncAlbums(onProgress: (message: string) => void = () => {}) {
  const root = albumsDirectory();
  // Read the root before starting: an unavailable mount must never erase the catalog.
  const directories = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));
  const { db } = getDatabase();
  const seenAt = Date.now();
  const existing = new Map(db.select().from(photos).all().map((photo) => [photo.id, photo]));
  const modelRows: (typeof models.$inferInsert)[] = [];
  const albumRows: (typeof albums.$inferInsert)[] = [];
  const photoRows: (typeof photos.$inferInsert)[] = [];
  const warnings: string[] = [];

  for (const model of directories.sort((a, b) => collator.compare(a.name, b.name))) {
    const modelPath = path.join(root, model.name);
    const modelId = stableId(model.name);
    const children = await readdir(modelPath, { withFileTypes: true });
    const albumDirectories = children.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => ({ name: entry.name, directory: path.join(modelPath, entry.name) }));
    if (children.some((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))) {
      albumDirectories.push({ name: model.name, directory: modelPath });
    }
    let validAlbums = 0;
    for (const album of albumDirectories) {
      const relativePath = path.relative(root, album.directory);
      const albumId = stableId(relativePath);
      let filenames = await findImages(album.directory);
      if (album.directory === modelPath) filenames = filenames.filter((filename) => path.dirname(filename) === modelPath);
      const items: (typeof photos.$inferInsert)[] = [];
      for (const filename of filenames) {
        const photoPath = path.relative(root, filename);
        const id = stableId(photoPath);
        const fileStat = await stat(filename);
        const modifiedAt = Math.trunc(fileStat.mtimeMs);
        const previous = existing.get(id);
        let width = previous?.width;
        let height = previous?.height;
        if (!previous || previous.bytes !== fileStat.size || previous.modifiedAt !== modifiedAt) {
          try {
            const metadata = await sharp(filename, { limitInputPixels: 150_000_000 }).metadata();
            width = metadata.autoOrient?.width ?? metadata.width;
            height = metadata.autoOrient?.height ?? metadata.height;
            if (!width || !height) throw new Error("无法读取图片尺寸");
          } catch {
            warnings.push(photoPath);
            continue;
          }
        }
        items.push({ id, albumId, relativePath: photoPath, filename: path.basename(filename),
          width: width!, height: height!, bytes: fileStat.size, modifiedAt, position: items.length, seenAt });
      }
      if (!items.length) continue;
      photoRows.push(...items);
      albumRows.push({ id: albumId, modelId, title: album.name,
        relativePath, coverId: items[0].id, photoCount: items.length,
        totalBytes: items.reduce((total, item) => total + item.bytes, 0),
        updatedAt: Math.max(...items.map((item) => item.modifiedAt)), seenAt });
      validAlbums++;
    }
    if (validAlbums) modelRows.push({ id: modelId, name: model.name, seenAt });
    onProgress(`${model.name} · ${validAlbums} 个图集`);
  }

  db.transaction((tx) => {
    for (const row of modelRows) tx.insert(models).values(row).onConflictDoUpdate({ target: models.id, set: row }).run();
    for (const row of albumRows) tx.insert(albums).values(row).onConflictDoUpdate({ target: albums.id, set: row }).run();
    for (const row of photoRows) tx.insert(photos).values(row).onConflictDoUpdate({ target: photos.id, set: row }).run();
    tx.delete(photos).where(ne(photos.seenAt, seenAt)).run();
    tx.delete(albums).where(ne(albums.seenAt, seenAt)).run();
    tx.delete(models).where(ne(models.seenAt, seenAt)).run();
  });
  return { models: modelRows.length, albums: albumRows.length, photos: photoRows.length, warnings };
}
