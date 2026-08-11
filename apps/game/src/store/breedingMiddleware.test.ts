import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, type GeneArray } from "@bts/shared";
import { clockReducer, gameTick, gameTickCatchup } from "./clockSlice";
import { puffsReducer, puffBorn } from "./puffsSlice";
import { pensReducer, pensSeeded, puffAssignedToPen } from "./pensSlice";
import { selectionReducer } from "./selectionSlice";
import { breedingMiddleware } from "./breedingMiddleware";
import { BREEDING_DURATION_MS } from "./breedingRules";

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
});
