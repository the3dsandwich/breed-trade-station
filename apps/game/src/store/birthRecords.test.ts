import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, deriveTraits, type GeneArray } from "@bts/shared";
import { puffsReducer, puffBorn, puffRemoved } from "./puffsSlice";
import { pensReducer, pensSeeded, puffAssignedToPen, puffUnassigned } from "./pensSlice";
import { clockReducer, gameTick, gameTickCatchup } from "./clockSlice";
import { economyReducer } from "./economySlice";
import { requestsReducer } from "./requestsSlice";
import { selectionReducer } from "./selectionSlice";
import { breedingMiddleware } from "./breedingMiddleware";
import { BREEDING_DURATION_MS } from "./breedingRules";
import { loadPersistedState, saveGameState, type PersistedState } from "./persistence";

vi.mock("./id", () => {
  let next = 0;
  return { createLocalId: () => `birth-test-${next++}` };
});
const makeStore = (preloadedState?: PersistedState) => configureStore({
  reducer: { puffs: puffsReducer, pens: pensReducer, clock: clockReducer,
    economy: economyReducer, requests: requestsReducer, selection: selectionReducer },
  preloadedState,
  middleware: defaults => defaults().prepend(breedingMiddleware.middleware),
});
const genes = (sex: 0 | 1, eye: 0 | 2 = 0): GeneArray => [1, 1, 1, eye, 0, 1, 1, 1, 1, sex];
const seed = (store: ReturnType<typeof makeStore>, multiple = false) => {
  store.dispatch(pensSeeded([{ id: "pen", name: "Test pen", capacity: multiple ? 5 : 3 }]));
  for (const [id, dna] of [
    ["father-a", genes(1)], ["mother-a", genes(0)],
    ...(multiple ? [["father-b", genes(1, 2)], ["mother-b", genes(0, 2)]] : []),
  ] as [string, GeneArray][]) {
    store.dispatch(puffBorn(createPuff(id, dna, 0)));
    store.dispatch(puffAssignedToPen({ puffId: id, penId: "pen" }));
  }
};
const remove = (store: ReturnType<typeof makeStore>, puffId: string) => {
  store.dispatch(puffUnassigned({ puffId }));
  store.dispatch(puffRemoved({ puffId }));
};

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("birth records", () => {
  it("records the actual randomly chosen parents and retains their traits after removal", () => {
    const store = makeStore();
    seed(store, true);
    expect(store.getState().puffs.recentBirths ?? []).toEqual([]);
    // Choose the second male and female, not the first two occupants.
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValue(0.5);
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
    const state = store.getState();
    const record = state.puffs.recentBirths![0];
    expect(record).toMatchObject({ number: 1, penId: "pen", penName: "Test pen", catchup: false,
      father: { id: "father-b", traits: deriveTraits(genes(1, 2)) },
      mother: { id: "mother-b", traits: deriveTraits(genes(0, 2)) },
    });
    expect(record.child.traits).toEqual(deriveTraits(state.puffs.byId[record.child.id].genes));
    expect(state.pens.byId.pen.occupantIds).toContain(record.child.id);
    remove(store, record.child.id);
    remove(store, "father-b");
    remove(store, "mother-b");
    expect(store.getState().puffs.recentBirths).toEqual([record]);
    saveGameState(store);
    const restored = makeStore(loadPersistedState());
    expect(restored.getState().puffs.recentBirths).toEqual([record]);
    expect(restored.getState().puffs.byId[record.child.id]).toBeUndefined();
  });

  it("records only the single catchup birth, without inventing an offline birth time", () => {
    const store = makeStore();
    seed(store);
    store.dispatch(gameTickCatchup({ elapsed: BREEDING_DURATION_MS * 100 }));
    const records = store.getState().puffs.recentBirths!;
    expect(records).toHaveLength(1);
    expect(records[0].catchup).toBe(true);
    expect(records[0]).not.toHaveProperty("bornAt");
    expect(store.getState().pens.byId.pen.occupantIds).toHaveLength(3);
  });

  it("bounds saved history to twenty births and continues numbering after reload", () => {
    const store = makeStore();
    seed(store);
    for (let i = 0; i < 25; i++) {
      store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
      remove(store, store.getState().puffs.recentBirths![0].child.id);
    }
    const records = store.getState().puffs.recentBirths!;
    expect(records).toHaveLength(20);
    expect(records.map(record => record.number)).toEqual(Array.from({ length: 20 }, (_, i) => 25 - i));
    saveGameState(store);
    const restored = makeStore(loadPersistedState());
    restored.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
    expect(restored.getState().puffs.recentBirths).toHaveLength(20);
    expect(restored.getState().puffs.recentBirths![0].number).toBe(26);
  });

  it("loads a legacy save with its herd intact and no guessed history", () => {
    const old = makeStore();
    seed(old);
    saveGameState(old);
    const saved = loadPersistedState()!;
    expect(saved.puffs).not.toHaveProperty("recentBirths");
    const restored = makeStore(saved);
    expect(restored.getState().puffs.byId).toEqual(old.getState().puffs.byId);
    expect(restored.getState().puffs.recentBirths ?? []).toEqual([]);
    restored.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
    expect(restored.getState().puffs.recentBirths![0].number).toBe(1);
  });
});
