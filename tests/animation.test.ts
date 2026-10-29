import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
const temporary = await mkdtemp(path.join(os.tmpdir(), "xgallery-animation-test-"));
const root = path.join(temporary, "Albums");
process.env.ALBUMS_DIR = root;
process.env.DATABASE_PATH = path.join(temporary, "catalog.db");
delete process.env.INCLUDE_ANIMATED_IMAGES;
const { stableId, syncAlbums } = await import("../src/lib/sync");
const { getAlbums, getPhotos } = await import("../src/lib/catalog");
const { getDatabase } = await import("../src/lib/db");

after(async () => { getDatabase().sqlite.close(); await rm(temporary, { recursive: true, force: true }); });

test("默认读取动图，仅关闭时检测并缓存动图状态", async () => {
  const albumPath = path.join(root, "模特", "图集");
  await mkdir(albumPath, { recursive: true });
  const staticImage = sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } });
  await staticImage.clone().gif().toFile(path.join(albumPath, "01-static.gif"));
  await staticImage.clone().png().toFile(path.join(albumPath, "02-static.png"));
  const frames = Buffer.from([255, 0, 0, 255, 0, 0, 255, 255]);
  const animated = () => sharp(frames, { raw: { width: 1, height: 2, channels: 4, pageHeight: 1 } });
  await animated().gif({ delay: 100 }).toFile(path.join(albumPath, "03-animated.gif"));
  await animated().webp({ delay: 100 }).toFile(path.join(albumPath, "04-animated.webp"));
  const apng = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACGFjVEwAAAACAAAAAPONk3AAAAAaZmNUTAAAAAAAAAACAAAAAgAAAAAAAAAAAAEACgAA6FTcAAAAABVJREFUeJxj/M/A8J+BgYGBCUSAMAAfFwICAkezFAAAABpmY1RMAAAAAQAAAAIAAAACAAAAAAAAAAAAAQAKAABzJzbUAAAAGWZkQVQAAAACeJxjZGD4/5+BgYGBCUSAMAAdGQICRW6eVwAAAABJRU5ErkJggg==";
  await writeFile(path.join(albumPath, "05-animated.png"), Buffer.from(apng, "base64"));

  const filenames = () => getPhotos(getAlbums()[0].id).map((photo) => photo.filename);
  assert.equal((await syncAlbums()).photos, 5);
  assert.deepEqual(filenames(), ["01-static.gif", "02-static.png", "03-animated.gif", "04-animated.webp", "05-animated.png"]);
  const cache = getDatabase().sqlite;
  assert.equal((cache.prepare("SELECT count(*) AS count FROM image_metadata_cache").get() as { count: number }).count, 5);
  assert.equal((cache.prepare("SELECT count(*) AS count FROM image_metadata_cache WHERE animated = -1").get() as { count: number }).count, 5, "默认不检测动图状态");
  process.env.INCLUDE_ANIMATED_IMAGES = "false";
  assert.equal((await syncAlbums()).photos, 2);
  assert.deepEqual(filenames(), ["01-static.gif", "02-static.png"]);
  assert.equal((cache.prepare("SELECT count(*) AS count FROM image_metadata_cache WHERE animated = 1").get() as { count: number }).count, 3);
  const animatedId = stableId(path.relative(root, path.join(albumPath, "03-animated.gif")));
  const metadataId = stableId(path.join(albumPath, "03-animated.gif"));
  cache.prepare("UPDATE image_metadata_cache SET width = 13 WHERE id = ?").run(metadataId);

  process.env.INCLUDE_ANIMATED_IMAGES = "true";
  assert.equal((await syncAlbums()).photos, 5);
  assert.deepEqual(filenames(), ["01-static.gif", "02-static.png", "03-animated.gif", "04-animated.webp", "05-animated.png"]);
  assert.equal(getPhotos(getAlbums()[0].id).find((photo) => photo.id === animatedId)?.width, 13, "复用此前被跳过的动图元数据");

  const changedTime = new Date(Date.now() + 10_000);
  await utimes(path.join(albumPath, "03-animated.gif"), changedTime, changedTime);
  await syncAlbums();
  assert.equal(getPhotos(getAlbums()[0].id).find((photo) => photo.id === animatedId)?.width, 1, "文件变化后重新读取元数据");
  assert.equal((cache.prepare("SELECT animated FROM image_metadata_cache WHERE id = ?").get(metadataId) as { animated: number }).animated, -1, "启用动图时，文件变化后暂不检测");

  process.env.INCLUDE_ANIMATED_IMAGES = "false";
  assert.equal((await syncAlbums()).photos, 2);
  assert.deepEqual(filenames(), ["01-static.gif", "02-static.png"]);
  assert.equal((cache.prepare("SELECT animated FROM image_metadata_cache WHERE id = ?").get(metadataId) as { animated: number }).animated, 1, "关闭动图后检测未判断的文件");
  await rm(path.join(albumPath, "05-animated.png"));
  await syncAlbums();
  assert.equal((cache.prepare("SELECT count(*) AS count FROM image_metadata_cache").get() as { count: number }).count, 4, "清理已删除文件的缓存");
});
