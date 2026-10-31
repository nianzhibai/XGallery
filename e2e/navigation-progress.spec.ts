import { test, expect, type Route } from "@playwright/test";

function gate() {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  return { waiting, release };
}

async function holdRoute(route: Route, waiting: Promise<void>) {
  await waiting;
  await route.continue().catch(() => {});
}

test("慢速站内导航显示进度并在完成后消失", async ({ page }) => {
  const request = gate();
  await page.route("**/popular?*", (route) => holdRoute(route, request.waiting));
  try {
    await page.goto("/models");
    const progress = page.locator(".nav-progress");
    await expect(progress).toHaveAttribute("aria-hidden", "true");
    await expect(progress).toHaveClass(/is-idle/);
    await page.getByRole("link", { name: "最受喜爱" }).click();
    await expect(progress).toHaveClass(/is-loading/);
    await expect(progress).toBeVisible();
    request.release();
    await expect(page).toHaveURL(/\/popular$/);
    await expect(progress).toHaveClass(/is-idle/);
  } finally { request.release(); }
});

test("连续导航时以后一次请求为准", async ({ page }) => {
  const first = gate();
  const second = gate();
  await page.route("**/popular?*", (route) => holdRoute(route, first.waiting));
  await page.route("**/library?*", (route) => holdRoute(route, second.waiting));
  try {
    await page.goto("/models");
    const progress = page.locator(".nav-progress");
    await page.getByRole("link", { name: "最受喜爱" }).click();
    await expect(progress).toHaveClass(/is-loading/);
    await page.getByRole("link", { name: "我的收藏" }).click();
    first.release();
    await expect(progress).toHaveClass(/is-loading/);
    second.release();
    await expect(page).toHaveURL(/\/library$/);
    await expect(progress).toHaveClass(/is-idle/);
  } finally { first.release(); second.release(); }
});

test("搜索和浏览器返回结束后恢复空闲", async ({ page }) => {
  const search = gate();
  await page.route("**/search?*", (route) => holdRoute(route, search.waiting));
  try {
    await page.goto("/models");
    const progress = page.locator(".nav-progress");
    const input = page.getByRole("combobox", { name: "搜索相册" });
    await input.fill("预览");
    await input.press("Enter");
    await expect(progress).toHaveClass(/is-loading/);
    search.release();
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(progress).toHaveClass(/is-idle/);
    await page.goBack();
    await expect(page).toHaveURL(/\/models$/);
    await expect(progress).toHaveClass(/is-idle/);
  } finally { search.release(); }
});

test("减少动态效果时保持静态进度提示", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const request = gate();
  await page.route("**/popular?*", (route) => holdRoute(route, request.waiting));
  try {
    await page.goto("/models");
    const progress = page.locator(".nav-progress");
    await page.getByRole("link", { name: "最受喜爱" }).click();
    await expect(progress).toHaveClass(/is-loading/);
    await expect(progress).toHaveCSS("animation-name", "none");
    await expect(progress).toBeVisible();
    request.release();
    await expect(page).toHaveURL(/\/popular$/);
    await expect(progress).toHaveClass(/is-idle/);
  } finally { request.release(); }
});

test("随机图集的普通跳转也显示等待状态", async ({ page }) => {
  const request = gate();
  const requested = gate();
  await page.route("**/random", (route) => { requested.release(); return holdRoute(route, request.waiting); });
  try {
    await page.goto("/models");
    await page.evaluate(() => {
      const progress = document.querySelector(".nav-progress")!;
      new MutationObserver(() => sessionStorage.setItem("test-navigation-phase", progress.className))
        .observe(progress, { attributes: true, attributeFilter: ["class"] });
    });
    await page.getByRole("link", { name: "随机浏览图集" }).click({ noWaitAfter: true });
    await requested.waiting;
    await new Promise((resolve) => setTimeout(resolve, 250));
    request.release();
    await expect(page).toHaveURL(/\/(album\/[a-f0-9]{24})?$/);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("test-navigation-phase"))).toMatch(/is-loading/);
    await expect(page.locator(".nav-progress")).toHaveClass(/is-idle/);
  } finally { request.release(); }
});

test("当前页和新标签页操作不触发当前页进度", async ({ page, context }) => {
  await page.goto("/models");
  const progress = page.locator(".nav-progress");
  await page.getByRole("link", { name: "模特", exact: true }).click();
  await expect(progress).toHaveClass(/is-idle/);
  const newPage = context.waitForEvent("page");
  await page.getByRole("link", { name: "最受喜爱" }).click({ modifiers: ["Control"], noWaitAfter: true });
  const tab = await newPage;
  await expect(progress).toHaveClass(/is-idle/);
  await expect(page).toHaveURL(/\/models$/);
  await tab.close();
});
