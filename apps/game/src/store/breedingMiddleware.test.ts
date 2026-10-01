import { describe, it, expect, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, type GeneArray } from "@bts/shared";
import { clockReducer, gameTick, gameTickCatchup } from "./clockSlice";
import { puffsReducer, puffBorn } from "./puffsSlice";
import { pensReducer, pensSeeded, puffAssignedToPen, puffUnassigned } from "./pensSlice";
import { selectionReducer } from "./selectionSlice";
import { economyReducer, goldAdjusted, STARVING_BREEDING_MULTIPLIER } from "./economySlice";
import { breedingMiddleware } from "./breedingMiddleware";
import { BREEDING_DURATION_MS, GROWTH_DURATION_MS, growthRemainingMs, isPuffReadyToBreed } from "./breedingRules";

// Keep IDs unique when parent-selection tests stub Math.random.
vi.mock("./id", () => {
  let next = 0;
  return { createLocalId: () => `growth-test-${next++}` };
});

// gene[9]: 0 = F, 1|2 = M
const MALE_GENES: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
const FEMALE_GENES: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const createTestStore = () =>
  configureStore({
    reducer: {
      clock: clockReducer,
      puffs: puffsReducer,
      pens: pensReducer,
      selection: selectionReducer,
      economy: economyReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(breedingMiddleware.middleware),
  });

type TestStore = ReturnType<typeof createTestStore>;

const seedPenWithPair = (store: TestStore, capacity = 4) => {
  store.dispatch(puffBorn(createPuff("male-1", MALE_GENES, 0)));
  store.dispatch(puffBorn(createPuff("female-1", FEMALE_GENES, 0)));
  store.dispatch(pensSeeded([{ id: "pen-1", name: "Pen 1", capacity }]));
  store.dispatch(puffAssignedToPen({ puffId: "male-1", penId: "pen-1" }));
  store.dispatch(puffAssignedToPen({ puffId: "female-1", penId: "pen-1" }));
};

describe("breeding middleware", () => {
  it("does not advance progress with fewer than 2 occupants", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("male-1", MALE_GENES, 0)));
    store.dispatch(pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    store.dispatch(puffAssignedToPen({ puffId: "male-1", penId: "pen-1" }));

    store.dispatch(gameTick({ delta: 1000 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("does not advance progress once the pen is already full", () => {
    const store = createTestStore();
    seedPenWithPair(store, 2); // 2 occupants == capacity, already full
    store.dispatch(gameTick({ delta: 1000 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("does not breed before the progress threshold is reached", () => {
    const store = createTestStore();
    seedPenWithPair(store);
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS - 1 }));
    expect(Object.keys(store.getState().puffs.byId)).toHaveLength(2);
  });

  it("breeds a third Puff into the pen once progress crosses the threshold", () => {
    const store = createTestStore();
    seedPenWithPair(store);
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));

    const state = store.getState();
    expect(Object.keys(state.puffs.byId)).toHaveLength(3);
    expect(state.pens.byId["pen-1"].occupantIds).toHaveLength(3);
    expect(state.pens.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("does not breed a same-sex pair, and holds progress at the cap", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("male-1", MALE_GENES, 0)));
    store.dispatch(puffBorn(createPuff("male-2", MALE_GENES, 0)));
    store.dispatch(pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    store.dispatch(puffAssignedToPen({ puffId: "male-1", penId: "pen-1" }));
    store.dispatch(puffAssignedToPen({ puffId: "male-2", penId: "pen-1" }));

    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS * 3 }));

    const state = store.getState();
    expect(Object.keys(state.puffs.byId)).toHaveLength(2);
    expect(state.pens.byId["pen-1"].breedingProgress).toBe(BREEDING_DURATION_MS);
  });

  it("stops breeding once the pen is full", () => {
    const store = createTestStore();
    seedPenWithPair(store, 3); // room for exactly one offspring
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS * 5 }));

    const state = store.getState();
    expect(state.pens.byId["pen-1"].occupantIds).toHaveLength(3);
    expect(Object.keys(state.puffs.byId)).toHaveLength(3);
  });

  it("a capacity-2 pen can never breed -- no room to hold the offspring alongside both parents", () => {
    const store = createTestStore();
    seedPenWithPair(store, 2);
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS * 10 }));

    const state = store.getState();
    expect(Object.keys(state.puffs.byId)).toHaveLength(2);
    expect(state.pens.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("credits breeding progress during offline catchup and can fire a birth", () => {
    const store = createTestStore();
    seedPenWithPair(store);
    store.dispatch(gameTickCatchup({ elapsed: BREEDING_DURATION_MS }));

    expect(Object.keys(store.getState().puffs.byId)).toHaveLength(3);
  });

  it("speeds up breeding progress while starving", () => {
    const store = createTestStore();
    seedPenWithPair(store);
    store.dispatch(goldAdjusted({ amount: -1000 })); // clamps to 0 -> starving

    store.dispatch(gameTick({ delta: 1000 }));

    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(1000 * STARVING_BREEDING_MULTIPLIER);
  });

  it("reaches a birth faster while starving than the same elapsed time normally would", () => {
    const store = createTestStore();
    seedPenWithPair(store);
    store.dispatch(goldAdjusted({ amount: -1000 }));

    // a tick smaller than BREEDING_DURATION_MS still crosses the threshold
    // once scaled up by the starving multiplier
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS / STARVING_BREEDING_MULTIPLIER }));

    expect(Object.keys(store.getState().puffs.byId)).toHaveLength(3);
  });
});


describe("newborn growth", () => {
  const seedGrowingPair = (store: TestStore, maleReady = 0, femaleReady = GROWTH_DURATION_MS) => {
    seedPenWithPair(store, 8);
    store.dispatch(puffBorn({ ...createPuff("male-1", MALE_GENES, 0), breedingReadyAt: maleReady }));
    store.dispatch(puffBorn({ ...createPuff("female-1", FEMALE_GENES, 0), breedingReadyAt: femaleReady }));
  };

  it("keeps legacy Puffs ready without reusing the old matured flag", () => {
    const legacy = createPuff("old", MALE_GENES, Date.now());
    expect(legacy.matured).toBe(false);
    expect(isPuffReadyToBreed(legacy, 0)).toBe(true);
    expect(growthRemainingMs(legacy, 0)).toBe(0);
    const young = { ...legacy, breedingReadyAt: 60_000 };
    expect(isPuffReadyToBreed(young, 59_999)).toBe(false);
    expect(isPuffReadyToBreed(young, 60_000)).toBe(true);
  });

  it("excludes a newborn from the next parent draw even when randomness would pick it", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.999);
    try {
      const store = createTestStore();
      seedPenWithPair(store);
      store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
      const firstBirth = store.getState().puffs.recentBirths![0];
      const baby = store.getState().puffs.byId[firstBirth.child.id];
      expect(baby.breedingReadyAt).toBe(BREEDING_DURATION_MS + GROWTH_DURATION_MS);
      expect(firstBirth.child.traits.sex).toBe("M");
      store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
      expect(store.getState().puffs.recentBirths![0].father.id).toBe("male-1");
      expect(store.getState().puffs.recentBirths).toHaveLength(2);
    } finally {
      random.mockRestore();
    }
  });

  it("starts an unbanked pair at the exact growth boundary, with no early progress", () => {
    const store = createTestStore();
    seedGrowingPair(store);
    store.dispatch(gameTick({ delta: 59_999 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(0);
    store.dispatch(gameTick({ delta: 1 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(0);
    store.dispatch(gameTick({ delta: 7999 }));
    expect(store.getState().puffs.recentBirths ?? []).toHaveLength(0);
    store.dispatch(gameTick({ delta: 1 }));
    expect(store.getState().puffs.recentBirths).toHaveLength(1);
  });

  it("credits only the partial tick after the second young occupant grows", () => {
    const store = createTestStore();
    seedGrowingPair(store, 40_000, 60_000);
    store.dispatch(gameTick({ delta: 65_000 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(5000);
    expect(store.getState().puffs.recentBirths ?? []).toHaveLength(0);
  });

  it("keeps same-sex adult progress through a move and uses it when the young mate grows", () => {
    const store = createTestStore();
    seedGrowingPair(store);
    store.dispatch(puffBorn(createPuff("male-2", MALE_GENES, 0)));
    store.dispatch(puffAssignedToPen({ puffId: "male-2", penId: "pen-1" }));
    store.dispatch(gameTick({ delta: 8000 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(8000);
    store.dispatch(puffUnassigned({ puffId: "male-2" }));
    store.dispatch(gameTick({ delta: 51_999 }));
    expect(store.getState().puffs.recentBirths ?? []).toHaveLength(0);
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(8000);
    store.dispatch(gameTick({ delta: 1 }));
    expect(store.getState().puffs.recentBirths).toHaveLength(1);
  });

  it("starvation speeds breeding progress without shortening growth", () => {
    const store = createTestStore();
    seedGrowingPair(store);
    store.dispatch(goldAdjusted({ amount: -1000 }));
    store.dispatch(gameTick({ delta: 59_000 }));
    expect(growthRemainingMs(store.getState().puffs.byId["female-1"], store.getState().clock.gameTime)).toBe(1000);
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(0);
    store.dispatch(gameTick({ delta: 2000 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(3000);
  });

  it("grows offline but credits only the ready part of a catchup interval", () => {
    const store = createTestStore();
    seedGrowingPair(store);
    store.dispatch(gameTick({ delta: 50_000 }));
    store.dispatch(gameTickCatchup({ elapsed: 15_000 }));
    expect(store.getState().pens.byId["pen-1"].breedingProgress).toBe(5000);
    expect(store.getState().puffs.recentBirths ?? []).toHaveLength(0);
  });

  it("creates at most one offline baby, young from the end of catchup", () => {
    const store = createTestStore();
    seedGrowingPair(store);
    store.dispatch(gameTickCatchup({ elapsed: 3_600_000 }));
    const state = store.getState();
    expect(state.puffs.recentBirths).toHaveLength(1);
    const birth = state.puffs.recentBirths![0];
    expect(birth.catchup).toBe(true);
    expect(state.puffs.byId[birth.child.id].breedingReadyAt).toBe(3_660_000);
    const restored = JSON.parse(JSON.stringify(state));
    expect(growthRemainingMs(restored.puffs.byId[birth.child.id], restored.clock.gameTime)).toBe(60_000);
  });
});
