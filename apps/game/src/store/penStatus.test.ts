import { describe, expect, it } from "vitest";
import { createPuff, type GeneArray } from "@bts/shared";
import { getPenStatus } from "./penStatus";
import type { Pen } from "./pensSlice";

const male: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
const female: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const puffs = { m: createPuff("m", male, 0), f: createPuff("f", female, 0), m2: createPuff("m2", male, 0) };
const pen = (occupantIds: string[], breedingProgress = 0, capacity = 4): Pen => ({
  id: "pen-1", name: "Pen 1", capacity, occupantIds, breedingProgress,
});

describe("pen status", () => {
  it("explains what an empty pen needs", () => {
    expect(getPenStatus(pen([]), puffs, 100).text).toContain("male and a female");
  });
  it("shows the missing sex for a single occupant", () => {
    expect(getPenStatus(pen(["m"]), puffs, 100).text).toContain("Add a female");
    expect(getPenStatus(pen(["f"]), puffs, 100).text).toContain("Add a male");
  });
  it("never claims a same-sex pair can breed, even at capped progress", () => {
    const status = getPenStatus(pen(["m", "m2"], 8000), puffs, 100);
    expect(status.text).toContain("Add a female");
    expect(status.progress).toBeUndefined();
  });
  it("shows full instead of a running countdown when there is no room", () => {
    const status = getPenStatus(pen(["m", "f"], 4000, 2), puffs, 100);
    expect(status.text).toContain("Pen full");
    expect(status.progress).toBeUndefined();
  });
  it("uses remaining progress and the zero-Gold rate for its countdown", () => {
    expect(getPenStatus(pen(["m", "f"], 2000), puffs, 100)).toEqual({ text: "Baby in about 6s.", progress: 2000 });
    expect(getPenStatus(pen(["m", "f"], 2000), puffs, 0).text).toContain("Baby in about 2s.");
    expect(getPenStatus(pen(["m", "f"], 8000), puffs, 100).text).toContain("next tick");
  });
});
