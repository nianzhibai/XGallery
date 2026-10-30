import { test, expect } from "@playwright/test";

test("页眉随滚动收起和出现，搜索获得焦点后保持可见", async ({ page }) => {
  await page.goto("/");
  const header = page.locator(".site-bar");
  const input = page.getByRole("combobox", { name: "搜索相册" });
  await input.fill("布丁");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("button", { name: "清空搜索" }).click();
  await input.blur();
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-hidden", "");
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));
  await expect(header).not.toHaveAttribute("data-hidden");
  await expect(header).toHaveAttribute("data-scrolled", "");
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-hidden", "");
  await page.keyboard.press("/");
  await expect(input).toBeFocused();
  await expect(header).not.toHaveAttribute("data-hidden");
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
  await expect(header).not.toHaveAttribute("data-hidden");
  await expect(input).toBeInViewport();
});

test("搜索框在桌面、平板和手机上都不挤出导航", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "搜索相册" });
  for (const width of [1440, 1100, 900, 841, 840, 761, 760, 641, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await input.focus();
    await page.locator(".search-box").evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {})));
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `视口宽度 ${width}`).toBe(true);
    expect((await input.boundingBox())!.width).toBeGreaterThan(30);
    await expect(page.getByRole("button", { name: "切换到暗色模式" })).toBeInViewport();
    if (width > 640) {
      const brand = await page.locator(".brand").boundingBox();
      const actions = await page.locator(".header-actions").boundingBox();
      expect(actions!.y).toBeLessThan(brand!.y + brand!.height);
    }
    await input.blur();
  }
});

test("搜索建议突出匹配文字，支持 Escape 和方向键选择", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "搜索相册" });
  await input.fill("布丁");
  const suggestions = page.getByRole("listbox", { name: "匹配模特" });
  await expect(suggestions.locator("mark").first()).toHaveText("布丁");
  await input.press("Escape");
  await expect(suggestions).toHaveCount(0);
  await expect(input).toBeFocused();
  await input.press("Escape");
  await expect(input).not.toBeFocused();
  await page.keyboard.press("/");
  await input.press("ArrowDown");
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/model\/[a-f0-9]{24}$/);
  await expect(page.getByRole("heading", { name: "布丁大法", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "模特", exact: true })).toHaveClass(/is-active/);
});

for (const mode of ["native", "fallback", "reduced"] as const) {
  test(`主题切换完成后恢复交互并持久保存（${mode}）`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: mode === "reduced" ? "reduce" : "no-preference" });
    if (mode === "fallback") await page.addInitScript(() => {
      Object.defineProperty(document, "startViewTransition", { value: undefined, configurable: true });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "切换到暗色模式" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).not.toHaveClass(/theme-transition/);
    expect(await page.evaluate(() => localStorage.getItem("xgallery-theme"))).toBe("dark");
    await page.getByRole("button", { name: "切换到亮色模式" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).not.toHaveClass(/theme-transition/);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("combobox", { name: "搜索相册" }).fill("布丁");
    await expect(page.getByRole("listbox")).toBeVisible();
  });
}

for (const [system, saved, color] of [["light", "dark", "#0d0c0b"], ["dark", "light", "#ece5d8"]] as const) {
  test(`状态栏颜色跟随已保存的网站主题（系统 ${system}）`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: system, reducedMotion: "reduce" });
    await page.addInitScript((theme) => localStorage.setItem("xgallery-theme", theme), saved);
    await page.goto("/");
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("data-theme", saved);
    await expect(themeColor).toHaveAttribute("content", color);
    await page.getByRole("button", { name: saved === "dark" ? "切换到亮色模式" : "切换到暗色模式" }).click();
    await expect(themeColor).toHaveAttribute("content", saved === "dark" ? "#ece5d8" : "#0d0c0b");
  });
}

test("收藏不推挤相邻按钮，大图双击点赞后正常返回", async ({ page }) => {
  await page.goto("/");
  await page.locator(".album-cover").first().click();
  const favorite = page.getByRole("button", { name: "收藏", exact: true });
  const share = page.getByRole("button", { name: "分享", exact: true });
  const shareX = (await share.boundingBox())!.x;
  await favorite.click();
  await expect(page.getByRole("button", { name: "已收藏", exact: true })).toBeVisible();
  expect((await share.boundingBox())!.x).toBeCloseTo(shareX, 0);
  const previousLikes = Number(await page.locator(".like-count").textContent());
  await page.getByRole("link", { name: "查看第 1 张图片", exact: true }).click();
  const photo = page.locator(".pswp__item[aria-hidden='false'] img.pswp__img:not(.pswp__img--placeholder)");
  await expect.poll(() => photo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await photo.dblclick();
  await expect(page.locator(".pswp__like-heart")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pswp")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "取消点赞", exact: true })).toBeVisible();
  await expect(page.locator(".like-count")).toHaveText(String(previousLikes + 1));
  await page.getByRole("button", { name: "取消点赞", exact: true }).click();
});
