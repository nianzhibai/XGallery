import assert from "node:assert/strict";
import { test } from "node:test";
import { albumSyncSchedule, createAlbumSyncTask } from "../src/lib/scheduled-sync";

test("定时同步默认关闭，并校验启用时的时间和时区", () => {
  assert.equal(albumSyncSchedule({}), null);
  assert.equal(albumSyncSchedule({ ALBUMS_SYNC_ENABLED: "false", ALBUMS_SYNC_TIME: "invalid" }), null);
  assert.deepEqual(albumSyncSchedule({ ALBUMS_SYNC_ENABLED: "true" }), { time: "02:00", timeZone: "Asia/Shanghai" });
  assert.deepEqual(albumSyncSchedule({ ALBUMS_SYNC_ENABLED: "true", ALBUMS_SYNC_TIME: "23:45", ALBUMS_SYNC_TIMEZONE: "Asia/Shanghai" }), { time: "23:45", timeZone: "Asia/Shanghai" });
  assert.throws(() => albumSyncSchedule({ ALBUMS_SYNC_ENABLED: "yes" }), /ALBUMS_SYNC_ENABLED/);
  for (const time of ["", "3:00", "24:00", "12:60"]) {
    assert.throws(() => albumSyncSchedule({ ALBUMS_SYNC_ENABLED: "true", ALBUMS_SYNC_TIME: time }), /ALBUMS_SYNC_TIME/);
  }
  assert.throws(() => albumSyncSchedule({ ALBUMS_SYNC_ENABLED: "true", ALBUMS_SYNC_TIMEZONE: "invalid" }), /ALBUMS_SYNC_TIMEZONE/);
});

test("按照指定时区每天执行，夏令时重复的时间只执行一次", async () => {
  let runs = 0;
  const tick = createAlbumSyncTask({ time: "02:30", timeZone: "Europe/Berlin" }, async () => { runs++; });
  await tick(new Date("2026-10-24T00:29:00Z"));
  await tick(new Date("2026-10-24T00:30:00Z"));
  await tick(new Date("2026-10-25T00:30:00Z"));
  await tick(new Date("2026-10-25T01:30:00Z"));
  await tick(new Date("2026-10-26T01:30:00Z"));
  assert.equal(runs, 3);
});

test("上次任务未完成时不重叠，失败后下一天仍可执行", async () => {
  let runs = 0;
  let finish!: () => void;
  const wait = new Promise<void>((resolve) => { finish = resolve; });
  const tick = createAlbumSyncTask({ time: "03:00", timeZone: "UTC" }, async () => {
    runs++;
    if (runs === 1) { await wait; throw new Error("failed"); }
  });
  const first = tick(new Date("2026-01-01T03:00:00Z"));
  await tick(new Date("2026-01-02T03:00:00Z"));
  assert.equal(runs, 1);
  finish();
  await assert.rejects(first, /failed/);
  await tick(new Date("2026-01-02T03:00:30Z"));
  assert.equal(runs, 2);
});
