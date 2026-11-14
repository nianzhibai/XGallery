import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir, mkdtemp, rm, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const temporary = await mkdtemp(path.join(os.tmpdir(), "xgallery-catalog-"));
process.env.ALBUMS_DIR = path.join(temporary, "albums");
process.env.DATABASE_PATH = path.join(temporary, "catalog.db");
const { syncAlbums } = await import("../src/lib/sync");
const { getDatabase } = await import("../src/lib/db");
const catalog = await import("../src/lib/catalog");
const { homeBatch, restoreHomeBatch } = await import("../src/lib/home");
const { GET: homeRoute } = await import("../src/app/api/home/[section]/route");
const { POST: lookupRoute } = await import("../src/app/api/albums/lookup/route");
const { GET: modelsRoute } = await import("../src/app/api/models/route");

after(async () => { getDatabase().sqlite.close(); await rm(temporary, { recursive: true, force: true }); });

const image = await sharp({ create: { width: 4, height: 3, channels: 3, background: "white" } }).jpeg().toBuffer();
async function createAlbum(model: string, title: string, minutesAgo: number) {
  const directory = path.join(process.env.ALBUMS_DIR!, model, title);
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, "1.jpg");
  await sharp(image).toFile(filename);
  const time = new Date(Date.now() - minutesAgo * 60_000);
  await utimes(filename, time, time);
}

const lookup = (body: unknown) => lookupRoute(new Request("http://localhost/api/albums/lookup", { method: "POST", body: JSON.stringify(body) }));
const home = (section: string, query = "") => homeRoute(new Request(`http://localhost/api/home/${section}?${query}`), { params: Promise.resolve({ section }) });

test("目录查询按需读取图集和模特", async (t) => {
  for (let index = 0; index < 30; index++) await createAlbum("Élodie", `Set ${String(index).padStart(2, "0")}`, index);
  await createAlbum("模特 B", "Été", 100);
  await syncAlbums();
  const updated = catalog.listAlbums().albums;
  assert.equal(updated.length, 31);
  assert.deepEqual(updated.slice(0, 3).map((album) => album.title), ["Set 00", "Set 01", "Set 02"]);

  await t.test("搜索不区分大小写，包括非 ASCII 字母", () => {
    assert.deepEqual(catalog.listAlbums({ query: "été" }).albums.map((album) => album.title), ["Été"]);
    assert.deepEqual(catalog.listAlbums({ query: "模特 ÉTÉ" }).albums.map((album) => album.title), ["Été"]);
    assert.equal(catalog.listAlbums({ query: "ÉLODIE set" }).total, 30);
  });

  await t.test("分页返回总数和对应页面", () => {
    const page = catalog.listAlbums({ sort: "title", page: { limit: 5, offset: 5 } });
    assert.equal(page.total, 31);
    assert.deepEqual(page.albums.map((album) => album.title), ["Set 05", "Set 06", "Set 07", "Set 08", "Set 09"]);
    const model = catalog.findModel(updated[0].model!.id)!;
    assert.equal(catalog.listAlbums({ modelId: model.id, page: { limit: 24, offset: 24 } }).albums.length, model.albumCount - 24);
  });

  await t.test("按 ID 查询保留顺序并忽略已删除的图集", () => {
    assert.deepEqual(catalog.findAlbums([updated[2].id, "0".repeat(24), updated[0].id]).map((album) => album.id), [updated[2].id, updated[0].id]);
    assert.deepEqual(catalog.findAlbums([]), []);
  });

  await t.test("首页批次优先选择未展示的图集，最近更新只取较新的图集", () => {
    const recentPool = new Set(updated.slice(0, 24).map((album) => album.id));
    const shown = updated.slice(0, 20).map((album) => album.id);
    const batch = homeBatch("recent", shown);
    assert.equal(batch.length, 8);
    assert.ok(batch.every((album) => recentPool.has(album.id)));
    assert.deepEqual(new Set(batch.slice(0, 4).map((album) => album.id)), new Set(updated.slice(20, 24).map((album) => album.id)));
    assert.equal(new Set(homeBatch("random").map((album) => album.id)).size, 16);
    assert.equal(catalog.randomAlbums({ count: 100, pool: "all" }).length, 31);
  });

  await t.test("恢复首页批次时，仍然有效的批次保留，否则换成新批次", () => {
    const ids = (albums: { id: string }[]) => albums.map((album) => album.id);
    const recentPool = new Set(ids(updated.slice(0, 24)));
    const saved = ids(homeBatch("recent"));
    assert.deepEqual(ids(restoreHomeBatch("recent", saved)), saved, "有效批次按原顺序保留");
    const savedRandom = ids(homeBatch("random"));
    assert.deepEqual(ids(restoreHomeBatch("random", savedRandom)), savedRandom);
    const replaced = (restored: string[]) => {
      const batch = ids(restoreHomeBatch("recent", restored));
      assert.equal(batch.length, 8);
      assert.notDeepEqual(batch, restored);
      assert.ok(batch.every((id) => recentPool.has(id)));
    };
    replaced(saved.slice(0, 4)); // saved while the catalog was smaller
    replaced([...saved.slice(0, 7), "0".repeat(24)]); // an album was deleted
    replaced([...saved.slice(0, 7), updated[30].id]); // an album left the recent pool
  });

  await t.test("模特统计包含点赞数和最新封面", () => {
    const [first, second] = updated;
    catalog.setLike(first.id, "visitor-1", true);
    catalog.setLike(second.id, "visitor-1", true);
    catalog.setLike(second.id, "visitor-2", true);
    const { models, total } = catalog.listModels();
    assert.equal(total, 2);
    const elodie = models.find((model) => model.name === "Élodie")!;
    assert.deepEqual({ albumCount: elodie.albumCount, photoCount: elodie.photoCount, likeCount: elodie.likeCount, coverId: elodie.coverId },
      { albumCount: 30, photoCount: 30, likeCount: 3, coverId: first.coverId });
    assert.equal(catalog.findAlbum(second.id)!.likes, 2);
    assert.equal(catalog.listAlbums({ sort: "popular" }).albums[0].id, second.id);
    assert.equal(catalog.listModels({ limit: 1, offset: 1 }).models.length, 1);
    assert.deepEqual(catalog.listModelSuggestions(), models.map(({ id, name, albumCount }) => ({ id, name, albumCount })));
  });

  await t.test("内部接口校验参数", async () => {
    const batch = await home("random", `exclude=${updated.slice(0, 2).map((album) => album.id).join(",")}`);
    assert.equal(batch.status, 200);
    assert.equal(batch.headers.get("cache-control"), "no-store");
    assert.equal((await batch.json()).data.length, 16);
    assert.equal((await home("unknown")).status, 400);
    assert.equal((await home("recent", "exclude=not-an-id")).status, 400);
    assert.equal((await home("recent", "restore=not-an-id")).status, 400);
    assert.equal((await home("recent", `exclude=${updated[0].id}&restore=${updated[0].id}`)).status, 400);
    const restored = await home("recent", `restore=${updated.slice(0, 8).map((album) => album.id).join(",")}`);
    assert.deepEqual((await restored.json()).data.map((album: { id: string }) => album.id), updated.slice(0, 8).map((album) => album.id));

    const found = await lookup({ ids: [updated[1].id, updated[0].id] });
    assert.deepEqual((await found.json()).data.map((album: { id: string }) => album.id), [updated[1].id, updated[0].id]);
    for (const body of [{}, { ids: "x" }, { ids: ["bad"] }, { ids: Array(1001).fill(updated[0].id) }]) {
      assert.equal((await lookup(body)).status, 400, JSON.stringify(body).slice(0, 40));
    }
    assert.equal((await lookupRoute(new Request("http://localhost/api/albums/lookup", { method: "POST", body: "{" }))).status, 400);

    assert.equal((await modelsRoute().json()).data.length, 2);
  });
});
