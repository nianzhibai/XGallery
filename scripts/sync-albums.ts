import { existsSync } from "node:fs";

for (const filename of [".env.local", ".env"]) {
  if (existsSync(filename)) process.loadEnvFile(filename);
}
const { syncAlbums } = await import("../src/lib/sync");
try {
  const result = await syncAlbums(console.log);
  console.log(`\n索引完成：${result.models} 位模特 / ${result.albums} 个图集 / ${result.photos} 张图片`);
  if (result.warnings.length) console.warn("跳过无法读取的图片：", result.warnings);
} catch (error) {
  console.error("索引失败，原有索引保留：", error);
  process.exitCode = 1;
}
