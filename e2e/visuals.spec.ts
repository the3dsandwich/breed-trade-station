import { expect, test, type Page } from "@playwright/test";

async function canvasFrame(page: Page) {
  return page.locator("canvas").screenshot();
}

test("reduced motion keeps the pasture still and responds to preference changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(250);
  const still = await canvasFrame(page);
  await page.waitForTimeout(700);
  expect((await canvasFrame(page)).equals(still)).toBe(true);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Sample several frames because the artwork deliberately moves in steps.
  await expect.poll(async () => !(await canvasFrame(page)).equals(still), { timeout: 12000, intervals: [100, 200, 300] }).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(250);
  const stopped = await canvasFrame(page);
  await page.waitForTimeout(700);
  expect((await canvasFrame(page)).equals(stopped)).toBe(true);
});

test("a Puff remains selectable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.reload(); // The normal unload handler saves the actual starting herd.
  await expect(page.locator("canvas")).toBeVisible();
  const ids = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("bts:save")!);
    return Object.keys(saved.puffs.byId);
  });
  const canvas = page.locator("canvas");
  const box = (await canvas.boundingBox())!;
  let selected = false;
  for (const id of ids) {
    let hash = 0;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    hash = Math.abs(hash);
    await canvas.click({ position: {
      x: (50 + hash % 700) * box.width / 800,
      y: (50 + hash * 7 % 290) * box.height / 600,
    } });
    if (await page.locator(".puff-inspector-id").count()) { selected = true; break; }
  }
  expect(selected).toBe(true);
  await expect(page.getByRole("heading", { name: "Puff journal" })).toBeVisible();
});

for (const width of [390, 800, 1280]) {
  test(`layout fits a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width < 1180) {
      const inspector = (await page.locator(".puff-inspector").boundingBox())!;
      const pens = (await page.locator(".pen-status-panel").boundingBox())!;
      expect(inspector.y + inspector.height).toBeLessThanOrEqual(pens.y);
      const board = (await page.locator(".canvas-frame").boundingBox())!;
      expect(pens.width).toBeCloseTo(board.width, 0);
    }
  });
}

test("a request badge selects its Puff without moving the current selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.reload();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("bts:save")!);
    const genes = [1, 1, 1, 1, 0, 1, 1, 1, 1, 1];
    save.puffs.byId = {
      "badge-source": { id: "badge-source", genes, bornAt: Date.now(), matured: true },
      "badge-target": { id: "badge-target", genes: [...genes.slice(0, 9), 0], bornAt: Date.now(), matured: true },
    };
    save.pens.byId[save.pens.order[0]].occupantIds = ["badge-target"];
    save.requests = { order: ["test-match"], byId: { "test-match": {
      id: "test-match", requirements: [{ trait: "bodySize", value: "M" }], reward: 10,
    } } };
    save.clock.lastSavedAt = Date.now();
    localStorage.setItem("badge-test", JSON.stringify(save));
  });
  // Seed a new document before app startup, without bypassing the UI for selection.
  await page.addInitScript(() => localStorage.setItem("bts:save", localStorage.getItem("badge-test")!));
  await page.reload();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  const click = async (id: string, badge = false) => {
    let hash = 0;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    hash = Math.abs(hash);
    await canvas.click({ position: {
      x: (badge ? 153 : 50 + hash % 700) * box.width / 800,
      y: (badge ? 427.5 : 50 + hash * 7 % 290) * box.height / 600,
    } });
  };
  await click("badge-source");
  await expect(page.locator(".puff-inspector-id")).toHaveText("badge-source");
  await click("badge-target", true);
  await expect(page.locator(".puff-inspector-id")).toHaveText("badge-target");
  await expect(page.getByRole("heading", { name: "Pen 1 · 1/4 spaces used" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pen 2 · 0/4 spaces used" })).toBeVisible();
});
