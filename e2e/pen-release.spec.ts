import { test, expect, type Page } from '@playwright/test';

test.setTimeout(60000);

// Prepared herd for safety cases, separate from the earned three-goal playtest.
async function openGame(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('pen-release-fixture')) return;
    sessionStorage.setItem('pen-release-fixture', 'yes');
    const puff = (id: string, sex: number) => ({ id, genes:[1,1,1,1,0,1,1,1,1,sex], bornAt:Date.now(), matured:false });
    localStorage.setItem('bts:save', JSON.stringify({
      puffs:{ byId:{ mother:puff('mother',0),father:puff('father',1),spare:puff('spare',1),keeper:puff('keeper',1),other:puff('other',1) },keeperIds:['keeper'] },
      clock:{gameTime:0,speed:1,lastSavedAt:Date.now()},economy:{gold:50,upkeepAccumulator:0},
      pens:{order:['pen-1','pen-2'],byId:{
        'pen-1':{id:'pen-1',name:'Pen 1',capacity:4,occupantIds:['mother','father','spare','keeper'],breedingProgress:0},
        'pen-2':{id:'pen-2',name:'Pen 2',capacity:4,occupantIds:['other'],breedingProgress:0},
      }},
      requests:{order:['r'],byId:{r:{id:'r',requirements:[{trait:'sex',value:'M'}],reward:20}}},
    }));
  });
  await page.goto('/'); await expect(page.locator('canvas')).toBeVisible();
}
const trigger=(page:Page)=>page.locator('#herd-picker-summary');
const panel=(page:Page)=>page.getByRole('region',{name:'Pen occupants',exact:true});
const selector=(page:Page)=>page.getByRole('combobox',{name:'Choose a pen',exact:true});
const check=(page:Page,id:string)=>page.getByRole('checkbox',{name:`Select ${id} for release`,exact:true});
async function openPens(page:Page) { await trigger(page).click(); await page.getByRole('button',{name:'Pens',exact:true}).click(); }

for(const width of [1280,390]) test(`${width}px release reviewed spares in one pen while keepers and last female stay safe`,async({page})=>{
  await page.setViewportSize({width,height:844}); await openGame(page); await openPens(page);
  await check(page,'mother').check();
  await expect(panel(page)).toContainText('Keep at least one female');
  await expect(page.getByRole('button',{name:'Release 1 Puff for 2g',exact:true})).toBeDisabled();
  await check(page,'mother').uncheck(); await check(page,'keeper').check(); await check(page,'spare').check();
  await expect(page.getByRole('button',{name:'Release 2 Puffs for 4g',exact:true})).toBeDisabled();
  await expect(panel(page)).toContainText('keeper');
  await expect(page.locator('.gold-display-amount')).toHaveText('50g');
  await check(page,'keeper').uncheck();
  await expect(panel(page)).toContainText('1 selected Puff matches a request. A request sale may pay more.');
  const release=page.getByRole('button',{name:'Release 1 Puff for 2g',exact:true});
  await release.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.pen-release-notice')).toBeFocused();
  await expect(page.getByRole('dialog',{name:'Choose a Puff',exact:true})).toBeVisible();
  await expect(panel(page).getByRole('article',{name:'Puff spare',exact:true})).toHaveCount(0);
  await expect(page.locator('.gold-display-amount')).toHaveText('52g');
  await expect(check(page,'keeper')).not.toBeChecked();
  await expect(page.getByRole('button',{name:'Cancel bulk release',exact:true})).toHaveCount(0);
  await expect(panel(page).getByRole('article').filter({hasText:'Born here'})).toHaveCount(1,{timeout:15000});
  await expect(panel(page).getByRole('checkbox',{checked:true})).toHaveCount(0);
  await selector(page).selectOption('pen-2');
  await expect(panel(page).getByRole('article',{name:'Puff other',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.keyboard.press('Escape'); await expect(trigger(page)).toBeFocused(); await page.reload();
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('bts:save')!));
  expect(save.puffs.byId.spare).toBeUndefined(); expect(save.puffs.keeperIds).toEqual(['keeper']);
  expect(save.pens.byId['pen-2'].occupantIds).toEqual(['other']); expect(save.economy.gold).toBe(52);
});

test('pen choices clear on navigation and moved Puffs never stay in the release batch',async({page})=>{
  await openGame(page); await openPens(page); await check(page,'spare').check();
  await selector(page).selectOption('pen-2'); await selector(page).selectOption('pen-1');
  await expect(check(page,'spare')).not.toBeChecked(); await check(page,'spare').check();
  await page.getByRole('button',{name:/^Recent births/}).click(); await page.getByRole('button',{name:'Pens',exact:true}).click();
  await expect(check(page,'spare')).not.toBeChecked(); await check(page,'spare').check();
  await page.keyboard.press('Escape'); await openPens(page); await expect(check(page,'spare')).not.toBeChecked();
  await check(page,'spare').check();
  await panel(page).getByRole('article',{name:'Puff spare',exact:true}).getByRole('button',{name:'Move to pasture',exact:true}).click();
  await expect(page.getByRole('button',{name:'Release 1 Puff for 2g',exact:true})).toHaveCount(0);
  await expect(panel(page).getByRole('checkbox',{checked:true})).toHaveCount(0);
  await check(page,'father').check();
  await expect(panel(page).getByRole('article').filter({hasText:'Born here'})).toHaveCount(1,{timeout:15000});
  await expect(check(page,'father')).toBeChecked();
  await expect(panel(page).getByRole('checkbox',{checked:true})).toHaveCount(1);
  await expect(panel(page).getByRole('article').filter({hasText:'Born here'}).getByRole('checkbox')).not.toBeChecked();
  await page.keyboard.press('Escape'); await page.reload();
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('bts:save')!));
  expect(save.puffs.byId.spare).toBeDefined(); expect(save.economy.gold).toBe(50);
  expect(save.pens.byId['pen-1'].occupantIds).not.toContain('spare');
});

test('global bulk release keeps its own selection and the pen view stays read-only',async({page})=>{
  await openGame(page); await page.getByRole('button',{name:'Bulk release',exact:true}).click();
  await trigger(page).click(); await page.locator('.herd-picker-list').getByRole('button',{name:/ID: spare$/}).click();
  await page.getByRole('button',{name:'Pens',exact:true}).click();
  await expect(panel(page).getByRole('checkbox')).toHaveCount(0);
  await expect(panel(page).getByRole('button',{name:/^Release/})).toHaveCount(0);
  await expect(panel(page).getByRole('article',{name:'Puff spare',exact:true}).getByRole('button',{name:'Move to pasture',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Done choosing',exact:true}).click();
  await expect(page.locator('.release-controls')).toContainText('1 selected');
});
