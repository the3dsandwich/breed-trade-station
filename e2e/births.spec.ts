import { expect, test, type Page } from "@playwright/test";

// Includes a live birth, several selections, and a full save/reload cycle.
test.setTimeout(60000);

// Legacy save fixture with known visible traits. Births and all later changes
// happen through the live game and UI; no Redux actions or timers are injected.
async function openLegacyHerd(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("birth-fixture")) return;
    sessionStorage.setItem("birth-fixture", "loaded");
    const puff = (id: string, sex: number, eye: number) => ({
      id, genes: [1, 1, 1, eye, 0, 1, 1, 1, 1, sex], bornAt: Date.now(), matured: false,
    });
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId: { father: puff("father", 1, 0), mother: puff("mother", 0, 2),
        "spare-male": puff("spare-male", 1, 0), "spare-female": puff("spare-female", 0, 0) } },
      clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() },
      economy: { gold: 50, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 3, occupantIds: [], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 4, occupantIds: [], breedingProgress: 0 },
      } },
      requests: { order: ["male-request"], byId: { "male-request": {
        id: "male-request", requirements: [{ trait: "sex", value: "M" }], reward: 20,
      } } },
    }));
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
}
const trigger = (page: Page) => page.locator("#herd-picker-summary");
const close = (page: Page) => page.getByRole("button", { name: "Close", exact: true });
const record = (page: Page) => page.getByRole("article", { name: "Birth 1", exact: true });
async function viewRecords(page: Page) {
  await trigger(page).click();
  await page.getByRole("button", { name: /^Recent births/ }).click();
}
async function choose(page: Page, id: string) {
  await trigger(page).click();
  await page.locator(".herd-picker-list").getByRole("button", { name: new RegExp(`ID: ${id}$`) }).click();
}
async function breed(page: Page) {
  for (const id of ["father", "mother"]) {
    await choose(page, id);
    await page.getByRole("button", { name: /^Move to Pen 1/ }).click();
  }
  await viewRecords(page);
  await expect(record(page)).toBeVisible({ timeout: 15000 });
}

for (const width of [1280, 390]) {
  test(`${width}px birth record shows parents, opens the baby, and survives reload`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openLegacyHerd(page);
    await viewRecords(page);
    await expect(page.getByRole("region", { name: "Recent births", exact: true })).toContainText("Earlier births were not recorded");
    await expect(page.getByRole("article")).toHaveCount(0);
    await close(page).click();
    await breed(page);
    const birth = record(page);
    await expect(birth).toContainText("ID: father");
    await expect(birth).toContainText("ID: mother");
    await expect(birth.locator(".birth-puff").filter({ has: page.getByRole("heading", { name: "Mother", exact: true }) })).toContainText("Brown eyes");
    await expect(birth.locator(".birth-puff").filter({ has: page.getByRole("heading", { name: "Father", exact: true }) })).toContainText("Red eyes");
    const savedText = await birth.innerText();
    const dialog = (await page.getByRole("dialog").boundingBox())!;
    expect(dialog.x).toBeGreaterThanOrEqual(0);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(width);
    expect(dialog.y + dialog.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await birth.getByRole("button", { name: "Open baby journal" }).click();
    await expect(trigger(page)).toBeFocused();
    const childId = (await page.locator(".puff-inspector-id").innerText()).trim();
    expect(childId).not.toMatch(/^(father|mother|spare-)/);
    await page.reload();
    await viewRecords(page);
    await expect(birth).toHaveText(savedText, { useInnerText: true });
    await page.keyboard.press("Escape");
    await expect(trigger(page)).toBeFocused();
  });
}

test("records survive sales and release; bulk mode cannot select a recorded baby", async ({ page }) => {
  await openLegacyHerd(page);
  await breed(page);
  await close(page).click();
  await page.getByRole("button", { name: "Bulk release", exact: true }).click();
  await viewRecords(page);
  await expect(record(page).getByRole("button", { name: "Open baby journal" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Recent births", exact: true })).toContainText("Finish bulk release");
  await page.getByRole("button", { name: "Done choosing" }).click();
  await expect(page.locator(".release-controls")).toContainText("0 selected");
  await page.getByRole("button", { name: "Cancel bulk release", exact: true }).click();
  await choose(page, "father");
  // Stop this pen first, so a sale cannot change the pair under inspection.
  await page.getByRole("button", { name: "Return to pasture", exact: true }).click();
  await page.getByRole("button", { name: "Fulfill request for 20g", exact: true }).click();
  await viewRecords(page);
  await expect(record(page)).toContainText("ID: father");
  await record(page).getByRole("button", { name: "Open baby journal" }).click();
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await page.reload();
  await viewRecords(page);
  await expect(record(page)).toContainText("No longer in your herd");
  await expect(record(page)).toContainText("ID: father");
  await expect(record(page).getByRole("button", { name: "Open baby journal" })).toHaveCount(0);
});
