import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { albumsDirectory, includeAnimatedImages } from "../src/lib/config";

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

test("默认读取动图，可通过配置关闭", () => {
  const previous = process.env.INCLUDE_ANIMATED_IMAGES;
  try {
    delete process.env.INCLUDE_ANIMATED_IMAGES;
    assert.equal(includeAnimatedImages(), true);
    process.env.INCLUDE_ANIMATED_IMAGES = "false";
    assert.equal(includeAnimatedImages(), false);
    process.env.INCLUDE_ANIMATED_IMAGES = "true";
    assert.equal(includeAnimatedImages(), true);
  } finally {
    if (previous === undefined) delete process.env.INCLUDE_ANIMATED_IMAGES;
    else process.env.INCLUDE_ANIMATED_IMAGES = previous;
  }
});
