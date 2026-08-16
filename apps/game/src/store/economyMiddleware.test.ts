import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, type GeneArray } from "@bts/shared";
import { gameTick, gameTickCatchup } from "./clockSlice";
import { puffsReducer, puffBorn } from "./puffsSlice";
import { economyReducer, STARTING_GOLD, UPKEEP_INTERVAL_MS, UPKEEP_PER_PUFF } from "./economySlice";
import { economyMiddleware } from "./economyMiddleware";

const GENES: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const createTestStore = () =>
  configureStore({
    reducer: {
      puffs: puffsReducer,
      economy: economyReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(economyMiddleware.middleware),
  });

describe("economy middleware", () => {
  it("does not deduct gold before the upkeep interval elapses", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(gameTick({ delta: UPKEEP_INTERVAL_MS - 1 }));
    expect(store.getState().economy.gold).toBe(STARTING_GOLD);
  });

  it("deducts upkeep for every living Puff once the interval elapses", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(puffBorn(createPuff("p2", GENES, 0)));
    store.dispatch(gameTick({ delta: UPKEEP_INTERVAL_MS }));

    expect(store.getState().economy.gold).toBe(STARTING_GOLD - 2 * UPKEEP_PER_PUFF);
    expect(store.getState().economy.upkeepAccumulator).toBe(0);
  });

  it("clamps gold at zero instead of going negative", () => {
    const store = createTestStore();
    for (let i = 0; i < STARTING_GOLD + 10; i++) {
      store.dispatch(puffBorn(createPuff(`p${i}`, GENES, 0)));
    }
    store.dispatch(gameTick({ delta: UPKEEP_INTERVAL_MS }));
    expect(store.getState().economy.gold).toBe(0);
  });

  it("also deducts upkeep during offline catchup", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(gameTickCatchup({ elapsed: UPKEEP_INTERVAL_MS }));
    expect(store.getState().economy.gold).toBe(STARTING_GOLD - UPKEEP_PER_PUFF);
  });

  it("deducts every interval that elapsed during a long catchup gap, not just one", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(gameTickCatchup({ elapsed: UPKEEP_INTERVAL_MS * 5 }));
    expect(store.getState().economy.gold).toBe(STARTING_GOLD - 5 * UPKEEP_PER_PUFF);
    expect(store.getState().economy.upkeepAccumulator).toBe(0);
  });

  it("keeps the remainder in the accumulator rather than resetting to zero", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(gameTickCatchup({ elapsed: UPKEEP_INTERVAL_MS * 2 + 1500 }));
    expect(store.getState().economy.gold).toBe(STARTING_GOLD - 2 * UPKEEP_PER_PUFF);
    expect(store.getState().economy.upkeepAccumulator).toBe(1500);
  });
});
