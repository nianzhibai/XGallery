import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { albumsDirectory, imageCacheControl } from "../src/lib/config";

test("图集目录必须显式配置", () => {
  const previous = process.env.ALBUMS_DIR;
  try {
    delete process.env.ALBUMS_DIR;
    assert.throws(albumsDirectory, /请设置 ALBUMS_DIR/);
    process.env.ALBUMS_DIR = "";
    assert.throws(albumsDirectory, /请设置 ALBUMS_DIR/);
    process.env.ALBUMS_DIR = "   ";
    assert.throws(albumsDirectory, /请设置 ALBUMS_DIR/);
    process.env.ALBUMS_DIR = "albums";
    assert.equal(albumsDirectory(), path.resolve("albums"));
  } finally {
    if (previous === undefined) delete process.env.ALBUMS_DIR;
    else process.env.ALBUMS_DIR = previous;
  }
});

test("图片缓存时间支持非负整数秒并默认七天", () => {
  const previous = process.env.ORIGINAL_CACHE_TTL;
  try {
    delete process.env.ORIGINAL_CACHE_TTL;
    assert.equal(imageCacheControl("ORIGINAL_CACHE_TTL"), "public, max-age=604800, must-revalidate");
    for (const value of ["0", "3600", "604800"]) {
      process.env.ORIGINAL_CACHE_TTL = value;
      assert.equal(imageCacheControl("ORIGINAL_CACHE_TTL"), `public, max-age=${value}, must-revalidate`);
    }
    for (const value of ["", "-1", "1.5", "1e3", "abc", "9007199254740992"]) {
      process.env.ORIGINAL_CACHE_TTL = value;
      assert.throws(() => imageCacheControl("ORIGINAL_CACHE_TTL"), /ORIGINAL_CACHE_TTL 必须是非负整数秒数/);
    }
  } finally {
    if (previous === undefined) delete process.env.ORIGINAL_CACHE_TTL;
    else process.env.ORIGINAL_CACHE_TTL = previous;
  }
});
