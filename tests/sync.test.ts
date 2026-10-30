import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir, mkdtemp, readFile, rename, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const temporary = await mkdtemp(path.join(os.tmpdir(), "xgallery-test-"));
const root = path.join(temporary, "Albums");
process.env.ALBUMS_DIR = root;
process.env.DATABASE_PATH = path.join(temporary, "catalog.db");
const { syncAlbums } = await import("../src/lib/sync");
const { getAlbums, getPhotos, setLike } = await import("../src/lib/catalog");
const { getDatabase } = await import("../src/lib/db");
const { resolveMediaPath } = await import("../src/lib/media");
const { imageUrl } = await import("../src/lib/utils");

after(async () => { getDatabase().sqlite.close(); await rm(temporary, { recursive: true, force: true }); });

test("索引支持中文、嵌套目录、自然排序和 EXIF 方向，并安全同步增删", async (t) => {
  const albumPath = path.join(root, "测试模特", "晨光 [2P]", "图片");
  await mkdir(albumPath, { recursive: true });
  const source = sharp({ create: { width: 60, height: 90, channels: 3, background: "#ad8b63" } });
  await source.clone().jpeg().toFile(path.join(albumPath, "02.jpg"));
  await source.clone().withMetadata({ orientation: 6 }).jpeg().toFile(path.join(albumPath, "10.jpg"));
  await writeFile(path.join(albumPath, "broken.jpg"), "invalid image");
  await writeFile(path.join(albumPath, "ignore.txt"), "not an image");
  const first = await syncAlbums();
  assert.deepEqual({ models: first.models, albums: first.albums, photos: first.photos }, { models: 1, albums: 1, photos: 2 });
  assert.equal(first.warnings.length, 1);
  const album = getAlbums()[0];
  const { GET: randomAlbum } = await import("../src/app/random/route");
  const randomResponse = randomAlbum();
  assert.equal(randomResponse.status, 307);
  assert.equal(randomResponse.headers.get("location"), `/album/${album.id}`, "随机图集使用站内相对地址");
  assert.equal(randomResponse.headers.get("cache-control"), "no-store");
  assert.equal(album.title, "晨光 [2P]");
  const photos = getPhotos(album.id);
  assert.deepEqual(photos.map((photo) => photo.filename), ["02.jpg", "10.jpg"]);
  assert.deepEqual([photos[1].width, photos[1].height], [90, 60]);
  await t.test("媒体服务原样返回文件，保留 EXIF，下载和缓存行为正确", async () => {
    const { GET } = await import("../src/app/api/media/[id]/route");
    const { GET: getPreview } = await import("../src/app/api/media/[id]/preview/[version]/route");
    const bytes = await readFile(path.join(albumPath, "10.jpg"));
    const url = `http://localhost/api/media/${photos[1].id}`;
    const context = { params: Promise.resolve({ id: photos[1].id }) };
    let etag = "";
    for (const query of [`?v=${photos[1].version}`, `?original=1&v=${photos[1].version}`, `?w=320&v=${photos[1].version}`]) {
      const response = await GET(new Request(`${url}${query}`), context);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/jpeg");
      assert.equal(response.headers.get("cache-control"), "public, max-age=604800, must-revalidate");
      assert.equal(response.headers.get("content-length"), String(bytes.length));
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes, "显示的图片与磁盘原文件逐字节一致");
      etag = response.headers.get("etag")!;
    }
    for (const query of ["", "?original=1", "?download=1", "?v=", "?v=invalid"]) {
      const response = await GET(new Request(`${url}${query}`), context);
      assert.equal(response.status, 404);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    const cached = await GET(new Request(`${url}?v=${photos[1].version}`, { headers: { "If-None-Match": etag } }), context);
    assert.equal(cached.status, 304);
    assert.equal(cached.headers.get("cache-control"), "public, max-age=604800, must-revalidate");
    const versionedUrl = `http://localhost${imageUrl(photos[1].id, photos[1].version)}`;
    const versioned = await GET(new Request(versionedUrl), context);
    assert.equal(versioned.status, 200);
    assert.deepEqual(Buffer.from(await versioned.arrayBuffer()), bytes);
    const download = await GET(new Request(`http://localhost${imageUrl(photos[1].id, photos[1].version, true)}`), context);
    assert.match(download.headers.get("content-disposition")!, /^attachment;/);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
    const preview = await getPreview(new Request(url), { params: Promise.resolve({ id: photos[1].id, version: photos[1].version }) });
    assert.equal(preview.status, 200);
    assert.equal(preview.headers.get("cache-control"), "public, max-age=604800, must-revalidate");
    assert.deepEqual(Buffer.from(await preview.arrayBuffer()), bytes);
    const previewCached = await getPreview(new Request(url, { headers: { "If-None-Match": etag } }), { params: Promise.resolve({ id: photos[1].id, version: photos[1].version }) });
    assert.equal(previewCached.status, 304);
    assert.equal(previewCached.headers.get("cache-control"), "public, max-age=604800, must-revalidate");
    const invalidVersion = await getPreview(new Request(url), { params: Promise.resolve({ id: photos[1].id, version: "invalid" }) });
    assert.equal(invalidVersion.status, 404);
    assert.equal(invalidVersion.headers.get("cache-control"), "no-store");
  });
  await t.test("原图和预览图独立使用运行时缓存配置", async () => {
    const { GET } = await import("../src/app/api/media/[id]/route");
    const { GET: getPreview } = await import("../src/app/api/media/[id]/preview/[version]/route");
    const previousOriginal = process.env.ORIGINAL_CACHE_TTL;
    const previousPreview = process.env.PREVIEW_CACHE_TTL;
    try {
      process.env.ORIGINAL_CACHE_TTL = "120";
      process.env.PREVIEW_CACHE_TTL = "600";
      const url = `http://localhost${imageUrl(photos[1].id, photos[1].version)}`;
      const response = await GET(new Request(url), { params: Promise.resolve({ id: photos[1].id }) });
      assert.equal(response.headers.get("cache-control"), "public, max-age=120, must-revalidate");
      await response.arrayBuffer();
      const preview = await getPreview(new Request(url), { params: Promise.resolve({ id: photos[1].id, version: photos[1].version }) });
      assert.equal(preview.headers.get("cache-control"), "public, max-age=600, must-revalidate");
      await preview.arrayBuffer();
      const cached = await getPreview(new Request(url, { headers: { "If-None-Match": preview.headers.get("etag")! } }), { params: Promise.resolve({ id: photos[1].id, version: photos[1].version }) });
      assert.equal(cached.status, 304);
      assert.equal(cached.headers.get("cache-control"), "public, max-age=600, must-revalidate");
    } finally {
      if (previousOriginal === undefined) delete process.env.ORIGINAL_CACHE_TTL;
      else process.env.ORIGINAL_CACHE_TTL = previousOriginal;
      if (previousPreview === undefined) delete process.env.PREVIEW_CACHE_TTL;
      else process.env.PREVIEW_CACHE_TTL = previousPreview;
    }
  });
  assert.equal(setLike(album.id, "test-visitor", true), 1);
  assert.equal(setLike(album.id, "test-visitor", true), 1, "重复请求不重复计数");
  getDatabase().sqlite.prepare("UPDATE albums SET title = ? WHERE id = ?").run("晨光", album.id);
  await syncAlbums();
  assert.equal(getAlbums()[0].id, album.id);
  assert.equal(getAlbums()[0].title, "晨光 [2P]", "重新索引恢复完整目录名");
  assert.equal(getAlbums()[0].likes, 1, "重新索引保留点赞");

  const updatedTime = new Date(Date.now() + 10_000);
  const oldBytes = await readFile(path.join(albumPath, "02.jpg"));
  await sharp({ create: { width: 60, height: 90, channels: 3, background: "#224466" } }).jpeg().toFile(path.join(albumPath, "02.jpg"));
  await utimes(path.join(albumPath, "02.jpg"), updatedTime, updatedTime);
  const { GET: getOriginal } = await import("../src/app/api/media/[id]/route");
  const originalContext = { params: Promise.resolve({ id: photos[0].id }) };
  const oldUrl = `http://localhost${imageUrl(photos[0].id, photos[0].version)}`;
  const beforeSync = await getOriginal(new Request(oldUrl), originalContext);
  assert.equal(beforeSync.status, 404, "文件变更后不会将新文件缓存到旧版本地址");
  assert.equal(beforeSync.headers.get("cache-control"), "no-store");
  const { GET: getPreview } = await import("../src/app/api/media/[id]/preview/[version]/route");
  const stalePreview = await getPreview(new Request(oldUrl), { params: Promise.resolve({ id: photos[0].id, version: photos[0].version }) });
  assert.equal(stalePreview.status, 404, "文件变更后不会将新文件缓存到旧预览地址");
  assert.equal(stalePreview.headers.get("cache-control"), "no-store");
  await syncAlbums();
  assert.notEqual(getAlbums()[0].coverVersion, album.coverVersion, "封面变更后缩略图缓存地址更新");
  const updatedPhoto = getPhotos(album.id)[0];
  assert.notEqual(updatedPhoto.version, photos[0].version, "照片变更后图片缓存地址更新");
  const stale = await getOriginal(new Request(oldUrl), originalContext);
  assert.equal(stale.status, 404);
  assert.equal(stale.headers.get("cache-control"), "no-store");
  const updated = await getOriginal(new Request(`http://localhost${imageUrl(updatedPhoto.id, updatedPhoto.version)}`), originalContext);
  assert.equal(updated.status, 200);
  const updatedBytes = Buffer.from(await updated.arrayBuffer());
  assert.deepEqual(updatedBytes, await readFile(path.join(albumPath, "02.jpg")));
  assert.notDeepEqual(updatedBytes, oldBytes);

  await rm(path.join(albumPath, "02.jpg"));
  await syncAlbums();
  assert.equal(getAlbums()[0].photoCount, 1);
  assert.equal(getPhotos(album.id).length, 1);
  assert.equal(getAlbums()[0].coverId, photos[1].id);

  await rename(root, `${root}-offline`);
  await assert.rejects(syncAlbums());
  assert.equal(getAlbums().length, 1, "挂载不可用时保留已有索引");
  await rename(`${root}-offline`, root);

  assert.equal(await resolveMediaPath(path.relative(root, path.join(albumPath, "10.jpg"))), path.join(albumPath, "10.jpg"));
  const outside = path.join(temporary, "outside.jpg");
  await writeFile(outside, "outside root");
  await symlink(outside, path.join(albumPath, "escape.jpg"));
  await assert.rejects(resolveMediaPath(path.relative(root, path.join(albumPath, "escape.jpg"))));
  await assert.rejects(resolveMediaPath("../outside.jpg"));
  assert.equal(setLike(album.id, "test-visitor", false), 0);
  await rm(path.join(root, "测试模特"), { recursive: true });
  await syncAlbums();
  assert.equal(getAlbums().length, 0);
  assert.equal(randomAlbum().headers.get("location"), "/", "没有图集时返回首页");
  assert.equal(getPhotos(album.id).length, 0);
});
