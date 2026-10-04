import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, type GeneArray } from "@bts/shared";
import { clockReducer, gameTick } from "./clockSlice";
import { economyReducer, goldAdjusted } from "./economySlice";
import { puffsReducer, puffBorn, puffKeeperToggled } from "./puffsSlice";
import { pensReducer, pensSeeded, puffAssignedToPen, breedingProgressAdvanced } from "./pensSlice";
import { requestsReducer } from "./requestsSlice";
import { selectionReducer, releaseModeToggled } from "./selectionSlice";
import { buildPen, expandPen } from "./penExpansionActions";
import { getNewPenQuote, getExpansionQuote } from "./penExpansionRules";
import { breedingMiddleware } from "./breedingMiddleware";
import { BREEDING_DURATION_MS } from "./breedingRules";
import { loadPersistedState, saveGameState, type PersistedState } from "./persistence";

const makeStore = (preloadedState?: PersistedState) => configureStore({
  reducer: { clock: clockReducer, economy: economyReducer, puffs: puffsReducer,
    pens: pensReducer, requests: requestsReducer, selection: selectionReducer },
  preloadedState,
  middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(breedingMiddleware.middleware),
});
const seededStore = () => {
  const store = makeStore();
  store.dispatch(pensSeeded([1, 2].map(number => ({ id: `pen-${number}`, name: `Pen ${number}`, capacity: 4 }))));
  return store;
};
const addPuff = (store: ReturnType<typeof makeStore>, id: string, male: boolean, penId: string) => {
  const genes: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, male ? 1 : 0];
  store.dispatch(puffBorn(createPuff(id, genes, 0)));
  store.dispatch(puffAssignedToPen({ puffId: id, penId }));
};
afterEach(() => vi.unstubAllGlobals());

describe("Gold pen purchases", () => {
  it("builds a four-space pen and deducts its displayed price in one update", () => {
    const store = seededStore();
    const before = store.getState();
    const observed: unknown[] = [];
    store.subscribe(() => observed.push(store.getState()));
    expect(getNewPenQuote(before.pens)).toEqual({ cost: 25, blockedReason: null });
    expect(store.dispatch(buildPen(2, 25))).toBe(true);
    expect(observed).toHaveLength(1);
    const state = store.getState();
    expect(state.economy.gold).toBe(25);
    expect(state.pens.byId["pen-3"]).toEqual({ id: "pen-3", name: "Pen 3", capacity: 4, occupantIds: [], breedingProgress: 0 });
    expect(state.pens.order).toEqual(["pen-1", "pen-2", "pen-3"]);
    expect(state.puffs).toBe(before.puffs);
    expect(state.selection).toBe(before.selection);
    expect(store.dispatch(buildPen(2, 25))).toBe(false);
    expect(store.getState()).toBe(state);
  });

  it("expands a full pen without losing its occupants, progress or keepers", () => {
    const store = seededStore();
    for (let i = 0; i < 4; i++) addPuff(store, `p${i}`, i % 2 === 0, "pen-1");
    store.dispatch(puffKeeperToggled({ puffId: "p0" }));
    store.dispatch(breedingProgressAdvanced({ penId: "pen-1", amount: 3000 }));
    const before = store.getState();
    const subscriber = vi.fn();
    store.subscribe(subscriber);
    expect(store.dispatch(expandPen("pen-1", 4, 20))).toBe(true);
    expect(subscriber).toHaveBeenCalledOnce();
    const state = store.getState();
    expect(state.economy.gold).toBe(30);
    expect(state.pens.byId["pen-1"]).toEqual({ ...before.pens.byId["pen-1"], capacity: 6 });
    expect(state.puffs).toBe(before.puffs);
    expect(store.dispatch(expandPen("pen-1", 4, 20))).toBe(false);
    expect(store.getState()).toBe(state);
  });

  it.each(["poor", "release mode", "wrong cost", "wrong count", "infinite funds", "NaN funds"])("rejects a build with %s without changing state", (reason) => {
    const store = seededStore();
    if (reason === "poor") store.dispatch(goldAdjusted({ amount: -26 }));
    if (reason === "release mode") store.dispatch(releaseModeToggled());
    if (reason === "infinite funds") store.dispatch(goldAdjusted({ amount: Infinity }));
    if (reason === "NaN funds") store.dispatch(goldAdjusted({ amount: NaN }));
    const before = store.getState();
    expect(store.dispatch(buildPen(reason === "wrong count" ? 1 : 2, reason === "wrong cost" ? 0 : 25))).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it.each(["poor", "release mode", "wrong cost", "wrong capacity", "missing pen", "infinite funds"])("rejects expansion with %s without changing state", (reason) => {
    const store = seededStore();
    if (reason === "poor") store.dispatch(goldAdjusted({ amount: -31 }));
    if (reason === "release mode") store.dispatch(releaseModeToggled());
    if (reason === "infinite funds") store.dispatch(goldAdjusted({ amount: Infinity }));
    const before = store.getState();
    expect(store.dispatch(expandPen(reason === "missing pen" ? "missing" : "pen-1", reason === "wrong capacity" ? 6 : 4, reason === "wrong cost" ? 1 : 20))).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it("uses the next price for each build and stops at six pens", () => {
    const store = seededStore();
    store.dispatch(goldAdjusted({ amount: 500 }));
    for (const [count, cost] of [[2, 25], [3, 50], [4, 75], [5, 100]]) {
      expect(getNewPenQuote(store.getState().pens).cost).toBe(cost);
      expect(store.dispatch(buildPen(count, cost))).toBe(true);
    }
    const full = store.getState();
    expect(full.economy.gold).toBe(300);
    expect(full.pens.order).toHaveLength(6);
    expect(getNewPenQuote(full.pens).blockedReason).toBeTruthy();
    expect(store.dispatch(buildPen(6, 125))).toBe(false);
    expect(store.getState()).toBe(full);
  });

  it("charges 20 then 40 for expansion, accepts exact funds and stops at eight spaces", () => {
    const store = seededStore();
    store.dispatch(goldAdjusted({ amount: 10 }));
    expect(store.dispatch(expandPen("pen-1", 4, 20))).toBe(true);
    expect(store.dispatch(expandPen("pen-1", 6, 40))).toBe(true);
    expect(store.getState().economy.gold).toBe(0);
    const full = store.getState();
    expect(getExpansionQuote(full.pens.byId["pen-1"]).blockedReason).toBeTruthy();
    expect(store.dispatch(expandPen("pen-1", 8, 60))).toBe(false);
    expect(store.getState()).toBe(full);
  });

  it("handles legacy odd capacities without going past eight and rejects invalid capacities", () => {
    for (const [capacity, cost, next] of [[3, 20, 5], [5, 40, 7], [7, 60, 8]]) {
      const store = makeStore();
      store.dispatch(goldAdjusted({ amount: 100 }));
      store.dispatch(pensSeeded([{ id: "old", name: "Old pen", capacity }]));
      expect(store.dispatch(expandPen("old", capacity, cost))).toBe(true);
      expect(store.getState().pens.byId.old.capacity).toBe(next);
    }
    for (const capacity of [0, 2, 3.5, NaN, Infinity, 9]) {
      const store = makeStore();
      store.dispatch(pensSeeded([{ id: "old", name: "Old pen", capacity }]));
      const before = store.getState();
      expect(getExpansionQuote(before.pens.byId.old).blockedReason).toBeTruthy();
      expect(store.dispatch(expandPen("old", capacity, getExpansionQuote(before.pens.byId.old).cost))).toBe(false);
      expect(store.getState()).toBe(before);
    }
  });

  it("avoids existing IDs in a legacy ranch with gaps", () => {
    const store = makeStore();
    store.dispatch(pensSeeded([{ id: "pen-2", name: "Existing", capacity: 4 }]));
    expect(store.dispatch(buildPen(1, 25))).toBe(true);
    expect(store.getState().pens.order).toEqual(["pen-2", "pen-1"]);
    expect(store.getState().pens.byId["pen-2"].name).toBe("Existing");
  });

  it("persists purchases in the existing five saved slices and loads old pens unchanged", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const original = seededStore();
    saveGameState(original);
    const loaded = makeStore(loadPersistedState());
    expect(loaded.getState().pens).toEqual(original.getState().pens);
    expect(loaded.dispatch(buildPen(2, 25))).toBe(true);
    expect(loaded.dispatch(expandPen("pen-3", 4, 20))).toBe(true);
    saveGameState(loaded);
    const saved = loadPersistedState()!;
    expect(Object.keys(saved).sort()).toEqual(["clock", "economy", "pens", "puffs", "requests"]);
    const reloaded = makeStore(saved);
    expect(reloaded.getState().pens).toEqual(loaded.getState().pens);
    expect(reloaded.getState().economy.gold).toBe(5);
    expect(getNewPenQuote(reloaded.getState().pens).cost).toBe(50);
    expect(getExpansionQuote(reloaded.getState().pens.byId["pen-3"]).cost).toBe(40);
  });

  it("breeds simultaneously in a newly built pen and a formerly full expanded pen", () => {
    const store = seededStore();
    expect(store.dispatch(buildPen(2, 25))).toBe(true);
    for (let i = 0; i < 4; i++) addPuff(store, `old${i}`, i % 2 === 0, "pen-1");
    addPuff(store, "new-female", false, "pen-3");
    addPuff(store, "new-male", true, "pen-3");
    store.dispatch(puffKeeperToggled({ puffId: "old0" }));
    expect(store.dispatch(expandPen("pen-1", 4, 20))).toBe(true);
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
    const state = store.getState();
    expect(state.pens.byId["pen-1"].occupantIds).toHaveLength(5);
    expect(state.pens.byId["pen-3"].occupantIds).toHaveLength(3);
    expect(state.puffs.birthCount).toBe(2);
    expect(state.puffs.recentBirths!.map(birth => birth.penId).sort()).toEqual(["pen-1", "pen-3"]);
    expect(state.puffs.keeperIds).toEqual(["old0"]);
  });
});
