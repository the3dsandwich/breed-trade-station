import { expect, test, type Page } from '@playwright/test';

// Prepared legacy herd for removal guards, not earned gameplay.
async function openGame(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('keeper-fixture')) return;
    sessionStorage.setItem('keeper-fixture','loaded');
    const puff = (id: string, sex: number) => ({id,genes:[1,1,1,1,0,1,1,1,1,sex],bornAt:Date.now(),matured:false});
    localStorage.setItem('bts:save',JSON.stringify({
      puffs:{byId:{candidate:puff('candidate',0),father:puff('father',1),spare:puff('spare',1),mother:puff('mother',0)}},
      clock:{gameTime:0,speed:1,lastSavedAt:Date.now()},economy:{gold:50,upkeepAccumulator:0},
      pens:{order:['pen-1'],byId:{'pen-1':{id:'pen-1',name:'Pen 1',capacity:4,occupantIds:[],breedingProgress:0}}},
      requests:{order:['request'],byId:{request:{id:'request',requirements:[{trait:'bodySize',value:'M'}],reward:10}}},
    }));
  });
  await page.goto('/');await expect(page.locator('canvas')).toBeVisible();
}
const trigger = (page:Page) => page.locator('#herd-picker-summary');
const row = (page:Page,id:string) => page.locator('.herd-picker-list').getByRole('button',{name:new RegExp(`ID: ${id}$`)});
async function choose(page:Page,id:string) {await trigger(page).click();await row(page,id).click();}
const keep = (page:Page) => page.getByRole('button',{name:'Keep this Puff',exact:true});

test('keeper survives reload, blocks both sale actions, and can still move and breed',async({page})=>{
  await openGame(page);await choose(page,'candidate');
  await expect(keep(page)).toHaveAttribute('aria-pressed','false');
  await keep(page).focus();await page.keyboard.press('Enter');
  await expect(keep(page)).toHaveAttribute('aria-pressed','true');
  await expect(keep(page)).toBeFocused();
  await expect(page.getByRole('button',{name:'Release',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Fulfill request for 10g',exact:true})).toBeDisabled();
  await expect(page.locator('.puff-inspector')).toContainText('Turn off Keep this Puff');
  await page.getByRole('button',{name:/^Move to Pen 1/}).click();
  await page.reload();await trigger(page).click();
  await expect(row(page,'candidate')).toContainText('Keeper');
  await page.getByRole('button',{name:'Pens',exact:true}).click();
  await expect(page.getByRole('article',{name:'Puff candidate',exact:true})).toContainText('Keeper');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await choose(page,'father');await page.getByRole('button',{name:/^Move to Pen 1/}).click();
  await trigger(page).click();await page.getByRole('button',{name:/^Recent births/}).click();
  await expect(page.getByRole('article',{name:'Birth 1',exact:true})).toBeVisible({timeout:15000});
  await page.getByRole('article',{name:'Birth 1',exact:true}).getByRole('button',{name:'Open baby journal',exact:true}).click();
  await expect(keep(page)).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.puff-growth-status').last()).toContainText('Young');
});

test('mixed keeper batch is blocked; releasing only the spare leaves release mode and keeps the keeper',async({page})=>{
  await openGame(page);await choose(page,'candidate');await keep(page).click();
  await page.getByRole('button',{name:'Bulk release',exact:true}).click();
  await trigger(page).click();await row(page,'candidate').click();await row(page,'spare').click();
  await page.getByRole('button',{name:'Done choosing',exact:true}).click();
  await expect(page.getByRole('button',{name:'Release 2',exact:true})).toBeDisabled();
  await expect(page.locator('.release-controls')).toContainText('keeper');
  await expect(page.getByRole('button',{name:'Cancel bulk release',exact:true})).toBeVisible();
  await expect(page.locator('.gold-display-amount')).toHaveText('50g');
  await trigger(page).click();await row(page,'candidate').click();await page.getByRole('button',{name:'Done choosing',exact:true}).click();
  await page.getByRole('button',{name:'Release 1',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bulk release',exact:true})).toBeFocused();
  await expect(page.getByRole('button',{name:'Cancel bulk release',exact:true})).toHaveCount(0);
  await expect(page.locator('.gold-display-amount')).toHaveText('52g');
  await choose(page,'candidate');await expect(keep(page)).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Visit trader · Puffs 15g',exact:true}).click();
  await expect(page.getByRole('button',{name:'Buy Female · Large for 15g',exact:true})).toBeEnabled();
});

for(const action of ['Release','Fulfill request for 10g']){
  test(`phone keeper can be deliberately unmarked for ${action}`,async({page})=>{
    await page.setViewportSize({width:390,height:844});await openGame(page);await choose(page,'candidate');
    await keep(page).click();await page.reload();await choose(page,'candidate');
    await expect(keep(page)).toHaveAttribute('aria-pressed','true');
    await expect(page.getByRole('button',{name:action,exact:true})).toBeDisabled();
    await keep(page).focus();await page.keyboard.press('Space');
    await expect(keep(page)).toHaveAttribute('aria-pressed','false');
    await page.getByRole('button',{name:action,exact:true}).click();
    await expect(trigger(page)).toHaveText('Choose a Puff · 3');
    await expect(trigger(page)).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.reload();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bts:save')!));
    expect(saved.puffs.byId.candidate).toBeUndefined();
    expect(saved.puffs.keeperIds??[]).not.toContain('candidate');
  });
}
