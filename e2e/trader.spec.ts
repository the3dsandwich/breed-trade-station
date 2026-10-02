import { expect, test, type Page } from '@playwright/test';

// Prepared old-format saves isolate purchase rules. The independent daily
// playtest uses the real carried herd and earns its purchase Gold through UI.
async function fixture(page: Page, gold = 15, requestMale = false) {
  await page.addInitScript(({ gold, requestMale }) => {
    if (sessionStorage.getItem('trader-fixture')) return;
    sessionStorage.setItem('trader-fixture', 'loaded');
    const puff = (id: string, sex: number) => ({ id, genes: [1,1,1,1,0,1,1,1,1,sex], bornAt: Date.now(), matured: false });
    localStorage.setItem('bts:save', JSON.stringify({
      puffs: { byId: { father:puff('father',1), mother:puff('mother',0), spare:puff('spare',1) }, birthCount:7, recentBirths:[] },
      clock:{ gameTime:0, speed:1, lastSavedAt:Date.now() }, economy:{ gold, upkeepAccumulator:0 },
      pens:{ order:['pen-1'], byId:{ 'pen-1':{ id:'pen-1', name:'Pen 1', capacity:4, occupantIds:[], breedingProgress:0 } } },
      requests:{ order:['r1'], byId:{ r1:{ id:'r1', requirements:requestMale ? [{trait:'sex',value:'M'}] : [{trait:'bodySize',value:'XL'}], reward:20 } } },
    }));
  }, { gold, requestMale });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
}
const openTrader = async (page: Page) => { await page.getByRole('button', {name:'Visit trader · Puffs 15g',exact:true}).click(); };
const trader = (page: Page) => page.getByRole('dialog', {name:'A new breeding idea'});

test('old save can buy exactly once, keeps the same offer after reload and places it through the journal', async ({page}) => {
  await fixture(page);
  await openTrader(page);
  const dialog = trader(page);
  const offer = dialog.getByRole('article', {name:'Female · Large',exact:true});
  const traits = await offer.locator('p').allTextContents();
  await offer.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('.trader-notice')).toContainText('joined your pasture');
  await expect(dialog.locator('.trader-notice')).toBeFocused();
  await expect(page.locator('.gold-display-amount')).toHaveText('0g');
  await expect(dialog.getByRole('button', {name:/^(Buy |Female .*bought)/})).toHaveCount(3);
  for (const button of await dialog.locator('.trader-offer button').all()) await expect(button).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name:'Visit trader · Puffs 15g',exact:true})).toBeFocused();
  await expect(page.locator('.puff-inspector')).toContainText('Female');
  await expect(page.locator('.puff-inspector .puff-growth-status')).toHaveText('Grown · ready to breed');
  await page.getByRole('button', {name:/^Move to Pen 1/}).click();
  const boughtId = (await page.locator('.puff-inspector-id').innerText()).trim();
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bts:save')!));
  expect(Object.keys(saved.puffs.byId)).toHaveLength(4);
  expect(saved.puffs.birthCount).toBe(7);
  expect(saved.pens.byId['pen-1'].occupantIds).toEqual([boughtId]);
  expect(saved.economy.trader.purchasedPuffId).toBe(boughtId);
  await openTrader(page);
  await expect(trader(page)).toContainText("You bought today's Puff");
  expect(await trader(page).getByRole('article', {name:'Female · Large',exact:true}).locator('p').allTextContents()).toEqual(traits);
  for (const button of await trader(page).locator('.trader-offer button').all()) await expect(button).toBeDisabled();
});

test('phone explains missing Gold, traps focus, and preserves offers after Escape and reload', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await fixture(page, 0);
  await openTrader(page);
  await expect(trader(page)).toContainText('Earn 15g more');
  const offers = await trader(page).locator('.trader-offer').allTextContents();
  await expect(trader(page).getByRole('article')).toHaveCount(3);
  for (const button of await trader(page).locator('.trader-offer button').all()) await expect(button).toBeDisabled();
  await trader(page).getByRole('button', {name:'Close',exact:true}).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('#trader-dialog'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name:'Visit trader · Puffs 15g',exact:true})).toBeFocused();
  await page.reload();
  await openTrader(page);
  expect(await trader(page).locator('.trader-offer').allTextContents()).toEqual(offers);
});

test('bulk release blocks purchases until the player leaves release mode', async ({page}) => {
  await fixture(page, 50);
  await page.getByRole('button', {name:'Bulk release',exact:true}).click();
  await openTrader(page);
  await expect(trader(page)).toContainText('Finish bulk release before buying');
  for (const button of await trader(page).locator('.trader-offer button').all()) await expect(button).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'Cancel bulk release',exact:true}).click();
  await openTrader(page);
  await expect(trader(page).getByRole('button', {name:'Buy Female · Large for 15g',exact:true})).toBeEnabled();
});

test('a real request reward can buy new breeding stock', async ({page}) => {
  await fixture(page,0,true);
  await page.locator('#herd-picker-summary').click();
  await page.locator('.herd-picker-list').getByRole('button', {name:/ID: spare$/}).click();
  await page.getByRole('button', {name:'Fulfill request for 20g',exact:true}).click();
  await expect(page.locator('.gold-display-amount')).toHaveText('20g');
  await openTrader(page);
  await trader(page).getByRole('button', {name:'Buy Female · Large for 15g',exact:true}).click();
  await expect(page.locator('.gold-display-amount')).toHaveText('5g');
  await expect(trader(page).locator('.trader-notice')).toContainText('joined your pasture');
});

test('daily stock changes restore focus and a backward date explains the purchase lock', async ({page}) => {
  // A date-boundary fixture, not a claimed overnight play session. Date is
  // overridden while real browser timers and the tick worker keep running.
  await page.clock.setFixedTime(new Date(2026,9,2,23,59,50));
  await fixture(page,50);
  await openTrader(page);
  await trader(page).getByRole('button', {name:'Buy Female · Large for 15g',exact:true}).focus();
  await page.clock.setFixedTime(new Date(2026,9,3,0,0,1));
  await expect(trader(page).locator('.trader-wallet')).toContainText('2026-10-03');
  await expect(trader(page).locator('.trader-notice')).toHaveText('New daily stock has arrived. Please review the new choices.');
  await expect(trader(page).locator('.trader-notice')).toBeFocused();
  await page.clock.setFixedTime(new Date(2026,9,2,23,59,50));
  await expect(trader(page)).toContainText('Your device date is earlier than this stock. Buying resumes on 2026-10-03.');
  for (const button of await trader(page).locator('.trader-offer button').all()) await expect(button).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name:'Visit trader · Puffs 15g',exact:true})).toBeFocused();
});
