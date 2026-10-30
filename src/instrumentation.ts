export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAlbumSyncScheduler } = await import("./lib/scheduled-sync");
    startAlbumSyncScheduler();
  }
}
