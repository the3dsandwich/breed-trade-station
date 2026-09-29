import { expect, test, type Page } from "@playwright/test";

test.setTimeout(60000);

// Prepared history deliberately includes identical-looking parents and one pair
// breeding in two pens. Subsequent actions and births use the real game/UI.
async function openHistory(page: Page, live?: "same" | "other") {
  await page.addInitScript(({ live }) => {
    if (sessionStorage.getItem("pair-history-fixture")) return;
    sessionStorage.setItem("pair-history-fixture", "loaded");
    const puff = (id: string, sex: number) => ({ id, genes: [1, 1, 1, 1, 0, 1, 1, 1, 1, sex], bornAt: Date.now(), matured: false });
    const snapshot = (id: string, sex: string) => ({ id, traits: { bodySize: "M", bodyColor: "MX", eyeColor: "BR", earSize: "M", sex } });
    const birth = (number: number, mother: string, father: string, penId = "pen-1") => ({
      number, mother: snapshot(mother, "F"), father: snapshot(father, "M"),
      child: snapshot(`child-${number}`, "M"), penId, penName: penId === "pen-1" ? "Pen 1" : "Pen 2", catchup: false,
    });
    const records = live
      ? Array.from({ length: 20 }, (_, i) => birth(20 - i, i === 19 ? "mother" : "other-mother", "father"))
      : [birth(3, "mother", "father", "pen-2"), birth(2, "other-mother", "father"), birth(1, "mother", "father")];
    localStorage.setItem("bts:save", JSON.stringify({
      puffs: { byId: { mother: puff("mother", 0), father: puff("father", 1), "other-mother": puff("other-mother", 0), "spare-male": puff("spare-male", 1), "child-3": puff("child-3", 1) }, recentBirths: records, birthCount: live ? 20 : 3 },
      clock: { gameTime: 0, speed: 1, lastSavedAt: Date.now() }, economy: { gold: 500, upkeepAccumulator: 0 },
      pens: { order: ["pen-1", "pen-2"], byId: {
        "pen-1": { id: "pen-1", name: "Pen 1", capacity: 3, occupantIds: [], breedingProgress: 0 },
        "pen-2": { id: "pen-2", name: "Pen 2", capacity: 4, occupantIds: [], breedingProgress: 0 },
      } }, requests: { order: [], byId: {} },
    }));
  }, { live });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
}
const region = (page: Page) => page.getByRole("region", { name: "Recent births", exact: true });
const record = (page: Page, n: number) => region(page).getByRole("article", { name: `Birth ${n}`, exact: true });
const trigger = (page: Page) => page.locator("#herd-picker-summary");
async function history(page: Page) {
  await trigger(page).click();
  await page.getByRole("button", { name: /^Recent births/ }).click();
}
async function choose(page: Page, id: string) {
  await trigger(page).click();
  await page.locator(".herd-picker-list").getByRole("button", { name: new RegExp(`ID: ${id}$`) }).click();
}
async function filter(page: Page, n: number) {
  await record(page, n).getByRole("button", { name: /Show this pair/ }).click();
}

for (const width of [1280, 390]) {
  test(`${width}px exact pair history crosses pens and opens the correct living parent`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openHistory(page);
    await history(page);
    await filter(page, 3);
    await expect(region(page).getByRole("article")).toHaveCount(2);
    await expect(record(page, 3)).toContainText("Pen 2");
    await expect(record(page, 1)).toContainText("Pen 1");
    await expect(record(page, 2)).toHaveCount(0);
    await expect(region(page).getByRole("status")).toHaveText("2 births from this pair in the latest 20 records. Includes all pens. Older births may no longer be shown.");
    await expect(region(page).getByRole("heading", { name: "This pair's births", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Show all births", exact: true }).click();
    await expect(region(page).getByRole("article")).toHaveCount(3);
    await expect(region(page).getByRole("heading", { name: "All recent births", exact: true })).toBeFocused();
    await filter(page, 3);
    await record(page, 3).getByRole("button", { name: "Open mother journal", exact: true }).click();
    await expect(page.locator(".puff-inspector-id")).toHaveText("mother");
    await expect(trigger(page)).toBeFocused();
    await history(page);
    await record(page, 3).getByRole("button", { name: "Open mother journal", exact: true }).click();
    await expect(page.locator(".puff-inspector-id")).toHaveText("mother");
    await history(page);
    await record(page, 3).getByRole("button", { name: "Open father journal", exact: true }).click();
    await expect(page.locator(".puff-inspector-id")).toHaveText("father");
    await page.reload();
    await history(page);
    await expect(region(page).getByRole("article")).toHaveCount(3);
    const bounds = (await page.getByRole("dialog").boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(trigger(page)).toBeFocused();
  });
}

test("bulk filtering preserves the marked Puff; removed parent remains a readable snapshot", async ({ page }) => {
  await openHistory(page);
  await page.getByRole("button", { name: "Bulk release", exact: true }).click();
  await trigger(page).click();
  await page.locator(".herd-picker-list").getByRole("button", { name: /ID: mother$/ }).click();
  await page.getByRole("button", { name: /^Recent births/ }).click();
  await filter(page, 3);
  for (const name of ["Open mother journal", "Open father journal", "Open baby journal"]) {
    await expect(record(page, 3).getByRole("button", { name, exact: true })).toBeDisabled();
  }
  await page.getByRole("button", { name: "Done choosing" }).click();
  await expect(page.locator(".release-controls")).toContainText("1 selected");
  await page.getByRole("button", { name: "Cancel bulk release", exact: true }).click();
  await choose(page, "father");
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await history(page);
  await filter(page, 3);
  await expect(region(page).getByRole("article")).toHaveCount(2);
  await expect(record(page, 3)).toContainText("ID: father");
  await expect(record(page, 3).getByRole("button", { name: "Open father journal", exact: true })).toHaveCount(0);
  await expect(record(page, 3)).toContainText("No longer in your herd");
});

for (const live of ["same", "other"] as const) {
  test(`live ${live} pair birth updates a filtered history as the oldest record expires`, async ({ page }) => {
    await openHistory(page, live);
    for (const id of ["father", live === "same" ? "mother" : "other-mother"]) {
      await choose(page, id);
      await page.getByRole("button", { name: /^Move to Pen 1/ }).click();
    }
    await history(page);
    await filter(page, 1);
    await page.keyboard.press("Tab"); // Show all births
    await page.keyboard.press("Tab"); // Oldest record's mother journal
    await expect(record(page, 1).getByRole("button", { name: "Open mother journal", exact: true })).toBeFocused();
    await expect(record(page, 1)).toHaveCount(0, { timeout: 15000 });
    await expect(region(page).getByRole("heading", { name: "This pair's births", exact: true })).toBeFocused();
    if (live === "same") {
      await expect(region(page).getByRole("article")).toHaveCount(1);
      await expect(record(page, 21)).toBeVisible();
    } else {
      await expect(region(page).getByRole("article")).toHaveCount(0);
      await expect(region(page)).toContainText("No");
    }
    await page.getByRole("button", { name: "Show all births", exact: true }).click();
    await expect(region(page).getByRole("article")).toHaveCount(20);
    await expect(record(page, 21)).toBeVisible();
  });
}

test("an expiring record does not steal focus from the dialog controls", async ({ page }) => {
  await openHistory(page, "other");
  for (const id of ["father", "other-mother"]) {
    await choose(page, id);
    await page.getByRole("button", { name: /^Move to Pen 1/ }).click();
  }
  await history(page);
  await filter(page, 1);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(record(page, 1).getByRole("button", { name: "Open mother journal", exact: true })).toBeFocused();
  // Move elsewhere intentionally before the focused card's record expires.
  await page.getByRole("button", { name: "Close", exact: true }).focus();
  await expect(record(page, 1)).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger(page)).toBeFocused();
});
