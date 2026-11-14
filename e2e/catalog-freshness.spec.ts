import { test, expect, type Page } from "@playwright/test";

/** Simulates a sync that deleted an album: album lookups no longer return it. */
async function hideAlbum(page: Page, id: string) {
  await page.route("**/api/albums/lookup", async (route) => {
    const response = await route.fetch();
    const body = await response.json() as { data: { id: string }[] };
    await route.fulfill({ response, json: { data: body.data.filter((album) => album.id !== id) } });
  });
}
const albumId = (href: string | null) => href!.split("/").pop()!;

test("收藏页重新验证会话中缓存的图集，已删除的图集不再显示", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("region", { name: "最近更新" }).locator(".album-cover").first().click();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await expect(page.getByRole("button", { name: "已收藏", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page).toHaveURL("/");

  await page.route("**/api/albums/lookup", (route) => route.fulfill({ json: { data: [] } }));
  await page.getByRole("link", { name: "我的收藏" }).click();
  await expect(page).toHaveURL("/library");
  await expect(page.getByRole("heading", { name: "还没有收藏" })).toBeVisible();
  await expect(page.locator(".album-card")).toHaveCount(0);
});

test("切换收藏页标签时重新验证图集", async ({ page }) => {
  await page.goto("/");
  const cover = page.getByRole("region", { name: "最近更新" }).locator(".album-cover").first();
  const id = albumId(await cover.getAttribute("href"));
  await cover.click();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("link", { name: "我的收藏" }).click();
  await expect(page.locator(".album-card")).toHaveCount(1);

  await hideAlbum(page, id);
  await page.getByRole("link", { name: /最近看过/ }).click();
  await expect(page).toHaveURL("/library?tab=recent");
  await expect(page.getByRole("heading", { name: "还没有看过的图集" })).toBeVisible();
});

// Which batches remain valid is decided by the server and covered by unit tests;
// this checks that a restored section adopts the server's answer.
test("返回首页时恢复的批次采用服务器核对后的结果", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "最近更新" });
  const links = () => section.locator(".album-cover").evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  const reversed = (await links()).reverse();
  await section.locator(".album-cover").first().click();
  await expect(page.locator(".album-title")).toBeVisible();

  const lookup = await page.request.post("/api/albums/lookup", { data: { ids: reversed.map(albumId) } });
  const replacement = (await lookup.json()).data as { id: string }[];
  await page.route(/\/api\/home\/recent\?restore=/, (route) => route.fulfill({ json: { data: replacement } }));
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect.poll(links).toEqual(reversed);
});

test("搜索建议在每次进入页面后重新读取", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/models") requests++; });
  const input = page.getByRole("combobox", { name: "搜索相册" });
  const suggestions = page.getByRole("listbox", { name: "匹配模特" });

  await page.goto("/");
  await input.fill("模特");
  await expect(suggestions).toBeVisible();
  await input.blur();
  await input.fill("测试");
  await expect(suggestions).toBeVisible();
  expect(requests).toBe(1);

  await page.getByRole("link", { name: "模特", exact: true }).click();
  await expect(page).toHaveURL("/models");
  await input.fill("模特");
  await expect(suggestions).toBeVisible();
  expect(requests).toBe(2);
});

test("换一批返回空结果时保留当前图集并允许再次操作", async ({ page }) => {
  await page.route("**/api/home/recent?*", (route) => route.fulfill({ json: { data: [] } }));
  await page.goto("/");
  const section = page.getByRole("region", { name: "最近更新" });
  const covers = section.locator(".album-cover");
  await expect(covers).toHaveCount(8);
  const before = await covers.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
  const button = section.getByRole("button", { name: "换一批" });
  await button.click();
  await expect(page.getByRole("status")).toContainText("暂时无法换一批");
  await expect(button).toBeEnabled();
  expect(await covers.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")))).toEqual(before);
});
