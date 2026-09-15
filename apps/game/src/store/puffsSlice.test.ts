import { afterEach, describe, expect, it, vi } from "vitest";
import { deriveTraits } from "@bts/shared";
import { puffsReducer, puffsSpawned } from "./puffsSlice";
import { hasBreedingPair } from "./removalRules";

vi.mock("./id", () => {
  let next = 0;
  return { createLocalId: () => `test-${next++}` };
});

afterEach(() => vi.restoreAllMocks());
describe("starter herd", () => {
  it.each([0, 0.999])("keeps a breeding pair even at random extreme %s", (random) => {
    vi.spyOn(Math, "random").mockReturnValue(random);
    const state = puffsReducer(undefined, puffsSpawned({ count: 8, starterPair: true }));
    const puffs = Object.values(state.byId);
    expect(puffs).toHaveLength(8);
    expect(hasBreedingPair(state.byId)).toBe(true);
    expect(deriveTraits(puffs[0].genes).sex).toBe("F");
    expect(puffs[1].genes[9]).toBe(1);
  });
  it("identifies empty and single-sex saves as stuck", () => {
    expect(hasBreedingPair({})).toBe(false);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = puffsReducer(undefined, puffsSpawned({ count: 8 }));
    expect(hasBreedingPair(state.byId)).toBe(false);
  });
});
