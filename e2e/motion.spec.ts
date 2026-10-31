import { test, expect } from "@playwright/test";

const image = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path fill="#b07a3c" d="M0 0h2v2H0z"/></svg>';

test("封面等待加载时保留尺寸，加载完成后显示图片", async ({ page }) => {
  let releaseImages!: () => void;
  const ready = new Promise<void>((resolve) => { releaseImages = resolve; });
  await page.route("**/_next/image?**", async (route) => {
    await ready;
    await route.fulfill({ contentType: "image/svg+xml", body: image });
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const cover = page.locator(".album-cover").first();
    const thumbnail = cover.locator("img");
    await expect(thumbnail).toHaveCSS("opacity", "0");
    const height = await cover.evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeGreaterThan(0);
    releaseImages();
    await expect.poll(() => thumbnail.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(thumbnail).toHaveCSS("opacity", "1");
    expect(await cover.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(height, 0);
  } finally {
    releaseImages();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("封面加载失败时显示提示，并且仍可进入图集", async ({ page }) => {
  await page.route("**/_next/image?**", (route) => route.abort());
  await page.goto("/");
  const cover = page.locator(".album-cover").first();
  await expect(cover.getByText("封面暂时无法加载")).toBeVisible();
  await cover.click();
  await expect(page).toHaveURL(/\/album\/[a-f0-9]{24}$/);
  await expect(page.locator(".album-title")).toBeVisible();
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`换一批保持布局和焦点，切换完成后允许继续刷新（${reducedMotion}）`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    if (reducedMotion === "reduce") await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    for (const name of ["最近更新", "随机漫游"]) {
      const section = page.getByRole("region", { name });
      const covers = section.locator(".album-cover");
      const count = await covers.count();
      const previous = await covers.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
      const height = await section.evaluate((element) => element.getBoundingClientRect().height);
      const button = section.getByRole("button", { name: "换一批" });
      await button.click();
      if (reducedMotion === "no-preference") await expect(button).toBeDisabled();
      await expect(button).toBeEnabled();
      await expect(covers).toHaveCount(count);
      const next = await covers.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
      expect(new Set(next).size).toBe(count);
      expect(next.every((href) => !previous.includes(href))).toBe(true);
      expect(await section.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(height, 0);
      await expect(button).toBeFocused();
      await button.click();
      await expect(button).toBeEnabled();
      await expect(covers).toHaveCount(count);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("刷新首页时最近更新重新选取图集", async ({ page }) => {
  await page.goto("/");
  const covers = page.getByRole("region", { name: "最近更新" }).locator(".album-cover");
  const batches = new Set<string>();
  for (let i = 0; i < 3; i++) {
    await expect(covers).toHaveCount(8);
    batches.add(JSON.stringify(await covers.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")).sort())));
    if (i < 2) await page.reload();
  }
  expect(batches.size).toBeGreaterThan(1);
});

test("进入图集后返回首页，保留两个分区换批后的内容", async ({ page }) => {
  await page.goto("/");
  const recent = page.getByRole("region", { name: "最近更新" });
  const random = page.getByRole("region", { name: "随机漫游" });
  const links = (section: typeof recent) => section.locator(".album-cover").evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));

  for (const section of [recent, random]) {
    const before = await links(section);
    const button = section.getByRole("button", { name: "换一批" });
    await button.click();
    await expect(button).toBeEnabled();
    expect(await links(section)).not.toEqual(before);
  }
  const expectedRecent = await links(recent);
  const expectedRandom = await links(random);

  await random.locator(".album-cover").first().click();
  await expect(page.locator(".album-title")).toBeVisible();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect.poll(() => links(recent)).toEqual(expectedRecent);
  await expect.poll(() => links(random)).toEqual(expectedRandom);
  await expect(page.getByRole("region", { name: "最近看过" })).toBeVisible();

  await recent.locator(".album-cover").first().click();
  await expect(page.locator(".album-title")).toBeVisible();
  await page.goBack();
  await expect.poll(() => links(recent)).toEqual(expectedRecent);
  await expect.poll(() => links(random)).toEqual(expectedRandom);
});
