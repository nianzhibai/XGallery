import assert from "node:assert/strict";
import { test } from "node:test";
import { justifiedRows } from "../src/lib/justified-layout";

test("等高照片墙在手机与桌面保持比例、不超出容器且不丢失图片", () => {
  const images = Array.from({ length: 57 }, (_, index) => ({ width: index % 4 === 0 ? 1800 : 800, height: index % 4 === 0 ? 1000 : 1200 }));
  for (const width of [280, 350, 728, 1328]) {
    const rows = justifiedRows(images, width, width < 540 ? 170 : 260);
    assert.deepEqual(rows.flatMap((row) => row.indices), images.map((_, index) => index));
    rows.forEach((row, rowIndex) => {
      const sum = row.widths.reduce((total, item) => total + item, 0) + (row.widths.length - 1) * 8;
      assert.ok(sum <= width + 0.001);
      if (rowIndex < rows.length - 1) assert.ok(Math.abs(sum - width) < 0.001);
      row.indices.forEach((index, item) => assert.ok(Math.abs(row.widths[item] / row.height - images[index].width / images[index].height) < 0.001));
    });
  }
  assert.deepEqual(justifiedRows([], 350, 170), []);
  assert.deepEqual(justifiedRows(images, 0, 170), []);
});

