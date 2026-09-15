import { test, expect, type Page } from "@playwright/test";

// A fresh browser save gives each test a known herd and a matching request.
// Gameplay itself goes through canvas clicks and visible buttons.
async function openFixture(page: Page) {
  await page.addInitScript(() => {
    const puff = (id: string, sex: number) => ({
      id, genes: [2, 2, 1, 0, 0, 1, 1, 1, 1, sex], bornAt: Date.now(), matured: false,
    });
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId: { a: puff("a", 1), m: puff("m", 0), z: puff("z", 1) } },
      clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() },
      economy: { gold: 50, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 4, occupantIds: [], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 4, occupantIds: [], breedingProgress: 0 },
      } },
      requests: { order: ["request-1"], byId: {
        "request-1": { id: "request-1", requirements: [{ trait: "eyeColor", value: "RD" }, { trait: "sex", value: "M" }], reward: 20 },
      } },
    }));
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
}

async function clickBoard(page: Page, x: number, y: number) {
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing game canvas");
  await canvas.click({ position: { x: x * box.width / 800, y: y * box.height / 600 }, force: true });
}

async function selectPasturePuff(page: Page, id: string) {
  const hash = id.charCodeAt(0);
  await clickBoard(page, 50 + hash % 700, 50 + hash * 7 % 290);
  await expect(page.locator(".puff-inspector-id")).toHaveText(id);
}

test("plain trait labels and selected Puff actions are in view on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFixture(page);
  await selectPasturePuff(page, "z");
  await expect(page.locator(".requests-panel")).toContainText("Eye color: Red");
  await expect(page.locator(".requests-panel")).toContainText("Sex: Male");
  await expect(page.locator(".puff-inspector-traits")).toHaveText(/Body sizeLargeBody colorMixedEye colorRedEar sizeMedium/);
  await expect(page.getByRole("button", { name: "Fulfill request for 20g" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Release", exact: true })).toBeInViewport();
});

for (const width of [800, 390]) {
  test(`game fits ${width}px and canvas clicks still select and move Puffs`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await openFixture(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const box = await page.locator("canvas").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await selectPasturePuff(page, "a");
    await clickBoard(page, 70, 560);
    await expect(page.getByRole("region", { name: "Pen 1 breeding status" })).toContainText("1/4 spaces used");
    // First slot in a four-space pen is (125, 457.5) in game coordinates.
    await clickBoard(page, 125, 457.5);
    await expect(page.locator(".puff-inspector-id")).toHaveText("a");
    await clickBoard(page, 700, 60);
    await expect(page.getByRole("region", { name: "Pen 1 breeding status" })).toContainText("0/4 spaces used");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test("sell a matching spare Puff and protect the last breeding pair", async ({ page }) => {
  await openFixture(page);
  await selectPasturePuff(page, "z");
  await page.getByRole("button", { name: "Fulfill request for 20g" }).click();
  await expect(page.locator(".puff-inspector")).toContainText("Select a Puff");
  await expect(page.locator(".gold-display-amount")).toHaveText("70g");
  await selectPasturePuff(page, "a");
  await expect(page.getByRole("button", { name: "Release", exact: true })).toBeDisabled();
  await expect(page.locator(".puff-inspector")).toContainText("Keep at least one male Puff");
  await selectPasturePuff(page, "m");
  await expect(page.getByRole("button", { name: "Release", exact: true })).toBeDisabled();
  await expect(page.locator(".puff-inspector")).toContainText("Keep at least one female Puff");
});

test("a male and female produce a baby after the breeding timer", async ({ page }) => {
  await openFixture(page);
  await selectPasturePuff(page, "a");
  await clickBoard(page, 70, 560);
  await selectPasturePuff(page, "m");
  await clickBoard(page, 70, 560);
  const pen = page.getByRole("region", { name: "Pen 1 breeding status" });
  await expect(pen).toContainText("2/4 spaces used");
  await expect(page.getByRole("progressbar", { name: "Pen 1 breeding progress" })).toBeVisible();
  await expect(pen).toContainText("3/4 spaces used", { timeout: 12000 });
});
