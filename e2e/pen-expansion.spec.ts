import { test, expect, type Page } from '@playwright/test';

// Prepared herd isolates building rules. Earned play is recorded separately.
async function openGame(page: Page, gold = 50) {
  await page.addInitScript((gold) => {
    if (sessionStorage.getItem('expansion-fixture')) return;
    sessionStorage.setItem('expansion-fixture', 'yes');
    const puff = (id: string, sex: number) => ({ id, genes: [1,1,1,1,0,1,1,1,1,sex], bornAt: Date.now(), matured: false });
    localStorage.setItem('bts:save', JSON.stringify({
      puffs: { byId: { A:puff('A',0), B:puff('B',1), C:puff('C',1), D:puff('D',0), E:puff('E',1), F:puff('F',0) }, keeperIds:['A','B'] },
      clock: { gameTime:0, speed:1, lastSavedAt:Date.now() }, economy: { gold, upkeepAccumulator:0 },
      pens: { order:['pen-1','pen-2'], byId: {
        'pen-1':{ id:'pen-1',name:'Pen 1',capacity:4,occupantIds:['A','B','E','F'],breedingProgress:0 },
        'pen-2':{ id:'pen-2',name:'Pen 2',capacity:4,occupantIds:[],breedingProgress:0 },
      } },
      requests: { order:['r'],byId:{ r:{ id:'r', requirements:[{trait:'bodySize',value:'XL'}],reward:20 } } },
    }));
  }, gold);
  await page.goto('/'); await expect(page.locator('canvas')).toBeVisible();
}
const manage = (page:Page) => page.getByRole('button',{name:'Manage pens',exact:true});
const dialog = (page:Page) => page.getByRole('dialog',{name:'Manage pens',exact:true});
async function choose(page:Page,id:string) {
  await page.locator('#herd-picker-summary').click();
  await page.locator('.herd-picker-list').getByRole('button',{name:new RegExp(`ID: ${id}$`)}).click();
}

test('buy and expand with Gold; both pens breed, save and retain their keeper parents', async({page})=>{
  await openGame(page); await manage(page).focus(); await page.keyboard.press('Enter');
  await dialog(page).getByRole('button',{name:'Build a pen · 25g',exact:true}).click();
  await expect(page.locator('.manage-pens-notice')).toBeFocused();
  await dialog(page).getByRole('button',{name:'Expand Pen 1 to 6 · 20g',exact:true}).click();
  await expect(page.locator('.manage-pens-wallet')).toContainText('5g · 3/6 pens');
  await expect(dialog(page).getByRole('button',{name:'Build a pen · 50g',exact:true})).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(manage(page)).toBeFocused();
  for(const id of ['C','D']) { await choose(page,id); await page.getByRole('button',{name:/^Move to Pen 3/}).click(); }
  await expect(page.getByRole('region',{name:'Pen 3 breeding status'})).toContainText(/[34]\/4 spaces used/,{timeout:15000});
  await expect(page.getByRole('region',{name:'Pen 1 breeding status'})).toContainText(/[56]\/6 spaces used/);
  await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bts:save')!));
  expect(saved.pens.order).toHaveLength(3); expect(saved.pens.byId['pen-1'].capacity).toBe(6);
  expect(saved.puffs.keeperIds).toEqual(['A','B']);
  expect(saved.pens.byId['pen-1'].occupantIds).toEqual(expect.arrayContaining(['A','B','E','F']));
  expect(saved.puffs.recentBirths.some((r:{penId:string})=>r.penId==='pen-3')).toBe(true);
  expect(saved.puffs.recentBirths.some((r:{penId:string})=>r.penId==='pen-1')).toBe(true);
});

test('low Gold and release mode explain disabled building without changing the ranch',async({page})=>{
  await openGame(page,10); await manage(page).click();
  await expect(dialog(page).getByRole('button',{name:'Build a pen · 25g',exact:true})).toBeDisabled();
  await expect(page.locator('#new-pen-reason')).toHaveText('Earn 15g more from requests or releasing spare Puffs.');
  await expect(dialog(page).getByRole('button',{name:'Expand Pen 1 to 6 · 20g',exact:true})).toBeDisabled();
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'Bulk release',exact:true}).click();
  await manage(page).click(); await expect(page.locator('#new-pen-reason')).toHaveText('Finish bulk release before building.');
  await page.keyboard.press('Escape'); await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bts:save')!));
  expect(saved.economy.gold).toBe(10); expect(saved.pens.order).toHaveLength(2);
});

test('six fully expanded pens fit the canvas; phone can select and move into the last pen',async({page})=>{
  test.setTimeout(90000); // Sixteen purchases, scrolling, pointer movement and reload.
  await page.setViewportSize({width:390,height:844}); await openGame(page,1000); await manage(page).click();
  for(const cost of [25,50,75,100]) await dialog(page).getByRole('button',{name:`Build a pen · ${cost}g`,exact:true}).click();
  await expect(dialog(page).getByRole('button',{name:'Pen limit reached',exact:true})).toBeDisabled();
  for(let n=1;n<=6;n++) for(const [capacity,cost] of [[6,20],[8,40]]) {
    await dialog(page).getByRole('button',{name:`Expand Pen ${n} to ${capacity} · ${cost}g`,exact:true}).click();
  }
  await expect(dialog(page).getByRole('button',{name:'Pen 6 at its limit',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(page.locator('canvas')).toHaveAttribute('height','1430');
  await choose(page,'C');
  const canvas=page.locator('canvas'); const box=await canvas.boundingBox(); if(!box) throw new Error('No canvas');
  await canvas.click({position:{x:720*box.width/800,y:1370*box.height/1430}});
  await expect(page.getByRole('region',{name:'Pen 6 breeding status'})).toContainText('1/8 spaces used');
  await canvas.click({position:{x:(420+340/6)*box.width/800,y:(1080+40+280/6)*box.height/1430}});
  await expect(page.locator('.puff-inspector-id')).toHaveText('C');
  await expect(page.getByRole('button',{name:/^In Pen 6/})).toBeDisabled();
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('height','1430');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
