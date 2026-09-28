import { expect, test, type Page } from "@playwright/test";

// Several real UI moves and, in the final test, a live breeding cycle.
test.setTimeout(60000);

async function openFixture(page: Page, breed = false) {
  await page.addInitScript(({ breed }) => {
    if (sessionStorage.getItem("pen-fixture")) return;
    sessionStorage.setItem("pen-fixture", "loaded");
    const puff = (id: string, sex: number) => ({
      id, genes: [1, 1, 1, 1, 0, 1, 1, 1, 1, sex], bornAt: Date.now(), matured: false,
    });
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId: { A: puff("A", 1), B: puff("B", 1), C: puff("C", 1), D: puff("D", 1),
        E: puff("E", 1), F: puff("F", 0) } },
      clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() },
      economy: { gold: 50, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 4, occupantIds: ["A", "B", "C", "D"], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 3, occupantIds: breed ? ["E", "F"] : [], breedingProgress: 0 },
      } },
      requests: { order: ["male-request"], byId: { "male-request": {
        id: "male-request", requirements: [{ trait: "sex", value: "M" }], reward: 20,
      } } },
    }));
  }, { breed });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
}
const trigger = (page: Page) => page.locator("#herd-picker-summary");
const panel = (page: Page) => page.getByRole("region", { name: "Pen occupants", exact: true });
const selector = (page: Page) => page.getByRole("combobox", { name: "Choose a pen", exact: true });
const card = (page: Page, id: string) => panel(page).getByRole("article", { name: `Puff ${id}`, exact: true });
async function openPens(page: Page) {
  await trigger(page).click();
  await page.getByRole("button", { name: "Pens", exact: true }).click();
}
async function keyboardActivate(page: Page, target: ReturnType<typeof card>) {
  for (let i = 0; i < 50; i++) {
    if (await target.evaluate(el => el === document.activeElement)) {
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("Could not reach pen control using Tab");
}

for (const width of [1280, 390]) {
  test(`${width}px manage only this pen, preserve the herd and save moved occupants`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openFixture(page);
    await openPens(page);
    await selector(page).selectOption("pen-1");
    await expect(panel(page).getByRole("article")).toHaveCount(4);
    await expect(card(page, "E")).toHaveCount(0);
    await expect(panel(page)).toContainText("Pen full");
    await expect(panel(page)).not.toContainText("Born here");
    await keyboardActivate(page, card(page, "A").getByRole("button", { name: "Move to pasture", exact: true }));
    await expect(selector(page)).toBeFocused();
    await expect(card(page, "A")).toHaveCount(0);
    await expect(panel(page)).toContainText("3/4 spaces used");
    await card(page, "B").getByRole("button", { name: "Move to pasture", exact: true }).click();
    await expect(panel(page).getByRole("article")).toHaveCount(2);
    await expect(page.getByRole("dialog")).toBeVisible();
    await selector(page).selectOption("pen-2");
    await expect(panel(page)).toContainText("This pen is empty");
    await page.getByRole("button", { name: /^Recent births/ }).click();
    await page.getByRole("button", { name: "Pens", exact: true }).click();
    await expect(selector(page)).toHaveValue("pen-2");
    const bounds = (await page.getByRole("dialog").boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(trigger(page)).toBeFocused();
    await page.reload();
    await openPens(page);
    await selector(page).selectOption("pen-1");
    await expect(panel(page).getByRole("article")).toHaveCount(2);
    await expect(card(page, "C")).toBeVisible();
    await expect(card(page, "D")).toBeVisible();
    await page.getByRole("button", { name: "Your Puffs", exact: true }).click();
    await expect(page.locator(".herd-picker-list > li")).toHaveCount(6);
  });
}

test("pen view is read-only during bulk release and journal selection stays selected", async ({ page }) => {
  await openFixture(page);
  await openPens(page);
  await card(page, "A").getByRole("button", { name: "Open journal", exact: true }).click();
  await expect(page.locator(".puff-inspector-id")).toHaveText("A");
  await expect(trigger(page)).toBeFocused();
  await openPens(page);
  await card(page, "A").getByRole("button", { name: "Open journal", exact: true }).click();
  await expect(page.locator(".puff-inspector-id")).toHaveText("A");
  await page.getByRole("button", { name: "Bulk release", exact: true }).click();
  await trigger(page).click();
  await page.locator(".herd-picker-list").getByRole("button", { name: /ID: A$/ }).click();
  await page.getByRole("button", { name: "Pens", exact: true }).click();
  await expect(card(page, "A").getByRole("button", { name: "Open journal", exact: true })).toBeDisabled();
  await expect(card(page, "A").getByRole("button", { name: "Move to pasture", exact: true })).toBeDisabled();
  await expect(panel(page)).toContainText("bulk release");
  await expect(page.locator("#herd-dialog-help")).toContainText("Finish bulk release");
  await page.getByRole("button", { name: "Done choosing" }).click();
  await expect(page.locator(".release-controls")).toContainText("1 selected");
});

test("a live newborn appears in its pen, and moving it does not invent a different birthplace", async ({ page }) => {
  await openFixture(page, true);
  await openPens(page);
  await card(page, "A").getByRole("button", { name: "Move to pasture", exact: true }).click();
  await selector(page).selectOption("pen-2");
  const newborn = panel(page).getByRole("article").filter({ hasText: "Born here · Birth 1" });
  await expect(newborn).toBeVisible({ timeout: 15000 });
  const id = (await newborn.getAttribute("aria-label"))!.slice("Puff ".length);
  await expect(panel(page)).toContainText("3/3 spaces used");
  await newborn.getByRole("button", { name: "Open journal", exact: true }).click();
  await page.getByRole("button", { name: /^Move to Pen 1/ }).click();
  await openPens(page);
  await selector(page).selectOption("pen-1");
  await expect(card(page, id)).toBeVisible();
  await expect(card(page, id)).not.toContainText("Born here");
  await page.getByRole("button", { name: /^Recent births/ }).click();
  await expect(page.getByRole("article", { name: "Birth 1", exact: true })).toContainText("Pen 2");
});
