#!/usr/bin/env node
// Only isolated Playwright contexts are used. This never opens a user's browser profile.
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { url: { type: 'string' }, out: { type: 'string' }, 'save-dir': { type: 'string' } } });
if (!values.url || !values.out || !values['save-dir'] || !path.isAbsolute(values.out) || !path.isAbsolute(values['save-dir'])) {
  throw new Error('Usage: node ai/loop/capture.mjs --url URL --out ABS_DIR --save-dir ABS_DIR');
}
const origin = new URL(values.url).origin;
const out = values.out;
const saves = values['save-dir'];
await mkdir(out, { recursive: true });
await mkdir(saves, { recursive: true });
const exists = async (file) => access(file).then(() => true, () => false);
const json = async (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const report = {
  startedAt: new Date().toISOString(), url: values.url, viewport: { width: 1280, height: 1000 },
  semantics: [
    'Fresh input is an actual new game saved once, then reused. It is not a new random herd on each capture.',
    'Returning input comes from returning.json, or fresh input until a successful round is promoted by the controller.',
    'Only lastSavedAt is refreshed on load to exclude offline catch-up from comparisons. Raw inputs are attached.',
    'Play uses normal mouse and button input. Save reads are observations, not injected gameplay outcomes.',
    'Birth randomness and real-time animation remain live. Screenshots alone do not prove gameplay or enjoyment.',
    'This is a short scripted sample, not a substitute for an agent playing freely or a human long-term review.',
    'Passed means capture finished without browser errors. Inspect action facts: it does not mean every gameplay goal succeeded.',
  ],
  profiles: [],
  screenshots: [],
  reviewScreenshots: [],
  furtherPlay: 'Agents should inspect these images and play freely for the chosen goal. Attach additional screenshots with captions. Separate observed facts from player interpretations. Do not claim substantial progress until the carried save supports it.',
};
let browser;
let failed = false;
// Hard limit includes browser startup and both profiles; the parent also enforces its own limit.
const watchdog = setTimeout(() => {
  report.status = 'failed';
  report.error = 'Capture exceeded 150 seconds';
  report.finishedAt = new Date().toISOString();
  writeFileSync(path.join(out, 'observations.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.error);
  process.exit(124);
}, 150_000);
async function contextFor(input) {
  const inputCopy = input && structuredClone(input);
  if (inputCopy?.clock) inputCopy.clock.lastSavedAt = Date.now();
  return browser.newContext({ viewport: report.viewport, storageState: inputCopy ? {
    cookies: [], origins: [{ origin, localStorage: [{ name: 'bts:save', value: JSON.stringify(inputCopy) }] }],
  } : undefined });
}
async function saved(context) {
  const storage = await context.storageState();
  const raw = storage.origins.find((entry) => entry.origin === origin)?.localStorage.find((entry) => entry.name === 'bts:save')?.value;
  if (!raw) throw new Error('The game did not write a save on page reload');
  return JSON.parse(raw);
}
async function checkpoint(page, context) {
  // Reload triggers the game's real beforeunload save. No store mutation or fake event.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('canvas').waitFor({ timeout: 15_000 });
  return saved(context);
}
async function clickBoard(page, x, y) {
  const canvas = page.locator('canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas missing');
  await canvas.click({ position: { x: x * box.width / 800, y: y * box.height / 600 } });
}
function pasture(id) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  hash = Math.abs(hash);
  return [50 + hash % 700, 50 + hash * 7 % 290];
}
async function select(page, id) {
  const [x, y] = pasture(id);
  for (const [dx, dy] of [[0, 0], [-10, 0], [10, 0], [0, -10], [0, 10]]) {
    await clickBoard(page, x + dx, y + dy);
    if ((await page.locator('.puff-inspector-id').textContent({ timeout: 1500 }).catch(() => '')) === id) return true;
  }
  return false;
}
try {
  browser = await chromium.launch({ headless: true });
  const freshFile = path.join(saves, 'fresh-input.json');
  if (!(await exists(freshFile))) {
    const context = await contextFor();
    try {
      const page = await context.newPage();
      await page.goto(values.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.locator('canvas').waitFor({ timeout: 15_000 });
      await json(freshFile, await checkpoint(page, context));
    } finally { await context.close(); }
  }
  for (const name of ['fresh', 'returning']) {
    const dir = path.join(out, name);
    await mkdir(dir, { recursive: true });
    const returningFile = path.join(saves, 'returning.json');
    const hasReturning = name === 'returning' && await exists(returningFile);
    const input = await read(hasReturning ? returningFile : freshFile);
    await json(path.join(dir, 'input-save.json'), input);
    const profile = { name, source: hasReturning ? 'carried save' : 'repeatable new-game save',
      facts: [], interpretations: [], errors: [], screenshots: [], status: 'running' };
    report.profiles.push(profile);
    const context = await contextFor(input);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on('pageerror', (error) => profile.errors.push({ type: 'pageerror', message: error.message }));
    page.on('console', (message) => { if (message.type() === 'error') profile.errors.push({ type: 'console', message: message.text() }); });
    const shot = async (label) => {
      await page.screenshot({ path: path.join(dir, `${label}.png`), fullPage: true, timeout: 10_000 });
      const relativePath = `${name}/${label}.png`;
      profile.screenshots.push(relativePath);
      report.screenshots.push(relativePath);
      if (label === '01-start' || label === '05-end') report.reviewScreenshots.push(relativePath);
    };
    try {
      await page.goto(values.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.locator('canvas').waitFor({ timeout: 15_000 });
      await shot('01-start');
      profile.facts.push({ stage: 'start', text: await page.locator('body').innerText() });
      const pen = input.pens.byId[input.pens.order[0]];
      const assigned = new Set(Object.values(input.pens.byId).flatMap((p) => p.occupantIds));
      // Empty first pen: choose parents through the same coordinates a player clicks.
      if (pen.occupantIds.length === 0) {
        for (const sex of [1, 0]) {
          let placed = false;
          for (const puff of Object.values(input.puffs.byId).filter((p) => !assigned.has(p.id) && (p.genes[9] > 0 ? 1 : 0) === sex)) {
            if (await select(page, puff.id)) {
              await clickBoard(page, 70, 560);
              profile.facts.push({ action: 'Clicked parent, then first pen', puffId: puff.id });
              placed = true;
              break;
            }
          }
          if (!placed) profile.facts.push({ limitation: `Could not select an available ${sex ? 'male' : 'female'} parent. Agent should investigate.` });
        }
      } else profile.facts.push({ action: 'Kept existing pen occupants from the carried save' });
      await shot('02-breeding');
      await page.waitForTimeout(9000);
      const afterBreeding = await checkpoint(page, context);
      const newIds = Object.keys(afterBreeding.puffs.byId).filter((id) => !input.puffs.byId[id]);
      profile.facts.push({ observedBirthIds: newIds, penOccupantsAfter: afterBreeding.pens.byId[pen.id]?.occupantIds });
      await shot('03-after-wait');
      // Inspect actual requests and try a safe, enabled sale of a spare pasture Puff.
      const nowAssigned = new Set(Object.values(afterBreeding.pens.byId).flatMap((p) => p.occupantIds));
      let fulfilled = false;
      for (const puff of Object.values(afterBreeding.puffs.byId).filter((p) => !nowAssigned.has(p.id)).slice(0, 8)) {
        if (!(await select(page, puff.id))) continue;
        const fulfill = page.getByRole('button', { name: /Fulfill request/ }).first();
        if (await fulfill.isVisible() && await fulfill.isEnabled()) {
          await shot('04-request-choice');
          await fulfill.click();
          profile.facts.push({ action: 'Clicked enabled fulfill-request button', puffId: puff.id });
          fulfilled = true;
          break;
        }
      }
      profile.facts.push({ requestFulfilledThroughUI: fulfilled, stage: 'end', text: await page.locator('body').innerText() });
      await shot('05-end');
      await json(path.join(dir, 'output-save.json'), await checkpoint(page, context));
      profile.interpretations.push('Agent review needed: Does the first birth suggest a useful next breeding goal? What would make this player return?');
      if (!hasReturning && name === 'returning') profile.interpretations.push('This save does not represent a long-term player yet. Build progress across successful rounds before judging long-term engagement.');
      profile.status = profile.errors.length ? 'failed' : 'passed';
      if (profile.errors.length) failed = true;
    } catch (error) {
      failed = true;
      profile.status = 'failed';
      profile.errors.push({ type: 'capture', message: error.stack ?? String(error) });
      await shot('failure').catch(() => {});
    } finally { await context.close(); }
    await json(path.join(dir, 'observations.json'), profile);
  }
} catch (error) {
  failed = true;
  report.error = error.stack ?? String(error);
} finally {
  await browser?.close();
  clearTimeout(watchdog);
  report.status = failed ? 'failed' : 'passed';
  report.finishedAt = new Date().toISOString();
  await json(path.join(out, 'observations.json'), report);
}
console.log(`Capture ${report.status}: ${path.join(out, 'observations.json')}`);
process.exitCode = failed ? 1 : 0;
