import { syncAlbums } from "./sync";

type Schedule = { time: string; timeZone: string };

export function albumSyncSchedule(env: Record<string, string | undefined> = process.env): Schedule | null {
  const enabled = env.ALBUMS_SYNC_ENABLED ?? "false";
  if (enabled !== "true" && enabled !== "false") {
    throw new Error("ALBUMS_SYNC_ENABLED 必须是 true 或 false");
  }
  if (enabled === "false") return null;

  const time = env.ALBUMS_SYNC_TIME ?? "02:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("ALBUMS_SYNC_TIME 必须是 HH:mm 格式的 24 小时时间");
  }
  const timeZone = env.ALBUMS_SYNC_TIMEZONE ?? "Asia/Shanghai";
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    throw new Error("ALBUMS_SYNC_TIMEZONE 必须是有效的时区名称");
  }
  return { time, timeZone };
}

// The local date prevents a second run when daylight saving time repeats an hour.
export function createAlbumSyncTask(schedule: Schedule, run: () => Promise<void>) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: schedule.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  let lastRunDate: string | undefined;
  let running = false;
  return async (now: Date) => {
    const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    if (`${parts.hour}:${parts.minute}` !== schedule.time || date === lastRunDate || running) return;
    lastRunDate = date;
    running = true;
    try {
      await run();
    } finally {
      running = false;
    }
  };
}

const globalScheduler = globalThis as typeof globalThis & { albumSyncScheduler?: NodeJS.Timeout };

export function startAlbumSyncScheduler() {
  const schedule = albumSyncSchedule();
  if (!schedule || globalScheduler.albumSyncScheduler) return;

  const tick = createAlbumSyncTask(schedule, async () => {
    console.log("开始定时同步图集");
    try {
      const result = await syncAlbums(console.log);
      console.log(`定时同步完成：${result.models} 位模特 / ${result.albums} 个图集 / ${result.photos} 张图片`);
      if (result.warnings.length) console.warn("跳过无法读取的图片：", result.warnings);
    } catch (error) {
      console.error("定时同步失败，原有索引保留：", error);
    }
  });
  const check = () => { void tick(new Date()); };
  globalScheduler.albumSyncScheduler = setInterval(check, 30_000);
  globalScheduler.albumSyncScheduler.unref();
  console.log(`已启用图集定时同步：每天 ${schedule.time}（${schedule.timeZone}）`);
  check();
}
