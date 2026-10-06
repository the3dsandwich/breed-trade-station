import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) test(`${width}px grown parent counts explain a full pen and follow catchup and moves`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => {
    const catchup = sessionStorage.getItem("parent-summary-catchup") === "yes";
    const puff = (id: string, sex: number) => ({ id, genes: [1, 1, 1, 0, 0, 1, 1, 1, 1, sex], bornAt: Date.now(), matured: false });
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId: { mother: puff("mother", 0), father: puff("father", 1), son: { ...puff("son", 1), breedingReadyAt: 60000 } } },
      clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() - (catchup ? 61000 : 0) },
      economy: { gold: 50, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 3, occupantIds: ["mother", "father", "son"], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 4, occupantIds: [], breedingProgress: 0 },
      } },
      requests: { order: ["r"], byId: { r: { id: "r", requirements: [{ trait: "sex", value: "M" }], reward: 20 } } },
    }));
  });
  await page.goto("/");
  const status = page.getByRole("region", { name: "Pen 1 breeding status", exact: true });
  const cue = "With room for a baby, any grown male and female here can become parents.";
  await expect(status).toContainText("Grown: 1 male · 1 female");
  await expect(status).not.toContainText(cue);
  await expect(status).toContainText("Pen full.");
  await page.evaluate(() => sessionStorage.setItem("parent-summary-catchup", "yes"));
  await page.reload();
  await expect(status).toContainText("Grown: 2 males · 1 female");
  await expect(status).toContainText(cue);
  await expect(status).toContainText("Pen full.");
  await expect(page.getByRole("region", { name: "Pen 2 breeding status", exact: true })).toContainText("Grown: 0 males · 0 females");
  await page.locator("#herd-picker-summary").click();
  await page.getByRole("button", { name: "Pens", exact: true }).click();
  const occupants = page.getByRole("region", { name: "Pen occupants", exact: true });
  await expect(occupants.locator(".pen-parent-summary")).toContainText("Grown: 2 males · 1 female");
  await expect(occupants.locator(".pen-parent-summary")).toContainText(cue);
  await expect(occupants.locator(".pen-parent-summary [role=status], .pen-parent-summary [aria-live]")).toHaveCount(0);
  await occupants.getByRole("article", { name: "Puff father", exact: true }).getByRole("button", { name: "Move to pasture", exact: true }).click();
  await expect(occupants.locator(".pen-parent-summary")).toHaveText("Grown: 1 male · 1 female");
  await expect(status).toContainText("Grown: 1 male · 1 female");
  await occupants.getByRole("article", { name: "Puff mother", exact: true }).getByRole("button", { name: "Move to pasture", exact: true }).click();
  await expect(occupants.locator(".pen-parent-summary")).toHaveText("Grown: 1 male · 0 females");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
