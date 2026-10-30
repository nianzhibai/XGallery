import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { albumsDirectory } from "../src/lib/config";

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
