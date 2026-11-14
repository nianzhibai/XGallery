import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const temporary = await mkdtemp(path.join(os.tmpdir(), "xgallery-migration-"));
process.env.ALBUMS_DIR = path.join(temporary, "albums");
process.env.DATABASE_PATH = path.join(temporary, "catalog.db");

// A database created before album models became optional.
const legacy = new Database(process.env.DATABASE_PATH);
legacy.exec(`
  CREATE TABLE models (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, seen_at INTEGER NOT NULL);
  CREATE TABLE albums (id TEXT PRIMARY KEY NOT NULL, model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    title TEXT NOT NULL, relative_path TEXT NOT NULL UNIQUE, cover_id TEXT NOT NULL, photo_count INTEGER NOT NULL,
    total_bytes INTEGER NOT NULL, updated_at INTEGER NOT NULL, seen_at INTEGER NOT NULL);
  CREATE INDEX albums_model_idx ON albums(model_id);
  CREATE TABLE photos (id TEXT PRIMARY KEY NOT NULL, album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    relative_path TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
    bytes INTEGER NOT NULL, modified_at INTEGER NOT NULL, position INTEGER NOT NULL, seen_at INTEGER NOT NULL);
  CREATE INDEX photos_album_idx ON photos(album_id, position);
  CREATE TABLE likes (album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE, visitor_id TEXT NOT NULL,
    created_at INTEGER NOT NULL, PRIMARY KEY(album_id, visitor_id));
  INSERT INTO models VALUES ('m', '模特', 1);
  INSERT INTO albums VALUES ('a', 'm', '图集', '模特/图集', 'p', 1, 10, 1, 1);
  INSERT INTO photos VALUES ('p', 'a', '模特/图集/1.jpg', '1.jpg', 4, 3, 10, 1, 0, 1);
  INSERT INTO likes VALUES ('a', 'visitor', 1);
`);
legacy.close();

const { getDatabase } = await import("../src/lib/db");
after(async () => { getDatabase().sqlite.close(); await rm(temporary, { recursive: true, force: true }); });

test("迁移让图集的模特可为空，并保留已有数据", () => {
  const { sqlite } = getDatabase();
  assert.equal(sqlite.pragma("user_version", { simple: true }), 2);
  assert.equal(sqlite.pragma("foreign_keys", { simple: true }), 1);
  const modelColumn = (sqlite.pragma("table_info(albums)") as { name: string; notnull: number }[]).find((column) => column.name === "model_id")!;
  assert.equal(modelColumn.notnull, 0);
  assert.deepEqual(sqlite.prepare("SELECT count(*) AS count FROM likes WHERE album_id = 'a'").get(), { count: 1 }, "重建图集表不删除点赞");
  assert.deepEqual(sqlite.prepare("SELECT count(*) AS count FROM photos WHERE album_id = 'a'").get(), { count: 1 });
  assert.ok((sqlite.pragma("index_list(albums)") as { name: string }[]).some((index) => index.name === "albums_model_idx"));

  sqlite.prepare("INSERT INTO albums VALUES ('b', NULL, '未分类', '@未分类/未分类', 'p', 1, 10, 1, 1)").run();
  sqlite.prepare("DELETE FROM models WHERE id = 'm'").run();
  assert.deepEqual(sqlite.prepare("SELECT id FROM albums").all(), [{ id: "b" }], "删除模特仍级联删除其图集");
  assert.deepEqual(sqlite.prepare("SELECT count(*) AS count FROM likes").get(), { count: 0 });
});
