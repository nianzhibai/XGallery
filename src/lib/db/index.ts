import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { databasePath } from "../config";
import * as schema from "./schema";

function connect() {
  const filename = databasePath();
  mkdirSync(path.dirname(filename), { recursive: true });
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.exec(readFileSync(path.join(process.cwd(), "drizzle/0000_init.sql"), "utf8"));
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

const globalDatabase = globalThis as unknown as { xgalleryDatabase?: ReturnType<typeof connect> };
export function getDatabase() {
  return globalDatabase.xgalleryDatabase ??= connect();
}
