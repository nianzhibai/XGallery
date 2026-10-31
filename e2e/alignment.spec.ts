import { test, expect } from "@playwright/test";
import { testData } from "./support/data";

test("浏览记录可逐条移除且不影响收藏", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.locator(".album-cover").evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute("href")))].slice(0, 2));
  expect(hrefs).toHaveLength(2);
  const ids = hrefs.map((href) => href!.split("/").pop()!);
  await page.evaluate(([first, second]) => localStorage.setItem("xgallery-library-v1", JSON.stringify({ favorites: [first], recent: [first, second], liked: [] })), ids);
  await page.goto("/library?tab=recent");
  await expect(page.locator(".album-card-overlay")).toHaveCount(2);
  const card = page.locator(".album-card").first();
  const title = await card.locator(".cover-title").innerText();
  const href = await card.locator(".album-cover").getAttribute("href");
  const remove = card.getByRole("button", { name: /移除浏览记录/ });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(page.locator(".album-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".album-card")).toHaveCount(1);
  await page.goto("/library");
  await expect(page.locator(".album-card-overlay")).toHaveCount(1);
  await expect(page.locator(".album-card .cover-title")).toHaveText(title);
  await page.goto(href!);
  const modelName = await page.locator(".model-breadcrumb span").nth(1).innerText();
  const albumTitle = await page.locator(".album-title").innerText();
  expect(title).toBe(`${modelName} · ${albumTitle}`);
});

test("收藏为空时显示简洁提示", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("xgallery-library-v1"));
  await page.goto("/library");
  const empty = page.locator(".empty-state");
  await expect(empty.getByRole("heading", { name: "还没有收藏" })).toBeVisible();
  await expect(empty.locator("svg")).toHaveCount(0);
  await expect(empty.getByRole("link", { name: "去逛逛" })).toHaveAttribute("href", "/");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("搜索空状态不显示无关的跳转按钮", async ({ page }) => {
  for (const url of ["/search", "/search?q=不存在的图集"]) {
    await page.goto(url);
    const empty = page.locator(".empty-card");
    await expect(empty).toBeVisible();
    await expect(empty.getByRole("link")).toHaveCount(0);
  }
});

test("模特图集分页并使用封面叠字", async ({ page }) => {
  await page.goto("/models");
  const first = page.locator(".model-row").filter({ hasText: testData.paginatedModel });
  const count = Number((await first.locator(".model-meta").innerText()).match(/\d+/)?.[0] ?? 0);
  expect(count).toBe(testData.paginatedAlbums);
  await first.click();
  await expect(page.locator(".album-card-overlay")).toHaveCount(24);
  await page.getByRole("link", { name: "下一页 →" }).click();
  await expect(page.locator(".pagination")).toContainText("2 /");
  await expect(page.locator(".album-card-overlay")).toHaveCount(Math.min(24, count - 24));
  await page.getByRole("link", { name: "← 上一页" }).click();
  await expect(page.locator(".album-card-overlay")).toHaveCount(24);
});

test("排行榜区分前三名与后续列表", async ({ page }) => {
  await page.goto("/popular");
  await expect(page.locator(".popular-card")).toHaveCount(3);
  await expect(page.locator(".rank-list li").first().locator(".rank-list-number")).toHaveText("4");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("大图缩略条居中，并保持当前照片可见", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".album-cover").first().click();
  await page.getByRole("link", { name: "查看第 1 张图片" }).click();
  const strip = page.locator(".pswp__filmstrip");
  await expect(strip).toBeVisible();
  const last = strip.locator("button").last();
  await last.click();
  await expect(last).toHaveAttribute("aria-current", "true");
  await expect.poll(() => strip.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const selected = element.querySelector('[aria-current="true"]')!.getBoundingClientRect();
    return selected.left >= bounds.left - 1 && selected.right <= bounds.right + 1;
  })).toBe(true);
  await expect.poll(() => strip.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Math.abs(bounds.left + bounds.width / 2 - window.innerWidth / 2) < 2;
  })).toBe(true);
});
