import { test, expect } from "@playwright/test";

test.describe("game bootstrap", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/game/i);
  });

  test("no uncaught errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    // wait for the app to fully render
    await page.waitForSelector("canvas", { timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test("renders a canvas element", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test("canvas has expected dimensions", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBe(800);
    expect(box!.height).toBe(600);
  });

  test("no console errors from pixi renderer", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForSelector("canvas", { timeout: 10000 });

    const rendererErrors = consoleErrors.filter(
      (e) =>
        e.includes("Unable to auto-detect") ||
        e.includes("Cannot read properties of null") ||
        e.includes("renderer")
    );
    expect(rendererErrors).toHaveLength(0);
  });

  test("heading is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /breed trade station/i })).toBeVisible();
  });
});
