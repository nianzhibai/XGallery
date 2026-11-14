import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { databasePath } from "../config";
import * as schema from "./schema";

// Applied in order; PRAGMA user_version records how many have run.
const migrations = ["0000_init.sql", "0001_optional_album_model.sql"];

function migrate(sqlite: Database.Database) {
  const pending = () => migrations.slice(sqlite.pragma("user_version", { simple: true }) as number);
  if (!pending().length) return;
  // better-sqlite3 enables foreign keys by default, and table rebuilds must not cascade deletes.
  // The pragma has no effect inside a transaction, so it is set here and re-enabled by the caller.
  sqlite.pragma("foreign_keys = OFF");
  sqlite.transaction(() => {
    // Read again under the write lock: another process may have migrated meanwhile.
    for (const file of pending()) sqlite.exec(readFileSync(path.join(process.cwd(), "drizzle", file), "utf8"));
    if ((sqlite.pragma("foreign_key_check") as unknown[]).length) throw new Error("数据库迁移后外键约束不一致");
    sqlite.pragma(`user_version = ${migrations.length}`);
  }).immediate();
}

function connect() {
  const filename = databasePath();
  mkdirSync(path.dirname(filename), { recursive: true });
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.function("unicode_lower", { deterministic: true }, (value) => typeof value === "string" ? value.toLowerCase() : value);
  migrate(sqlite);
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

const globalDatabase = globalThis as unknown as { xgalleryDatabase?: ReturnType<typeof connect> };
export function getDatabase() {
  return globalDatabase.xgalleryDatabase ??= connect();
}
