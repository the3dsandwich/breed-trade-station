import type { Graphics } from "pixi.js";

// Decoration only: keep the whole 800x600 surface and all pasture coordinates.
export function drawPasture(g: Graphics) {
  g.clear();
  const rect = (x: number, y: number, w: number, h: number, color: number) => g.beginFill(color).drawRect(x, y, w, h).endFill();
  rect(0, 0, 800, 600, 0x252237);
  rect(0, 0, 800, 28, 0x1c1b2e);
  rect(0, 28, 800, 2, 0x393048);
  // A miniature moon and stars live in the trim, clear of the free herd.
  rect(748, 6, 14, 16, 0xa195a5);
  rect(744, 10, 22, 8, 0xa195a5);
  rect(750, 6, 14, 8, 0x1c1b2e);
  for (const [x, y] of [[28, 10], [122, 16], [238, 8], [380, 16], [492, 8], [612, 14], [704, 8]]) {
    rect(x, y, 2, 2, 0xb6a9b3);
    if (x % 4 === 0) { rect(x - 2, y, 6, 2, 0x77687f); rect(x, y - 2, 2, 6, 0x77687f); rect(x, y, 2, 2, 0xcbbbc0); }
  }
  // Low-contrast patchwork meadow, not a horizon that strands Puffs in the sky.
  for (let i = 0; i < 90; i++) {
    const x = 36 + (i * 113 % 728);
    const y = 44 + (i * 67 % 312);
    rect(x - x % 2, y - y % 2, 8 + i % 3 * 4, 2, 0x302a40);
    if (i % 4 === 0) rect(x - x % 2 + 4, y - y % 2 - 2, 4, 2, 0x302a40);
  }
  // Moss and warm flowers on the outer verge; never cover the pen centers.
  for (const x of [10, 782]) for (let y = 62; y < 560; y += 66) {
    rect(x, y + 8, 2, 12, 0x587263);
    rect(x - 4, y + 12, 4, 2, 0x587263);
    rect(x + 2, y + 8, 4, 2, 0x587263);
    rect(x - 2, y + 2, 6, 6, 0x9e7475);
    rect(x, y + 4, 2, 2, 0xe9be89);
  }
  // Stone lane separates the meadow from the pens without moving either.
  for (let x = 28; x < 778; x += 34) {
    rect(x, 360, 26, 8, 0x3c344b);
    rect(x + 2, 360, 22, 2, 0x4d4058);
  }
  rect(24, 588, 752, 2, 0x49394d);
  rect(36, 592, 728, 2, 0x302a40);
}
