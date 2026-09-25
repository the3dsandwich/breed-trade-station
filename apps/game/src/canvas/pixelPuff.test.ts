import { describe, expect, it } from "vitest";
import type { BodySize, EarSize, PuffTraits } from "@bts/shared";
import { BODY_RADIUS, INK, puffHitArea, puffPixels } from "./pixelPuff";

const base: PuffTraits = { bodySize: "M", earSize: "M", bodyColor: "BL", eyeColor: "BR", sex: "F" };
const sizes: BodySize[] = ["XS", "S", "M", "L", "XL"];
const ears: EarSize[] = ["S", "M", "L"];

describe("pixel Puff trait readability and selection", () => {
  it("keeps all five body sizes and three ear heights distinct", () => {
    const widths = sizes.map(bodySize => {
      const pixels = puffPixels({ ...base, bodySize, earSize: "S" });
      return Math.max(...pixels.map(p => p.x)) - Math.min(...pixels.map(p => p.x));
    });
    expect(widths).toEqual([20, 28, 36, 44, 52]);
    for (const bodySize of sizes) {
      const tops = ears.map(earSize => Math.min(...puffPixels({ ...base, bodySize, earSize }).map(p => p.y)));
      expect(new Set(tops).size).toBe(3);
    }
  });

  it("keeps colored eyes visible on every size, coat and ear combination", () => {
    for (const bodySize of sizes) for (const earSize of ears) for (const bodyColor of ["BL", "MX", "WH"] as const) {
      for (const eyeColor of ["BR", "RD"] as const) {
        const traits = { ...base, bodySize, earSize, bodyColor, eyeColor };
        // Last paint wins, just as in Pixi: check visible pixels, not hidden layers.
        const visible = new Map(puffPixels(traits).map(p => [`${p.x},${p.y}`, p.color]));
        const colors = [...visible.values()];
        expect(colors.filter(color => color === (eyeColor === "BR" ? 0x68402d : 0xd94f59))).toHaveLength(8);
        const eyeLeft = { XS: -3, S: -3, M: -4, L: -5, XL: -5 }[bodySize];
        const eyeRight = -eyeLeft - 2;
        // Check the actual face coordinates: cream-coat highlights cannot
        // accidentally stand in for missing eye whites.
        for (const start of [eyeLeft, eyeRight]) {
          for (let dx = 0; dx < 3; dx++) for (let dy = -2; dy <= 1; dy++) {
            const iris = dx >= 1 && dy >= -1 && dy <= 0;
            expect(visible.get(`${(start + dx) * 2},${dy * 2}`)).toBe(iris ? (eyeColor === "BR" ? 0x68402d : 0xd94f59) : 0xfff7e7);
          }
          for (let dx = 0; dx < 3; dx++) expect(visible.get(`${(start + dx) * 2},-6`)).toBe(INK);
        }
        for (let dy = -2; dy <= 1; dy++) {
          expect(visible.get(`${(eyeLeft - 1) * 2},${dy * 2}`)).toBe(INK);
          expect(visible.get(`${(eyeRight + 3) * 2},${dy * 2}`)).toBe(INK);
        }
        expect([...new Map(puffPixels(traits, true).map(p => [`${p.x},${p.y}`, p.color])).values()]).not.toContain(eyeColor === "BR" ? 0x68402d : 0xd94f59);
      }
    }
  });

  it("keeps body edges and ear tips clickable without taking distant pasture clicks", () => {
    for (const bodySize of sizes) for (const earSize of ears) {
      const traits = { ...base, bodySize, earSize };
      const area = puffHitArea(traits);
      const radius = BODY_RADIUS[bodySize];
      expect(area.contains(0, 0)).toBe(true);
      expect(area.contains(radius, 0)).toBe(true);
      expect(area.contains(0, radius)).toBe(true);
      for (const pixel of puffPixels(traits)) expect(area.contains(pixel.x + 1, pixel.y + 1)).toBe(true);
      expect(area.contains(radius + 20, radius + 20)).toBe(false);
    }
  });
});
