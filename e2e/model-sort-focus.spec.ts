import { expect, test } from "@playwright/test";

test("鼠标选择排序后保留键盘导航位置，键盘操作显示焦点", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/models");

  const sort = page.getByRole("button", { name: /按名称|按热度/ });
  await sort.click();
  await page.getByRole("menuitemradio", { name: "按热度排序" }).click();
  await expect(sort).toHaveText("按热度");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(sort).toBeFocused();
  await expect(sort).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Tab");
  await expect(page.locator(".model-row").first()).toBeFocused();

  await sort.focus();
  await page.keyboard.press("Shift");
  await expect(sort).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(sort).toBeFocused();
  await expect(sort).toHaveCSS("outline-style", "solid");

  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(sort).toBeFocused();
});

test("排序过渡期间不能再次打开菜单，结束后可以继续操作", async ({ page }) => {
  await page.goto("/models");
  const sort = page.getByRole("button", { name: /按名称|按热度/ });
  await sort.click();
  await page.getByRole("menuitemradio", { name: "按热度排序" }).click();
  await expect(sort).toHaveAttribute("aria-disabled", "true");

  await sort.dispatchEvent("pointerdown", { button: 0, pointerType: "mouse" });
  await expect(sort).toHaveAttribute("aria-expanded", "false");
  await sort.dispatchEvent("keydown", { key: "Enter" });
  await expect(sort).toHaveAttribute("aria-expanded", "false");

  await expect(sort).toHaveAttribute("aria-disabled", "false");
  await sort.click();
  await expect(page.getByRole("menuitemradio", { name: "按名称排序" })).toBeVisible();
});
