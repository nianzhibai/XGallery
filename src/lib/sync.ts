import { createHash } from "node:crypto";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ne } from "drizzle-orm";
import { albumsDirectory, includeAnimatedImages } from "./config";
import { getDatabase } from "./db";
import { albums, imageMetadataCache, models, photos } from "./db/schema";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"]);
const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
// Preserve existing 0/1 cache entries while representing images not yet checked.
const animationUnknown = -1;
const animatedImage = 1;
export const stableId = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);

// APNG animation metadata is not exposed by Sharp, so inspect PNG chunks before image data.
async function isAnimatedPng(filename: string, size: number) {
  const file = await open(filename, "r");
  try {
    const chunk = Buffer.alloc(12);
    let offset = 8;
    while (offset + 12 <= size) {
      if ((await file.read(chunk, 0, 8, offset)).bytesRead !== 8) break;
      const length = chunk.readUInt32BE(0);
      if (length > size - offset - 12) break;
      const type = chunk.toString("ascii", 4, 8);
      if (type === "IDAT" || type === "IEND") break;
      if (type === "acTL" && length === 8) {
        if ((await file.read(chunk, 0, 4, offset + 8)).bytesRead !== 4) break;
        return chunk.readUInt32BE(0) > 1;
      }
      offset += length + 12;
    }
    return false;
  } finally {
    await file.close();
  }
}

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
  const includeAnimated = includeAnimatedImages();
  // Read the root before starting: an unavailable mount must never erase the catalog.
  const directories = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));
  const { db } = getDatabase();
  const seenAt = Date.now();
  const existing = new Map(db.select().from(imageMetadataCache).all().map((entry) => [entry.id, entry]));
  const modelRows: (typeof models.$inferInsert)[] = [];
  const albumRows: (typeof albums.$inferInsert)[] = [];
  const photoRows: (typeof photos.$inferInsert)[] = [];
  const metadataRows: (typeof imageMetadataCache.$inferInsert)[] = [];
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
        const metadataId = stableId(filename);
        const fileStat = await stat(filename);
        const modifiedAt = Math.trunc(fileStat.mtimeMs);
        const previous = existing.get(metadataId);
        let entry = previous;
        if (!entry || entry.bytes !== fileStat.size || entry.modifiedAt !== modifiedAt
          || (!includeAnimated && entry.animated === animationUnknown)) {
          try {
            const metadata = await sharp(filename, { limitInputPixels: 150_000_000 }).metadata();
            const animated = includeAnimated ? animationUnknown : Number(
              (["gif", "webp", "heif"].includes(metadata.format ?? "") && (metadata.pages ?? 1) > 1)
              || (metadata.format === "png" && await isAnimatedPng(filename, fileStat.size))
            );
            const width = metadata.autoOrient?.width ?? metadata.width;
            const height = metadata.autoOrient?.height ?? metadata.height;
            if (!width || !height) throw new Error("无法读取图片尺寸");
            entry = { id: metadataId, bytes: fileStat.size, modifiedAt, width, height, animated, seenAt };
          } catch {
            warnings.push(photoPath);
            continue;
          }
        }
        metadataRows.push({ ...entry, seenAt });
        if (!includeAnimated && entry.animated === animatedImage) continue;
        items.push({ id, albumId, relativePath: photoPath, filename: path.basename(filename),
          width: entry.width, height: entry.height, bytes: fileStat.size, modifiedAt, position: items.length, seenAt });
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
    for (const row of metadataRows) tx.insert(imageMetadataCache).values(row).onConflictDoUpdate({ target: imageMetadataCache.id, set: row }).run();
    tx.delete(photos).where(ne(photos.seenAt, seenAt)).run();
    tx.delete(albums).where(ne(albums.seenAt, seenAt)).run();
    tx.delete(models).where(ne(models.seenAt, seenAt)).run();
    tx.delete(imageMetadataCache).where(ne(imageMetadataCache.seenAt, seenAt)).run();
  });
  return { models: modelRows.length, albums: albumRows.length, photos: photoRows.length, warnings };
}
