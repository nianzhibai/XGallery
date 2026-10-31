import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { testData } from "./data";

const temporary = await mkdtemp(path.join(os.tmpdir(), "xgallery-e2e-"));
const albumsDirectory = path.join(temporary, "albums");
let server: ChildProcess | undefined;
let stopping = false;

async function cleanup() {
  await rm(temporary, { recursive: true, force: true });
}

async function stop() {
  if (stopping) return;
  stopping = true;
  if (server && server.exitCode === null && server.signalCode === null) {
    await new Promise<void>((resolve) => {
      server!.once("exit", () => resolve());
      server!.kill("SIGTERM");
    });
  }
  await cleanup();
  process.exit();
}

process.on("SIGTERM", stop);
process.on("SIGINT", stop);

try {
  const image = await sharp({ create: { width: 120, height: 180, channels: 3, background: "#ad8b63" } }).jpeg().toBuffer();
  for (const [model, count] of [[testData.paginatedModel, testData.paginatedAlbums], [testData.searchModel, testData.searchAlbums]] as const) {
    for (let index = 1; index <= count; index++) {
      const title = model === testData.searchModel && index === 1 ? testData.searchAlbum : `图集 ${String(index).padStart(2, "0")}`;
      const directory = path.join(albumsDirectory, model, title);
      await mkdir(directory, { recursive: true });
      await Promise.all(Array.from({ length: testData.photosPerAlbum }, (_, photo) =>
        writeFile(path.join(directory, `${photo + 1}.jpg`), image)));
    }
  }

  Object.assign(process.env, {
    ALBUMS_DIR: albumsDirectory,
    DATABASE_PATH: path.join(temporary, "catalog.db"),
    ALBUMS_SYNC_ENABLED: "false",
    API_ENABLED: "false",
    ORIGINAL_CACHE_TTL: "604800",
    PREVIEW_CACHE_TTL: "604800",
  });
  const { syncAlbums } = await import("../../src/lib/sync");
  const { getDatabase } = await import("../../src/lib/db");
  const result = await syncAlbums();
  getDatabase().sqlite.close();
  if (result.warnings.length) throw new Error(`无法索引测试图片: ${result.warnings.join(", ")}`);

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3005"], { stdio: "inherit", env: process.env });
  server.on("error", async (error) => { console.error(error); await cleanup(); process.exit(1); });
  server.on("exit", async (code) => {
    if (stopping) return;
    await cleanup();
    process.exit(code || 1);
  });
} catch (error) {
  console.error(error);
  await cleanup();
  process.exitCode = 1;
}
