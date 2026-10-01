import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120000);

// A legacy adult pair. The long test below waits for an actual new baby's
// full growth period. The phone test starts a prepared save near readiness.
async function openHerd(page: Page, youngReadyAt = 0) {
  await page.addInitScript(({ youngReadyAt }) => {
    if (sessionStorage.getItem("growth-fixture")) return;
    sessionStorage.setItem("growth-fixture", "loaded");
    const puff = (id: string, sex: number) => ({ id, genes: [1, 1, 1, 1, 0, 1, 1, 1, 1, sex], bornAt: Date.now(), matured: false });
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId: { father: puff("father", 2), mother: { ...puff("mother", 0), ...(youngReadyAt ? { breedingReadyAt: youngReadyAt } : {}) },
        "spare-male": puff("spare-male", 1), "spare-female": puff("spare-female", 0) } },
      clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() }, economy: { gold: 0, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 3, occupantIds: [], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 4, occupantIds: [], breedingProgress: 0 },
      } }, requests: { order: ["male-request", "female-request"], byId: {
        "male-request": { id: "male-request", requirements: [{ trait: "sex", value: "M" }], reward: 20 },
        "female-request": { id: "female-request", requirements: [{ trait: "sex", value: "F" }], reward: 20 },
      } },
    }));
  }, { youngReadyAt });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
}
const trigger = (page: Page) => page.locator("#herd-picker-summary");
const birth = (page: Page, n: number) => page.getByRole("article", { name: `Birth ${n}`, exact: true });
const pen = (page: Page) => page.getByRole("region", { name: "Pen 1 breeding status", exact: true });
async function choose(page: Page, id: string) {
  await trigger(page).click();
  await page.locator(".herd-picker-list").getByRole("button", { name: new RegExp(`ID: ${id}$`) }).click();
}
async function history(page: Page) {
  await trigger(page).click();
  await page.getByRole("button", { name: /^Recent births/ }).click();
}

test("a real newborn keeps its growth deadline through moves and reload, then becomes a parent", async ({ page }) => {
  await openHerd(page);
  for (const id of ["father", "mother"]) {
    await choose(page, id);
    await expect(page.locator(".puff-inspector .puff-growth-status")).toHaveText("Grown · ready to breed");
    await page.getByRole("button", { name: /^Move to Pen 1/ }).click();
  }
  await history(page);
  await expect(birth(page, 1)).toBeVisible({ timeout: 15000 });
  const baby = birth(page, 1).locator(".birth-puff").filter({ has: page.getByRole("heading", { name: "Baby", exact: true }) });
  const male = (await baby.innerText()).includes("Male ·");
  // Remove the adult of the baby's sex. Remaining pair needs this baby to grow.
  await birth(page, 1).getByRole("button", { name: male ? "Open father journal" : "Open mother journal", exact: true }).click();
  await page.getByRole("button", { name: "Return to pasture", exact: true }).click();
  await history(page);
  await birth(page, 1).getByRole("button", { name: "Open baby journal", exact: true }).click();
  const childId = (await page.locator(".puff-inspector-id").innerText()).trim();
  await expect(page.locator(".puff-inspector .puff-growth-status")).toContainText("Young");
  // Save by normal reload, and compare the saved deadline after moving.
  await page.reload();
  const deadline = await page.evaluate(id => JSON.parse(localStorage.getItem("bts:save")!).puffs.byId[id].breedingReadyAt, childId);
  expect(deadline).toBeGreaterThanOrEqual(60000);
  await choose(page, childId);
  await page.getByRole("button", { name: /^Move to Pen 2/ }).click();
  await page.getByRole("button", { name: /^Move to Pen 1/ }).click();
  await page.reload();
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem("bts:save")!).puffs.byId[id].breedingReadyAt, childId)).toBe(deadline);
  await choose(page, childId);
  await expect(page.locator(".puff-inspector .puff-growth-status")).toContainText("Young");
  await expect(pen(page)).toContainText("grow");
  await expect(pen(page).getByRole("progressbar")).toHaveCount(0);
  await history(page);
  // Longer than a normal breeding cycle, with zero Gold's speed boost active.
  await page.waitForTimeout(9000);
  await expect(birth(page, 2)).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".puff-inspector .puff-growth-status")).toHaveText("Grown · ready to breed", { timeout: 65000 });
  await history(page);
  await expect(birth(page, 2)).toBeVisible({ timeout: 15000 });
  const parent = birth(page, 2).locator(".birth-puff").filter({ has: page.getByRole("heading", { name: male ? "Father" : "Mother", exact: true }) });
  await expect(parent).toContainText(`ID: ${childId}`);
});

test("phone shows young and grown states while a Puff moves into a pen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHerd(page, 12000);
  await trigger(page).click();
  const young = page.locator(".herd-picker-list").getByRole("button", { name: /ID: mother$/ });
  await expect(young).toContainText("Young");
  await young.click();
  await page.getByRole("button", { name: /^Move to Pen 1/ }).click();
  await trigger(page).click();
  await page.getByRole("button", { name: "Pens", exact: true }).click();
  const card = page.getByRole("article", { name: "Puff mother", exact: true });
  await expect(card).toContainText("Young");
  await expect(card).toContainText("Female · Medium");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(card.locator(".puff-growth-status")).toHaveText("Grown · ready to breed", { timeout: 15000 });
  await card.getByRole("button", { name: "Open journal", exact: true }).click();
  await expect(trigger(page)).toBeFocused();
});

for (const action of ["Release", "Fulfill request for 20g"]) {
  test(`a young Puff can still use ${action}`, async ({ page }) => {
    await openHerd(page, 60000);
    await choose(page, "mother");
    await expect(page.locator(".puff-inspector .puff-growth-status")).toContainText("Young");
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(trigger(page)).toHaveText("Choose a Puff · 3");
    await trigger(page).click();
    await expect(page.locator(".herd-picker-list").getByRole("button", { name: /ID: mother$/ })).toHaveCount(0);
    await expect(page.locator(".herd-picker-list").getByRole("button", { name: /ID: spare-female$/ })).toBeVisible();
  });
}
