import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const temporary = await mkdtemp(path.join(os.tmpdir(), "xgallery-unassigned-"));
const root = path.join(temporary, "albums");
process.env.ALBUMS_DIR = root;
process.env.DATABASE_PATH = path.join(temporary, "catalog.db");
const { syncAlbums, unassignedDirectory } = await import("../src/lib/sync");
const { getDatabase } = await import("../src/lib/db");
const catalog = await import("../src/lib/catalog");
const { GET: albumsRoute } = await import("../src/app/api/v1/albums/route");
const { GET: randomPhotoRoute } = await import("../src/app/api/v1/photos/random/route");

after(async () => { getDatabase().sqlite.close(); await rm(temporary, { recursive: true, force: true }); });

const image = await sharp({ create: { width: 4, height: 3, channels: 3, background: "white" } }).jpeg().toBuffer();
async function addImage(...segments: string[]) {
  const filename = path.join(root, ...segments);
  await mkdir(path.dirname(filename), { recursive: true });
  await sharp(image).toFile(filename);
}

test("未分类目录中的图集不属于任何模特", async (t) => {
  await addImage("模特 A", "晨光", "1.jpg");
  await addImage(unassignedDirectory, "街景", "1.jpg");
  await addImage(unassignedDirectory, "街景", "细节", "2.jpg");
  await addImage(unassignedDirectory, "loose.jpg");
  const result = await syncAlbums();
  assert.deepEqual({ models: result.models, albums: result.albums, photos: result.photos }, { models: 1, albums: 2, photos: 3 });
  assert.deepEqual(result.warnings, [`${path.join(unassignedDirectory, "loose.jpg")}（未分类图片需放入图集子目录）`]);

  const street = catalog.listAlbums({ query: "街景" }).albums[0];
  assert.equal(street.title, "街景");
  assert.equal(street.model, null);
  assert.equal(street.photoCount, 2);
  assert.deepEqual(catalog.listModels().models.map((model) => model.name), ["模特 A"], "未分类目录不会成为模特");
  assert.deepEqual(catalog.listModelSuggestions().map((model) => model.name), ["模特 A"]);
  const morning = catalog.listAlbums({ query: "模特 晨光" }).albums[0];
  assert.equal(morning.model?.name, "模特 A");

  await t.test("未分类图集出现在列表、搜索、分页和随机结果中", () => {
    assert.equal(catalog.listAlbums({ page: { limit: 10, offset: 0 } }).total, 2);
    assert.equal(catalog.listAlbums({ query: "未分类" }).total, 0, "搜索不匹配保留目录名");
    assert.equal(catalog.findAlbum(street.id)?.model, null);
    assert.equal(catalog.randomAlbums({ count: 10, pool: "all" }).length, 2);
  });

  await t.test("API 将未分类图集的模特返回为 null", async () => {
    process.env.API_ENABLED = "true";
    process.env.API_KEYS = "key";
    const request = (url: string) => new Request(`http://localhost${url}`, { headers: { authorization: "Bearer key" } });
    const list = await albumsRoute(request(`/api/v1/albums?q=${encodeURIComponent("街景")}`)).json();
    assert.equal(list.data[0].model, null);
    const photoIds = new Set(catalog.listPhotos(street.id).map((photo) => photo.id));
    // Draw until a photo of the unassigned album comes up; two of the three photos belong to it.
    for (let attempt = 0; attempt < 50; attempt++) {
      const { data } = await randomPhotoRoute(request("/api/v1/photos/random")).json();
      if (!photoIds.has(data.id)) continue;
      assert.deepEqual({ albumId: data.albumId, modelId: data.modelId, modelName: data.modelName }, { albumId: street.id, modelId: null, modelName: null });
      return;
    }
    assert.fail("随机照片未返回未分类图集中的照片");
  });

  await t.test("删除最后一个模特图集后只保留未分类图集", async () => {
    await rm(path.join(root, "模特 A"), { recursive: true });
    await syncAlbums();
    assert.equal(catalog.listModels().total, 0);
    assert.deepEqual(catalog.listAlbums().albums.map((album) => album.id), [street.id]);
  });
});
