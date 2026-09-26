import { expect, test, type Locator, type Page } from "@playwright/test";

// Prepared UI fixture: Aa and BB share the same pasture position. State is
// seeded only once; all later selection, moves, sales and saves use the real UI.
async function openHerd(page: Page, full = false) {
  await page.addInitScript(({ full }) => {
    if (sessionStorage.getItem("herd-fixture")) return;
    sessionStorage.setItem("herd-fixture", "loaded");
    const puff = (id: string, sex: number) => ({
      id, genes: [2, 2, 1, 0, 0, 1, 1, 1, 1, sex], bornAt: Date.now(), matured: false,
    });
    const byId = { Aa: puff("Aa", 1), BB: puff("BB", 0), CC: puff("CC", 1),
      ...(full ? { DD: puff("DD", 1), EE: puff("EE", 1), FF: puff("FF", 1) } : {}) };
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId }, clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() },
      economy: { gold: 50, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 4, occupantIds: full ? ["CC", "DD", "EE", "FF"] : [], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 4, occupantIds: [], breedingProgress: 0 },
      } },
      requests: { order: ["request-1"], byId: { "request-1": {
        id: "request-1", requirements: [{ trait: "sex", value: "M" }], reward: 20,
      } } },
    }));
  }, { full });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
}

// Walk the actual tab order rather than focusing the target with JavaScript.
async function keyboardActivate(page: Page, target: Locator) {
  for (let step = 0; step < 60; step++) {
    if (await target.evaluate(el => el === document.activeElement)) {
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach control with Tab: ${await target.textContent()}`);
}

const summary = (page: Page) => page.locator(".herd-picker summary");
const row = (page: Page, id: string) => page.locator(".herd-picker").getByRole("button", { name: new RegExp(`ID: ${id}\\b`) });
const pen = (page: Page, index: number) => page.getByRole("region", { name: `Pen ${index} breeding status` });
async function choose(page: Page, id: string) {
  await summary(page).click();
  await row(page, id).click();
  await expect(page.locator(".puff-inspector-id")).toHaveText(id);
}

test("keyboard chooses overlapping parents, assigns them and produces a baby", async ({ page }) => {
  await openHerd(page);
  for (const id of ["Aa", "BB"]) {
    await keyboardActivate(page, summary(page));
    await keyboardActivate(page, row(page, id));
    await expect(page.locator(".puff-inspector-id")).toHaveText(id);
    await expect(summary(page)).toBeFocused();
    await keyboardActivate(page, page.getByRole("button", { name: /^Move to Pen 1/ }));
  }
  await expect(pen(page, 1)).toContainText("2/4 spaces used");
  await expect(pen(page, 1)).toContainText("3/4 spaces used", { timeout: 12000 });
});

test("full/current pen reasons, return to pasture, and saved moves", async ({ page }) => {
  await openHerd(page, true);
  await choose(page, "Aa");
  await expect(page.getByRole("button", { name: /Pen 1.*full/i })).toBeDisabled();
  await page.getByRole("button", { name: /^Move to Pen 2/ }).click();
  await expect(pen(page, 2)).toContainText("1/4 spaces used");
  await expect(page.getByRole("button", { name: /In Pen 2/i })).toBeDisabled();
  await page.reload();
  await expect(pen(page, 2)).toContainText("1/4 spaces used");
  await choose(page, "Aa");
  await page.getByRole("button", { name: "Return to pasture", exact: true }).click();
  await expect(pen(page, 2)).toContainText("0/4 spaces used");
  await expect(pen(page, 1)).toContainText("4/4 spaces used");
  await page.reload();
  await expect(pen(page, 2)).toContainText("0/4 spaces used");
});

test("picker bulk selection keeps last-parent protection and cancels cleanly", async ({ page }) => {
  await openHerd(page);
  await choose(page, "Aa");
  await page.getByRole("button", { name: "Bulk release", exact: true }).click();
  await expect(page.getByRole("group", { name: "Move this Puff" })).toHaveCount(0);
  await summary(page).click();
  await row(page, "BB").click();
  await expect(row(page, "BB")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Release 1", exact: true })).toBeDisabled();
  await expect(page.locator(".release-controls")).toContainText("Keep at least one female");
  await page.getByRole("button", { name: "Cancel bulk release", exact: true }).click();
  await expect(row(page, "BB")).toHaveAttribute("aria-pressed", "false");
  await row(page, "CC").click();
  await page.getByRole("button", { name: "Fulfill request for 20g", exact: true }).click();
  await expect(summary(page)).toBeFocused();
  await summary(page).click();
  await expect(row(page, "CC")).toHaveCount(0);
});

for (const width of [390, 1280]) {
test(`${width}px picker fits, keeps selection, and Escape returns focus`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await openHerd(page);
  await choose(page, "BB");
  await summary(page).click();
  expect((await row(page, "BB").boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await row(page, "BB").click();
  await expect(page.locator(".puff-inspector-id")).toHaveText("BB");
  await summary(page).click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(summary(page)).toBeFocused();
  await expect(row(page, "BB")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const picker = (await page.locator(".herd-picker").boundingBox())!;
  const inspector = (await page.locator(".puff-inspector").boundingBox())!;
  expect(picker.y + picker.height).toBeLessThanOrEqual(inspector.y);
});
}
