import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const output = process.env.BTS_NATIVE_REPORT_DIR || 'artifacts/native-test';
const endpoint = 'http://127.0.0.1:4444';
let session;
const evidence = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(method, path, body) {
  const response = await fetch(`${endpoint}${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45000),
  });
  const result = await response.json();
  if (!response.ok || result.value?.error) throw new Error(JSON.stringify(result));
  return result.value;
}
const call = (method, path, body) => request(method, `/session/${session}${path}`, body);
const read = (script, args = []) => call('POST', '/execute/sync', { script, args });
async function until(check, label, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const result = await check(); if (result) return result; } catch (error) { last = error; }
    await delay(250);
  }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
}
async function launch() {
  const value = await request('POST', '/session', { capabilities: { alwaysMatch: {
    'webkitgtk:browserOptions': { binary: '/app/bin/breed-trade-station' },
  } } });
  session = value.sessionId;
  await until(() => read('return !!document.querySelector("canvas") && !!document.querySelector(".pen-status-panel")'), 'native game loaded');
}
async function screenshot(name) {
  const data = await call('GET', '/screenshot');
  await writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64'));
}
async function clickCanvas(x, y) {
  const box = await read('const r=document.querySelector("canvas").getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}');
  const windowLine = execFileSync('wmctrl', ['-l'], { encoding: 'utf8' })
    .split('\n').find((line) => line.includes('Breed Trade Station'));
  assert.ok(windowLine, 'native window is visible');
  const windowId = windowLine.trim().split(/\s+/)[0];
  // Send real desktop mouse events. WebKit's synthetic pointer actions can
  // miss Pixi's pointertap handling even when their WebDriver request succeeds.
  execFileSync('xdotool', ['mousemove', '--sync', '--window', windowId,
    String(Math.round(box.x + x * box.width / 800)),
    String(Math.round(box.y + y * box.height / 600)), 'click', '1']);
  await delay(150);
}
async function clickElement(selector) {
  const element = await call('POST', '/element', { using: 'css selector', value: selector });
  await call('POST', `/element/${element['element-6066-11e4-a52e-4f735466cecf']}/click`, {});
}
function position(id) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  hash = Math.abs(hash);
  return { x: 50 + hash % 700, y: 50 + hash * 7 % 290 };
}
async function selectPuff(puff) {
  const { x, y } = position(puff.id);
  const sum = puff.genes[0] + puff.genes[1] + puff.genes[2];
  const radius = sum === 0 ? 10 : sum === 1 ? 14 : sum <= 4 ? 18 : sum === 5 ? 22 : 26;
  for (const [dx, dy] of [[0, 0], [0.65, 0], [-0.65, 0], [0, 0.65], [0, -0.65]]) {
    await clickCanvas(x + dx * radius, y + dy * radius);
    if (await read('return document.querySelector(".puff-inspector-id")?.textContent') === puff.id) return;
  }
  throw new Error(`Could not select Puff ${puff.id}`);
}

await mkdir(output, { recursive: true });
try {
  await until(() => request('GET', '/status'), 'WebKitWebDriver available');
  await launch();
  const graphics = await read('const c=document.querySelector("canvas"); const gl=c.getContext("webgl") || c.getContext("webgl2"); return gl && !gl.isContextLost() ? gl.getParameter(gl.VERSION) : null');
  assert.ok(graphics, 'Pixi has a working native WebGL context');
  evidence.push({ check: 'Native assets and WebGL load without a dev server', graphics });
  // Read the normal autosave to locate Puffs. No game state or genes are injected.
  const initial = await until(() => read('return JSON.parse(localStorage.getItem("bts:save"))'), 'first real autosave');
  const puffs = Object.values(initial.puffs.byId);
  assert.equal(puffs.length, 8, 'isolated profile starts with eight Puffs');
  await screenshot('loaded');
  async function placeParent(candidates) {
    for (const puff of candidates) {
      try { await selectPuff(puff); }
      catch (error) {
        console.warn(`Could not select ${puff.id}: ${error.message}`);
        continue; // A pasture Puff can be covered by another sprite.
      }
      await clickCanvas(70, 560);
      return puff;
    }
    throw new Error('No accessible parent of the required sex');
  }
  const male = await placeParent(puffs.filter((puff) => puff.genes[9] !== 0));
  const female = await placeParent(puffs.filter((puff) => puff.genes[9] === 0));
  await until(() => read('return document.querySelector(arguments[0])?.textContent.includes(arguments[1])', ['[aria-label="Pen 1 breeding status"]', '3/4 spaces used']), 'worker-driven birth', 15000);
  await screenshot('birth');
  await clickCanvas(125, 532.5);
  const childId = await until(() => read('return document.querySelector(".puff-inspector-id")?.textContent'), 'newborn selected');
  assert.ok(!initial.puffs.byId[childId], 'selected Puff is the newborn');
  const actionAt = Date.now();
  await clickElement('.puff-inspector-release-button');
  await until(() => read('return document.querySelector(arguments[0])?.textContent.includes(arguments[1])', ['[aria-label="Pen 1 breeding status"]', '2/4 spaces used']), 'offspring released');
  // Ask the window manager to close the real window, exercising onCloseRequested.
  execFileSync('wmctrl', ['-c', 'Breed Trade Station']);
  await until(() => !execFileSync('wmctrl', ['-l'], { encoding: 'utf8' }).includes('Breed Trade Station'), 'window closed');
  try { await request('DELETE', `/session/${session}`); } catch { /* window is already gone */ }
  session = undefined;
  await launch();
  const reopened = await read('return JSON.parse(localStorage.getItem("bts:save"))');
  assert.ok(reopened.clock.lastSavedAt >= actionAt, 'close saved the recent action');
  assert.deepEqual(reopened.pens.byId['pen-1'].occupantIds, [male.id, female.id]);
  assert.ok(!reopened.puffs.byId[childId], 'released newborn stays released after reopen');
  assert.equal(Object.keys(reopened.puffs.byId).length, 8);
  await screenshot('reopened');
  evidence.push({ check: 'Canvas assignment, birth, release, native close and reopen', result: 'passed', parents: [male.id, female.id], releasedChild: childId });
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: true, evidence }, null, 2));
  console.log(JSON.stringify({ passed: true, evidence }, null, 2));
} catch (error) {
  try { if (session) await screenshot('failure'); } catch { /* driver may be unavailable */ }
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: false, error: String(error), evidence }, null, 2));
  throw error;
} finally {
  if (session) { try { await request('DELETE', `/session/${session}`); } catch { /* already closed */ } }
}
