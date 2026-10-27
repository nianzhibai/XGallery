import { test, expect } from "@playwright/test";

test("首页卡片无需 JavaScript 即可显示和打开图集", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL!);
    const card = page.locator(".album-card").first();
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("opacity", "1");
    const cover = card.locator("img");
    await expect.poll(() => cover.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(cover).toHaveCSS("opacity", "1");
    await card.locator(".album-cover").click();
    await expect(page.locator(".album-title")).toBeVisible();
  } finally { await context.close(); }
});

test("真实图集的浏览、灯箱、收藏、历史、点赞和搜索", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "最近更新" })).toBeVisible();
  await expect(page.locator(".album-cover")).toHaveCount(24);
  await page.locator(".album-cover").first().click();
  await expect(page.locator(".album-title")).toBeVisible();
  const albumUrl = page.url();
  const count = await page.locator(".photo-tile").count();
  expect(count).toBeGreaterThan(0);
  const wallImage = page.locator(".photo-tile img").first();
  await expect(wallImage).toHaveAttribute("src", /^\/_next\/image\?/);
  await expect.poll(() => wallImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await expect(page.getByRole("button", { name: "已收藏", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "点赞图集", exact: true }).click();
  await expect(page.getByRole("button", { name: "取消点赞", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "取消点赞", exact: true }).click();
  await expect(page.getByRole("button", { name: "点赞图集", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "查看第 1 张图片", exact: true }).click();
  await expect(page.locator(".pswp")).toBeVisible();
  await expect(page.locator(".pswp__counter")).toHaveText(`1 / ${count}`);
  await expect(page.getByRole("link", { name: "下载原图" })).toHaveAttribute("href", /original=1&download=1/);
  await expect(page.locator(".pswp")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".pswp__counter")).toHaveText(`2 / ${count}`);
  await page.getByRole("button", { name: "跳转到第 5 张", exact: true }).click();
  await expect(page.locator(".pswp__counter")).toHaveText(`5 / ${count}`);
  await page.keyboard.press("Escape");
  await expect(page.locator(".pswp")).toHaveCount(0);

  await page.goto("/library");
  await expect(page.locator(".album-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".album-card")).toHaveCount(1);
  await page.getByRole("link", { name: /最近看过/ }).click();
  await expect(page.locator(".album-card")).toHaveCount(1);
  await page.goto(albumUrl);
  await expect(page.getByRole("button", { name: "已收藏", exact: true })).toBeVisible();

  await page.goto("/models");
  await expect(page.locator(".model-row")).toHaveCount(67);
  await page.getByRole("textbox", { name: "查找模特" }).fill("布丁");
  await expect(page.locator(".model-row")).toHaveCount(1);
  await page.locator(".model-row").click();
  await expect(page.getByRole("heading", { name: "布丁大法", exact: true })).toBeVisible();
  await expect(page.locator(".album-card")).toHaveCount(7);
  await page.getByRole("combobox", { name: "搜索相册" }).fill("Fairy");
  await page.getByRole("combobox", { name: "搜索相册" }).press("Enter");
  await expect(page.getByRole("heading", { name: "搜索「Fairy」" })).toBeVisible();
  await expect(page.locator(".album-card")).toHaveCount(1);
  expect(errors).toEqual([]);
  await context.clearCookies();
});

test("大图仅显示原图，底部缩略条使用缓存小图", async ({ page }) => {
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  let releaseImages!: () => void;
  const imagesReady = new Promise<void>((resolve) => { releaseImages = resolve; });
  await page.route("**/api/media/**", async (route) => {
    await imagesReady;
    await route.fulfill({ contentType: "image/png", body: image });
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator(".album-cover").first().click();
    await expect(page.getByRole("button", { name: "点赞图集", exact: true })).toBeEnabled();
    await page.getByRole("link", { name: "查看第 1 张图片", exact: true }).click();
    await expect(page.locator(".pswp")).toBeVisible();

    const thumbnail = page.locator(".pswp__filmstrip img").first();
    await expect.poll(() => thumbnail.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator("img.pswp__img--placeholder")).toHaveCount(0);
    const original = page.locator(".pswp__item[aria-hidden='false'] img.pswp__img:not(.pswp__img--placeholder)");
    await expect(original).toHaveAttribute("src", /\?original=1$/);
    expect(await original.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(0);
    await expect(page.getByRole("link", { name: "下载原图" })).toHaveAttribute("href", /original=1&download=1/);

    releaseImages();
    await expect.poll(() => original.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".pswp__counter")).toHaveText(/^2 \/ /);
    await page.keyboard.press("Escape");
    await expect(page.locator(".pswp")).toHaveCount(0);
  } finally {
    releaseImages();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("主题持久化、手机布局、空结果和随机图集", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换到暗色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("combobox", { name: "搜索相册" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "随机浏览图集" }).click();
  await expect(page).toHaveURL(/\/album\/[a-f0-9]{24}$/);
  await expect(page.locator(".album-title")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/search?q=不存在的图集xyz");
  await expect(page.getByRole("heading", { name: "没有找到相关图集" })).toBeVisible();
  const response = await page.goto("/album/unknown");
  expect(response?.status()).toBe(404);
});

test("首页使用响应式缩略图，原文件下载与条件缓存保持可用", async ({ page, request }) => {
  await page.goto("/");
  const image = page.locator(".album-cover img").first();
  const src = await image.evaluate((element) => (element as HTMLImageElement).currentSrc);
  const optimized = new URL(src);
  expect(optimized.pathname).toBe("/_next/image");
  const source = new URL(optimized.searchParams.get("url")!, page.url());
  expect(source.pathname).toMatch(/^\/api\/media\/[a-f0-9]{24}\/preview\/\d+-\d+$/);
  const originalPath = source.pathname.replace(/\/preview\/[^/]+$/, "");
  const thumbnail = await request.get(src, { headers: { Accept: "image/webp" } });
  expect(thumbnail.status()).toBe(200);
  expect(thumbnail.headers()["content-type"]).toMatch(/^image\//);
  const originalUrl = `${originalPath}?original=1`;
  const display = await request.get(originalUrl);
  expect(display.status()).toBe(200);
  expect(display.headers()["content-type"]).toMatch(/^image\//);
  const original = await request.get(`${originalPath}?original=1&download=1`);
  expect(original.status()).toBe(200);
  expect(original.headers()["content-disposition"]).toMatch(/^attachment;/);
  expect(original.headers()["content-type"]).toMatch(/^image\//);
  expect(await original.body()).toEqual(await display.body());
  const sources = await page.locator(".album-cover img").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  expect(sources.every((source) => source?.startsWith("/_next/image?"))).toBe(true);
  const cached = await request.get(originalUrl, { headers: { "If-None-Match": display.headers().etag } });
  expect(cached.status()).toBe(304);
  const unknown = await request.get("/api/media/not-an-id");
  expect(unknown.status()).toBe(404);
  await page.locator(".album-cover").first().click();
  await expect(page).toHaveURL(/\/album\/[a-f0-9]{24}$/);
  const albumId = new URL(page.url()).pathname.split("/").at(-1);
  const invalid = await request.post(`/api/albums/${albumId}/like`, { data: { liked: "yes" } });
  expect(invalid.status()).toBe(400);
  const crossOrigin = await request.post(`/api/albums/${albumId}/like`, { headers: { Origin: "https://other.example" }, data: { liked: true } });
  expect(crossOrigin.status()).toBe(403);
});
