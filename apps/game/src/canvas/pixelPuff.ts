import type { PuffTraits } from "@bts/shared";
import type { Graphics } from "pixi.js";

export const PIXEL = 2;
export const BODY_RADIUS = { XS: 10, S: 14, M: 18, L: 22, XL: 26 };
const EAR_RADIUS = { S: 2, M: 3, L: 4 };
export const PUFF_PALETTE = {
  BL: { base: 0x565168, light: 0x82778f, shade: 0x3a354d },
  MX: { base: 0xbb7d59, light: 0xe9b17b, shade: 0x86503d },
  WH: { base: 0xf3e5cf, light: 0xfff7e7, shade: 0xc9b49d },
};
export const INK = 0x211b32;
const EYES = { RD: 0xd94f59, BR: 0x68402d };
export interface Pixel { x: number; y: number; color: number }

// One fixed two-pixel grid: size and ear genes change geometry, never scaling.
export function puffPixels(traits: PuffTraits, blink = false): Pixel[] {
  const r = BODY_RADIUS[traits.bodySize] / PIXEL;
  const er = EAR_RADIUS[traits.earSize];
  const ex = Math.round(r * 0.62);
  const ey = -r + 1;
  const circle = (x: number, y: number, radius: number) => x * x + y * y <= radius * radius;
  const solid = (x: number, y: number) => circle(x, y, r) || circle(Math.abs(x) - ex, y - ey, er);
  const pal = PUFF_PALETTE[traits.bodyColor];
  const pixels: Pixel[] = [];
  const add = (x: number, y: number, color: number) => pixels.push({ x: x * PIXEL, y: y * PIXEL, color });
  for (let y = -r - er; y <= r + 1; y++) {
    for (let x = -r - 1; x <= r + 1; x++) {
      if (solid(x, y)) {
        const outline = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
        add(x, y, outline ? INK : x + y < -r * 0.6 ? pal.light : y > r * 0.48 ? pal.shade : pal.base);
      }
    }
  }
  // Warm inner ears and two solid cream-backed irises stay distinct on soot.
  for (const sign of [-1, 1]) {
    add(sign * ex, ey - er + 2, pal.shade);
    if (er > 2) add(sign * ex, ey - er + 3, pal.shade);
    const eyeOffset = Math.max(3, Math.round(r * 0.42));
    const eyeX = sign < 0 ? -eyeOffset : eyeOffset - 2;
    if (blink) {
      for (let dx = 0; dx < 3; dx++) add(eyeX + dx, 0, INK);
    } else {
      // An upper lid and outer rim separate the whites from cream fur.
      // Leave the inner edge open so the smallest face stays readable.
      for (let dx = 0; dx < 3; dx++) add(eyeX + dx, -3, INK);
      for (let dy = -2; dy <= 1; dy++) add(sign < 0 ? eyeX - 1 : eyeX + 3, dy, INK);
      for (let dy = -2; dy <= 1; dy++) {
        for (let dx = 0; dx < 3; dx++) add(eyeX + dx, dy, 0xfff7e7);
      }
      for (let dy = -1; dy <= 0; dy++) {
        for (let dx = 1; dx <= 2; dx++) add(eyeX + dx, dy, EYES[traits.eyeColor]);
      }
    }
    add(sign * (Math.round(r * 0.62)), 2, pal.shade);
  }
  add(0, 2, INK);
  add(1, 2, INK);
  // Little feet sit within the original body radius.
  add(-Math.max(2, Math.round(r / 2)), r - 1, pal.shade);
  add(Math.max(2, Math.round(r / 2)), r - 1, pal.shade);
  return pixels;
}

export function drawPixels(g: Graphics, pixels: Pixel[]) {
  g.clear();
  for (const { x, y, color } of pixels) g.beginFill(color).drawRect(x, y, PIXEL, PIXEL).endFill();
}

export function puffHitArea(traits: PuffTraits) {
  const r = BODY_RADIUS[traits.bodySize];
  const er = EAR_RADIUS[traits.earSize] * PIXEL;
  const earX = Math.round(r / PIXEL * 0.62) * PIXEL;
  return {
    contains(x: number, y: number) {
      return x * x + y * y <= (r + 4) ** 2 ||
        (Math.abs(x) - earX) ** 2 + (y + r - PIXEL) ** 2 <= (er + 3) ** 2;
    },
  };
}
