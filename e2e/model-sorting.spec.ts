import { expect, test } from "@playwright/test";
import { testData } from "./support/data";

test("模特默认按名称排序，热度按所有图集的点赞总数排序", async ({ page }) => {
  await page.goto("/models");
  const rows = page.locator(".model-row");
  const names = () => rows.locator(".model-name").allTextContents();
  await expect(page.getByRole("button", { name: "按名称" })).toBeVisible();
  await expect.poll(names).toEqual([testData.searchModel, testData.paginatedModel]);
  await expect(rows.first().locator(".model-meta")).toHaveText(`${testData.searchAlbums} 个图集`);

  const albumIds: string[] = [];
  try {
    for (const [name, count] of [[testData.paginatedModel, 2], [testData.searchModel, 1]] as const) {
      await page.goto("/models");
      await rows.filter({ hasText: name }).click();
      await expect(page).toHaveURL(/\/model\/[a-f0-9]{24}$/);
      await expect(page.locator(".album-cover").first()).toBeVisible();
      const urls = await page.locator(".album-cover").evaluateAll((elements, limit) =>
        elements.slice(0, limit).map((element) => element.getAttribute("href")!), count);
      expect(urls).toHaveLength(count);
      for (const url of urls) {
        const id = url.split("/").pop()!;
        const response = await page.request.post(`/api/albums/${id}/like`, { data: { liked: true } });
        expect(response.ok()).toBe(true);
        albumIds.push(id);
      }
    }

    await page.goto("/models");
    await expect.poll(names).toEqual([testData.searchModel, testData.paginatedModel]);
    await page.getByRole("button", { name: "按名称" }).click();
    await page.getByRole("menuitemradio", { name: "按热度排序" }).click();
    await expect.poll(names).toEqual([testData.paginatedModel, testData.searchModel]);
    await expect(page.locator(".models-grid")).toHaveAttribute("aria-busy", "false");
    await expect(rows.first().locator(".model-meta")).toHaveText(`${testData.paginatedAlbums} 个图集`);
    await expect(rows.last().locator(".model-meta")).toHaveText(`${testData.searchAlbums} 个图集`);
    await page.setViewportSize({ width: 320, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(rows.first().locator(".model-meta")).toHaveText(`${testData.paginatedAlbums} 个图集`);

    await page.getByRole("textbox", { name: "查找模特" }).fill(testData.searchTerm);
    await expect.poll(names).toEqual([testData.searchModel]);
    await page.getByRole("textbox", { name: "查找模特" }).clear();
    await page.getByRole("button", { name: "按热度" }).click();
    await page.getByRole("menuitemradio", { name: "按名称排序" }).click();
    await expect.poll(names).toEqual([testData.searchModel, testData.paginatedModel]);
    await expect(page.locator(".models-grid")).toHaveAttribute("aria-busy", "false");
    await expect(rows.first().locator(".model-meta")).toHaveText(`${testData.searchAlbums} 个图集`);
  } finally {
    for (const id of albumIds) await page.request.post(`/api/albums/${id}/like`, { data: { liked: false } });
  }
});

test("减少动态效果时排序可以立即切换", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/models");
  await page.getByRole("button", { name: "按名称" }).click();
  await page.getByRole("menuitemradio", { name: "按热度排序" }).click();
  await expect(page.getByRole("button", { name: "按热度" })).toBeEnabled();
  await expect(page.locator(".models-grid")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "按热度" }).click();
  await page.getByRole("menuitemradio", { name: "按名称排序" }).click();
  await expect(page.getByRole("button", { name: "按名称" })).toBeEnabled();
});

test("搜索无结果时仍可切换排序", async ({ page }) => {
  await page.goto("/models");
  await page.getByRole("textbox", { name: "查找模特" }).fill("没有匹配的模特");
  await expect(page.locator(".model-row")).toHaveCount(0);
  await page.getByRole("button", { name: "按名称" }).click();
  await page.getByRole("menuitemradio", { name: "按热度排序" }).click();
  await expect(page.getByRole("button", { name: "按热度" })).toBeEnabled();
  await expect(page.locator(".models-grid")).toHaveAttribute("aria-busy", "false");
});

test("排序过渡期间修改搜索不会卡住列表", async ({ page }) => {
  await page.goto("/models");
  await page.getByRole("button", { name: "按名称" }).click();
  await page.getByRole("menuitemradio", { name: "按热度排序" }).click();
  await page.getByRole("textbox", { name: "查找模特" }).fill("没有匹配的模特");
  await expect(page.getByRole("button", { name: "按热度" })).toBeEnabled();
  await expect(page.locator(".models-grid")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("textbox", { name: "查找模特" }).clear();
  await expect(page.locator(".model-row")).toHaveCount(2);
});

test("排序时卡片不会重播页面入场动画", async ({ page }) => {
  await page.goto("/models");
  await page.locator(".model-row").filter({ hasText: testData.paginatedModel }).click();
  await expect(page).toHaveURL(/\/model\/[a-f0-9]{24}$/);
  const cover = page.locator(".album-cover").first();
  await expect(cover).toBeVisible();
  const albumId = (await cover.getAttribute("href"))!.split("/").pop()!;
  expect((await page.request.post(`/api/albums/${albumId}/like`, { data: { liked: true } })).ok()).toBe(true);

  try {
    await page.goto("/models");
    const reveals = page.locator(".model-reveal");
    await expect(reveals.first()).toHaveCSS("animation-name", "album-enter");
    await reveals.evaluateAll((elements) => Promise.all(elements.flatMap((element) =>
      element.getAnimations().map((animation) => animation.finished.catch(() => {})))));

    for (const [current, optionName, target] of [["按名称", "按热度排序", "按热度"], ["按热度", "按名称排序", "按名称"]]) {
      await page.getByRole("button", { name: current }).click();
      const option = page.getByRole("menuitemradio", { name: optionName });
      await option.evaluate((element) => element.addEventListener("click", () => {
        const opacities: number[] = [];
        (window as unknown as { revealOpacities: number[] }).revealOpacities = opacities;
        const start = performance.now();
        let started = false;
        function sample(time: number) {
          const grid = document.querySelector(".models-grid");
          const busy = grid?.getAttribute("aria-busy") === "true";
          if (busy) {
            started = true;
            document.querySelectorAll(".model-reveal").forEach((card) => opacities.push(Number(getComputedStyle(card).opacity)));
          }
          if (time - start < 2000 && (!started || busy)) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, { capture: true, once: true }));
      await option.click();
      await expect(page.getByRole("button", { name: target })).toBeVisible();
      await expect(page.locator(".models-grid")).toHaveAttribute("aria-busy", "false");
      const opacities = await page.evaluate(() => (window as unknown as { revealOpacities: number[] }).revealOpacities);
      expect(opacities.length).toBeGreaterThan(0);
      expect(Math.min(...opacities)).toBeGreaterThanOrEqual(0.99);
    }
  } finally {
    await page.request.post(`/api/albums/${albumId}/like`, { data: { liked: false } });
  }
});

for (const [width, columns] of [[1440, 3], [800, 2], [390, 1]] as const) {
  test(`排序过渡按实际列数逐行同步（${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/models");
    const grid = page.locator(".models-grid");
    await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(columns);

    for (const [current, next, target] of [["按名称", "按热度排序", "按热度"], ["按热度", "按名称排序", "按名称"]]) {
      await page.getByRole("button", { name: current }).click();
      const option = page.getByRole("menuitemradio", { name: next });
      await option.evaluate((element) => element.addEventListener("click", () => {
        const differences: number[] = [];
        (window as unknown as { rowFadeDifferences: number[] }).rowFadeDifferences = differences;
        const start = performance.now();
        function sample(time: number) {
          const cards = document.querySelectorAll<HTMLElement>(".models-grid > div");
          if (cards.length >= 2) differences.push(Math.abs(Number(getComputedStyle(cards[0]).opacity) - Number(getComputedStyle(cards[1]).opacity)));
          if (time - start < 1500) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, { capture: true, once: true }));
      await option.click();
      await expect(page.getByRole("button", { name: target })).toBeVisible();
      await expect(grid).toHaveAttribute("aria-busy", "false");
      const differences = await page.evaluate(() => (window as unknown as { rowFadeDifferences: number[] }).rowFadeDifferences);
      expect(differences.length).toBeGreaterThan(0);
      if (columns === 1) expect(Math.max(...differences)).toBeGreaterThan(0.05);
      else expect(Math.max(...differences)).toBeLessThan(0.05);
    }
  });
}
