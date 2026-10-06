import { describe, expect, it } from "vitest";
import { createPuff, type GeneArray } from "@bts/shared";
import { getGrownParentCounts } from "./parentSummary";

const genes: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const puffs = {
  mother: createPuff("mother", genes, 0),
  father: createPuff("father", [...genes.slice(0, 9), 1] as GeneArray, 0),
  son: { ...createPuff("son", [...genes.slice(0, 9), 1] as GeneArray, 0), breedingReadyAt: 60000 },
};

describe("grown parents in a pen", () => {
  it("counts legacy adults immediately and a young Puff only at its growth deadline or after catchup", () => {
    const ids = ["mother", "father", "son", "missing"];
    expect(getGrownParentCounts(ids, puffs, 59999)).toEqual({ males: 1, females: 1 });
    expect(getGrownParentCounts(ids, puffs, 60000)).toEqual({ males: 2, females: 1 });
    expect(getGrownParentCounts(ids, puffs, 90000)).toEqual({ males: 2, females: 1 });
  });
  it("counts only the current pen occupants, including zero for an empty or missing-ID pen", () => {
    expect(getGrownParentCounts(["mother", "son"], puffs, 60000)).toEqual({ males: 1, females: 1 });
    expect(getGrownParentCounts(["son"], puffs, 60000)).toEqual({ males: 1, females: 0 });
    expect(getGrownParentCounts(["missing"], puffs, 60000)).toEqual({ males: 0, females: 0 });
    expect(getGrownParentCounts([], puffs, 60000)).toEqual({ males: 0, females: 0 });
  });
});
