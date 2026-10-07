import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) test(`${width}px past sales opens an empty old save, records a sale and keeps its receipt after reload`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem("past-sales-seed")) return;
    sessionStorage.setItem("past-sales-seed", "yes");
    const puff = (id: string, sex: number) => ({ id, genes: [1, 1, 1, 0, 0, 1, 1, 0, 0, sex], bornAt: Date.now(), matured: false });
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId: { mother: puff("mother", 0), father: puff("father", 1), sold: puff("sold", 1) } },
      clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() }, economy: { gold: 50, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 4, occupantIds: [], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 4, occupantIds: [], breedingProgress: 0 },
      } },
      requests: { order: ["sale-request"], byId: { "sale-request": { id: "sale-request", requirements: [{ trait: "sex", value: "M" }], reward: 16 } } },
    }));
  });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Past sales", exact: true });
  const dialog = page.getByRole("dialog", { name: "Past sales", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Sales from before this record began aren't available.");
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Tab");
  await expect(trigger).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.locator("#herd-picker-summary").click();
  await page.getByRole("dialog", { name: "Choose a Puff", exact: true }).getByRole("button", { name: /ID: sold\b/ }).click();
  await page.getByRole("button", { name: "Fulfill request for 16g", exact: true }).click();
  await expect(page.locator(".gold-display-amount")).toHaveText("66g");
  await trigger.click();
  const receipt = dialog.getByRole("article", { name: "Sale of Puff sold", exact: true });
  await expect(receipt).toContainText("Earned 16g");
  await expect(receipt).toContainText("Sex: Male");
  await expect(receipt).toContainText("Black");
  await expect(receipt).toContainText("Medium");
  await expect(receipt).toContainText("ID: sold");
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await close.click();
  await expect(trigger).toBeFocused();
  await page.reload();
  await trigger.click();
  await expect(receipt).toContainText("Earned 16g");
  await expect(dialog.getByRole("article")).toHaveCount(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bts:save")!));
  expect(saved.puffs.byId.sold).toBeUndefined();
  expect(saved.requests.pastSales[0].puff).not.toHaveProperty("genes");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
