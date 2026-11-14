import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ne } from "drizzle-orm";
import { albumsDirectory } from "./config";
import { getDatabase } from "./db";
import { albums, models, photos } from "./db/schema";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"]);
const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
export const stableId = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);

/** Top-level directory whose album subdirectories belong to no model. */
export const unassignedDirectory = "@未分类";

// Hidden files and directories are never indexed.
const isVisible = (entry: Dirent) => !entry.name.startsWith(".");
const isImage = (entry: Dirent) => isVisible(entry) && entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase());
const isVisibleDirectory = (entry: Dirent) => isVisible(entry) && entry.isDirectory();

async function findImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (isVisibleDirectory(entry)) result.push(...await findImages(filename));
    else if (isImage(entry)) result.push(filename);
  }
  return result.sort((a, b) => collator.compare(a, b));
}

export async function syncAlbums(onProgress: (message: string) => void = () => {}) {
  const root = albumsDirectory();
  // Read the root before starting: an unavailable mount must never erase the catalog.
  const directories = (await readdir(root, { withFileTypes: true })).filter(isVisibleDirectory);
  const { db } = getDatabase();
  const seenAt = Date.now();
  const existing = new Map(db.select().from(photos).all().map((photo) => [photo.id, photo]));
  const modelRows: (typeof models.$inferInsert)[] = [];
  const albumRows: (typeof albums.$inferInsert)[] = [];
  const photoRows: (typeof photos.$inferInsert)[] = [];
  const warnings: string[] = [];

  /** Indexes the images of an album; `filenames` defaults to every image below `directory`. */
  async function indexAlbum(directory: string, title: string, modelId: string | null, filenames?: string[]) {
    const relativePath = path.relative(root, directory);
    const albumId = stableId(relativePath);
    const items: (typeof photos.$inferInsert)[] = [];
    for (const filename of filenames ?? await findImages(directory)) {
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
          warnings.push(`${photoPath}（无法读取）`);
          continue;
        }
      }
      items.push({ id, albumId, relativePath: photoPath, filename: path.basename(filename),
        width: width!, height: height!, bytes: fileStat.size, modifiedAt, position: items.length, seenAt });
    }
    if (!items.length) return false;
    photoRows.push(...items);
    albumRows.push({ id: albumId, modelId, title, relativePath, coverId: items[0].id, photoCount: items.length,
      totalBytes: items.reduce((total, item) => total + item.bytes, 0),
      updatedAt: Math.max(...items.map((item) => item.modifiedAt)), seenAt });
    return true;
  }

  for (const directory of directories.sort((a, b) => collator.compare(a.name, b.name))) {
    const directoryPath = path.join(root, directory.name);
    const children = await readdir(directoryPath, { withFileTypes: true });
    const albumDirectories = children.filter(isVisibleDirectory);
    // Images directly inside a model directory form an album named after the model.
    const looseImages = children.filter(isImage).map((entry) => path.join(directoryPath, entry.name))
      .sort((a, b) => collator.compare(a, b));
    const isUnassigned = directory.name === unassignedDirectory;
    const modelId = isUnassigned ? null : stableId(directory.name);
    let validAlbums = 0;
    for (const album of albumDirectories) {
      if (await indexAlbum(path.join(directoryPath, album.name), album.name, modelId)) validAlbums++;
    }
    if (isUnassigned) {
      for (const filename of looseImages) warnings.push(`${path.relative(root, filename)}（未分类图片需放入图集子目录）`);
    } else if (looseImages.length && await indexAlbum(directoryPath, directory.name, modelId, looseImages)) {
      validAlbums++;
    }
    if (modelId && validAlbums) modelRows.push({ id: modelId, name: directory.name, seenAt });
    onProgress(`${directory.name} · ${validAlbums} 个图集`);
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
