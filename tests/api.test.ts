import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const temporary = await mkdtemp(path.join(os.tmpdir(), "xgallery-api-"));
process.env.ALBUMS_DIR = path.join(temporary, "albums");
process.env.DATABASE_PATH = path.join(temporary, "catalog.db");
const { syncAlbums } = await import("../src/lib/sync");
const { getDatabase } = await import("../src/lib/db");
const { GET: models } = await import("../src/app/api/v1/models/route");
const { GET: albums } = await import("../src/app/api/v1/albums/route");
const { GET: albumDetail } = await import("../src/app/api/v1/albums/[id]/route");
const { GET: photos } = await import("../src/app/api/v1/albums/[id]/photos/route");
const { GET: media } = await import("../src/app/api/media/[id]/route");
const { GET: apiPhoto } = await import("../src/app/api/v1/photos/[id]/route");
const { GET: randomPhoto } = await import("../src/app/api/v1/photos/random/route");
const key = "test-secret-key";
const request = (url: string, authorization = `Bearer ${key}`) => new Request(`http://localhost${url}`, { headers: authorization ? { authorization } : {} });
const context = (id: string) => ({ params: Promise.resolve({ id }) });

after(async () => { getDatabase().sqlite.close(); await rm(temporary, { recursive: true, force: true }); });

test("只读 API", async (t) => {
  const a = path.join(process.env.ALBUMS_DIR!, "模特 A", "Morning");
  const b = path.join(process.env.ALBUMS_DIR!, "模特 B", "Evening");
  await mkdir(a, { recursive: true });
  await mkdir(b, { recursive: true });
  for (const filename of [path.join(a, "1.jpg"), path.join(a, "2.jpg"), path.join(b, "1.jpg")]) {
    await sharp({ create: { width: 20, height: 10, channels: 3, background: "white" } }).jpeg().toFile(filename);
  }
  process.env.API_ENABLED = "true";
  process.env.API_KEYS = key;
  await t.test("无图片时随机接口返回 404", async () => {
    const emptyRandom = randomPhoto(request("/api/v1/photos/random"));
    assert.equal(emptyRandom.status, 404);
    assert.equal((await emptyRandom.json()).error.code, "not_found");
  });
  await syncAlbums();
  await t.test("验证 API 开关和密钥", async () => {
    delete process.env.API_ENABLED;
    process.env.API_KEYS = key;
    assert.equal(models(request("/api/v1/models")).status, 503);
    for (const value of ["false", "yes", "TRUE", ""]) {
      process.env.API_ENABLED = value;
      assert.equal(models(request("/api/v1/models")).status, 503);
      assert.equal((await apiPhoto(request("/api/v1/photos/missing?v=1"), context("missing"))).status, 503);
    }
    process.env.API_ENABLED = "true";
    for (const value of ["", "   ", " , , "]) {
      process.env.API_KEYS = value;
      const unavailable = models(request("/api/v1/models"));
      assert.equal(unavailable.status, 503);
      assert.equal((await unavailable.json()).error.code, "api_unavailable");
    }
    delete process.env.API_KEYS;
    assert.equal(models(request("/api/v1/models")).status, 503);
    process.env.API_KEYS = key;
    for (const authorization of ["", "Bearer wrong", key, "Basic " + key]) {
      const response = models(request("/api/v1/models", authorization));
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("www-authenticate"), "Bearer");
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    const secondKey = "another-test-key";
    process.env.API_KEYS = ` ${key}, , ${secondKey} `;
    assert.equal(models(request("/api/v1/models", `Bearer ${key}`)).status, 200);
    assert.equal(models(request("/api/v1/models", `Bearer ${secondKey}`)).status, 200);
    assert.equal(models(request("/api/v1/models", "Bearer another-test-key-extra")).status, 401);
    assert.equal((await apiPhoto(request("/api/v1/photos/missing?v=1", `Bearer ${secondKey}`), context("missing"))).status, 404);
    process.env.API_KEYS = `${key}\n${secondKey}`;
    assert.equal(models(request("/api/v1/models", `Bearer ${key}`)).status, 401);
    assert.equal(models(request("/api/v1/models", `Bearer ${secondKey}`)).status, 401);
    process.env.API_KEYS = secondKey;
    assert.equal(models(request("/api/v1/models", `Bearer ${key}`)).status, 401);
    assert.equal(models(request("/api/v1/models", `Bearer ${secondKey}`)).status, 200);
    process.env.API_KEYS = key;
    assert.equal(randomPhoto(request("/api/v1/photos/random", "")).status, 401);
    assert.equal(randomPhoto(request("/api/v1/photos/random", "Bearer bad")).status, 401);
  });

  await t.test("随机图片接口返回可访问的图片", async () => {
    process.env.API_ENABLED = "true";
    process.env.API_KEYS = key;
    const randomResponse = randomPhoto(request("/api/v1/photos/random"));
    assert.equal(randomResponse.status, 200);
    assert.equal(randomResponse.headers.get("cache-control"), "no-store");
    const random = (await randomResponse.json()).data;
    const stored = getDatabase().sqlite.prepare(`SELECT p.album_id AS albumId, a.model_id AS modelId, p.filename
      FROM photos p JOIN albums a ON a.id = p.album_id WHERE p.id = ?`).get(random.id) as { albumId: string; modelId: string; filename: string };
    assert.deepEqual({ albumId: random.albumId, modelId: random.modelId, filename: random.filename }, stored);
    const matchingAlbum = await (await albumDetail(request("/"), context(random.albumId))).json();
    assert.deepEqual({ id: random.modelId, name: random.modelName }, matchingAlbum.data.model);
    const randomImage = await apiPhoto(request(random.imageUrl), context(random.id));
    assert.equal(randomImage.status, 200);
    await randomImage.arrayBuffer();
  });

  await t.test("模特和图集支持分页、搜索与排序", async () => {
    process.env.API_ENABLED = "true";
    process.env.API_KEYS = key;
    const modelPage = await models(request("/api/v1/models?limit=1")).json();
    assert.deepEqual(modelPage.pagination, { page: 1, limit: 1, total: 2, totalPages: 2 });
    const model = modelPage.data[0];
    assert.equal(model.name, "模特 A");
    assert.equal(model.albumCount, 1);
    assert.equal(model.photoCount, 2);
    assert.match(model.coverUrl, /^\/api\/v1\/photos\/[^/?]+\?v=/);
    const coverId = new URL(model.coverUrl, "http://localhost").pathname.split("/")[4];
    const cover = await apiPhoto(request(model.coverUrl), context(coverId));
    assert.equal(cover.status, 200);
    assert.equal(cover.headers.get("cache-control"), "private, no-store");
    await cover.arrayBuffer();

    const result = await albums(request(`/api/v1/albums?modelId=${model.id}&q=模特%20MORNING&sort=title`)).json();
    assert.equal(result.pagination.total, 1);
    const album = result.data[0];
    assert.equal(album.title, "Morning");
    assert.equal(album.model.id, model.id);
    assert.equal(album.photoCount, 2);
    assert.equal(album.likeCount, 0);
    assert.ok(!Number.isNaN(Date.parse(album.updatedAt)));
    assert.deepEqual((await (await albumDetail(request("/"), context(album.id))).json()).data, album);
    assert.equal((await albumDetail(request("/"), context("missing"))).status, 404);
    assert.equal((await (await albums(request("/api/v1/albums?page=10"))).json()).data.length, 0);
    assert.equal((await (await albums(request("/api/v1/albums?q=notfound"))).json()).pagination.totalPages, 0);
    const { setLike } = await import("../src/lib/catalog");
    setLike(album.id, "visitor", true);
    const popular = await albums(request("/api/v1/albums?sort=popular")).json();
    assert.equal(popular.data[0].id, album.id);
    assert.equal(popular.data[0].likeCount, 1);
    const injection = await albums(request(`/api/v1/albums?modelId=${encodeURIComponent("' OR 1=1 --")}`)).json();
    assert.equal(injection.pagination.total, 0);
    assert.equal((await albumDetail(request("/", ""), context(album.id))).status, 401);
    for (const query of ["page=0", "page=-1", "page=1.5", "limit=101", "page=9007199254740992", "sort=bad", `q=${"x".repeat(101)}`]) {
      assert.equal(albums(request(`/api/v1/albums?${query}`)).status, 400, query);
    }
  });

  await t.test("图片接口验证访问权限、缓存和下载", async () => {
    process.env.API_ENABLED = "true";
    process.env.API_KEYS = key;
    const result = await albums(request("/api/v1/albums?q=Morning")).json();
    const album = result.data[0];
    const photoPage = await (await photos(request("/api/v1/albums/x/photos?limit=1&page=2"), context(album.id))).json();
    assert.deepEqual(photoPage.pagination, { page: 2, limit: 1, total: 2, totalPages: 2 });
    assert.equal(photoPage.data[0].position, 1);
    assert.equal(photoPage.data[0].width, 20);
    const photo = photoPage.data[0];
    assert.match(album.coverUrl, /^\/api\/v1\/photos\/[^/?]+\?v=/);
    assert.match(photo.imageUrl, /^\/api\/v1\/photos\/[^/?]+\?v=/);
    assert.equal("previewUrl" in photo, false);
    assert.equal("originalUrl" in photo, false);
    const url = photo.imageUrl;
    for (const authorization of ["", "Bearer wrong"]) {
      const denied = await apiPhoto(request(url, authorization), context(photo.id));
      assert.equal(denied.status, 401);
      assert.equal(denied.headers.get("cache-control"), "no-store");
    }
    const image = await apiPhoto(request(url), context(photo.id));
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("cache-control"), "private, no-store");
    assert.equal(image.headers.get("content-type"), "image/jpeg");
    const etag = image.headers.get("etag")!;
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), await readFile(path.join(a, "2.jpg")));
    const conditional = new Request(`http://localhost${url}`, { headers: { Authorization: `Bearer ${key}`, "If-None-Match": etag } });
    assert.equal((await apiPhoto(conditional, context(photo.id))).status, 304);
    const unauthorizedConditional = new Request(`http://localhost${url}`, { headers: { "If-None-Match": etag } });
    assert.equal((await apiPhoto(unauthorizedConditional, context(photo.id))).status, 401);
    const stale = await apiPhoto(request(url.replace(/v=[^&]+/, "v=stale")), context(photo.id));
    assert.equal(stale.status, 404);
    assert.equal(stale.headers.get("cache-control"), "private, no-store");
    assert.equal((await apiPhoto(request(url), context("missing"))).status, 404);
    const download = await apiPhoto(request(`${photo.imageUrl}&download=1`), context(photo.id));
    assert.match(download.headers.get("content-disposition")!, /^attachment;/);
    await download.arrayBuffer();
    delete process.env.API_KEYS;
    assert.equal((await apiPhoto(request(photo.imageUrl), context(photo.id))).status, 503);
    process.env.API_KEYS = key;
    const version = new URL(photo.imageUrl, "http://localhost").searchParams.get("v");
    const publicImage = await media(request(`/api/media/${photo.id}?v=${version}`, ""), context(photo.id));
    assert.equal(publicImage.status, 200);
    assert.match(publicImage.headers.get("cache-control")!, /^public,/);
    await publicImage.arrayBuffer();
    assert.equal((await photos(request("/"), context("missing"))).status, 404);
    assert.equal((await photos(request("/", "Bearer bad"), context(album.id))).status, 401);
  });
});
