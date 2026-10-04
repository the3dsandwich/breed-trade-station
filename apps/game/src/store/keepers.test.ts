import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, type GeneArray, type Request } from "@bts/shared";
import { clockReducer, gameTick } from "./clockSlice";
import { economyReducer, UPKEEP_INTERVAL_MS } from "./economySlice";
import { puffsReducer, puffBorn, puffKeeperToggled, puffRemoved } from "./puffsSlice";
import { pensReducer, pensSeeded, puffAssignedToPen, puffUnassigned } from "./pensSlice";
import { requestsReducer, requestsSeeded } from "./requestsSlice";
import { selectionReducer, puffSelectionToggled, releaseModeToggled, releaseBatchMembershipToggled } from "./selectionSlice";
import { releasePuffs, fulfillRequest } from "./gameActions";
import { removalBlockedReason } from "./removalRules";
import { loadPersistedState, saveGameState, type PersistedState } from "./persistence";
import { breedingMiddleware } from "./breedingMiddleware";
import { economyMiddleware } from "./economyMiddleware";
import { BREEDING_DURATION_MS, GROWTH_DURATION_MS, isPuffReadyToBreed } from "./breedingRules";
import { buyTraderPuff, refreshTraderStock } from "./traderActions";

const FEMALE: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const MALE: GeneArray = [...FEMALE];
MALE[9] = 1;
const request: Request = { id: "request", requirements: [{ trait: "sex", value: "M" }], reward: 16 };
const makeStore = (preloadedState?: PersistedState) => configureStore({
  reducer: { clock: clockReducer, economy: economyReducer, puffs: puffsReducer,
    pens: pensReducer, requests: requestsReducer, selection: selectionReducer },
  preloadedState,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(breedingMiddleware.middleware, economyMiddleware.middleware),
});
const seededStore = () => {
  const store = makeStore();
  for (const id of ["female", "spare-female"]) store.dispatch(puffBorn(createPuff(id, FEMALE, 0)));
  for (const id of ["male", "spare-male"]) store.dispatch(puffBorn(createPuff(id, MALE, 0)));
  store.dispatch(pensSeeded([{ id: "pen", name: "Pen 1", capacity: 4 }]));
  store.dispatch(requestsSeeded([request]));
  return store;
};
afterEach(() => vi.unstubAllGlobals());

describe("keeper protection", () => {
  it("marks only living Puffs, toggles off, and cleans up removed IDs", () => {
    const store = seededStore();
    const legacy = store.getState().puffs;
    expect(legacy.keeperIds).toBeUndefined();
    store.dispatch(puffKeeperToggled({ puffId: "missing" }));
    expect(store.getState().puffs).toBe(legacy);
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    expect(store.getState().puffs.keeperIds).toEqual(["male"]);
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    expect(store.getState().puffs.keeperIds).toEqual([]);
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    store.dispatch(puffRemoved({ puffId: "male" }));
    expect(store.getState().puffs.keeperIds).toEqual([]);
    expect(removalBlockedReason(store.getState().puffs.byId, ["missing"], ["missing"])).toBeNull();
  });

  it.each([["male"], ["spare-female", "male"]])("blocks the entire release of %j without changing selection, pens or Gold", (...ids) => {
    const store = seededStore();
    store.dispatch(puffAssignedToPen({ puffId: "male", penId: "pen" }));
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    store.dispatch(puffSelectionToggled({ puffId: "male" }));
    store.dispatch(releaseModeToggled());
    for (const puffId of ids) store.dispatch(releaseBatchMembershipToggled({ puffId }));
    const before = store.getState();
    expect(store.dispatch(releasePuffs(ids))).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it("rechecks a newly marked keeper when fulfilling a previously matching request", () => {
    const store = seededStore();
    store.dispatch(puffSelectionToggled({ puffId: "male" }));
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    const before = store.getState();
    store.dispatch(fulfillRequest("male", request));
    expect(store.getState()).toBe(before);
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    store.dispatch(fulfillRequest("male", request));
    expect(store.getState().puffs.byId.male).toBeUndefined();
    expect(store.getState().economy.gold).toBe(66);
    expect(store.getState().requests.byId.request).toBeUndefined();
  });

  it("unmarking allows release, rewards once, and exits bulk mode with no leftover selection", () => {
    const store = seededStore();
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    store.dispatch(puffSelectionToggled({ puffId: "male" }));
    store.dispatch(releaseModeToggled());
    store.dispatch(releaseBatchMembershipToggled({ puffId: "male" }));
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    expect(store.dispatch(releasePuffs(["male", "male"]))).toBe(true);
    expect(store.getState().selection).toEqual({ selectedPuffId: null, releaseBatch: [], releaseModeActive: false });
    expect(store.getState().economy.gold).toBe(52);
    expect(store.dispatch(releasePuffs(["male"]))).toBe(false);
    expect(store.getState().economy.gold).toBe(52);
  });

  it("empty and last-parent batches keep bulk mode and selections unchanged", () => {
    const store = seededStore();
    store.dispatch(releaseModeToggled());
    store.dispatch(releaseBatchMembershipToggled({ puffId: "male" }));
    const before = store.getState();
    expect(store.dispatch(releasePuffs(["missing"]))).toBe(false);
    expect(store.dispatch(releasePuffs(["male", "spare-male"]))).toBe(false);
    expect(store.getState()).toBe(before);
    expect(removalBlockedReason(before.puffs.byId, ["male", "spare-male"])).toContain("Keep at least one male");
  });

  it("loads an old save with no keepers and preserves marks through the real save path", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const original = seededStore();
    saveGameState(original);
    const legacy = makeStore(loadPersistedState());
    expect(legacy.getState().puffs.keeperIds).toBeUndefined();
    legacy.dispatch(puffKeeperToggled({ puffId: "male" }));
    saveGameState(legacy);
    const saved = loadPersistedState()!;
    expect(Object.keys(saved).sort()).toEqual(["clock", "economy", "pens", "puffs", "requests"]);
    const reloaded = makeStore(saved);
    expect(reloaded.getState().puffs.keeperIds).toEqual(["male"]);
    expect(reloaded.dispatch(releasePuffs(["male"]))).toBe(false);
    reloaded.dispatch(fulfillRequest("male", request));
    expect(reloaded.getState().puffs.byId.male).toBeDefined();
  });

  it("keepers move, breed and pay upkeep, while babies grow without inheriting the mark", () => {
    const store = seededStore();
    for (const puffId of ["male", "female"]) {
      store.dispatch(puffKeeperToggled({ puffId }));
      store.dispatch(puffAssignedToPen({ puffId, penId: "pen" }));
    }
    store.dispatch(gameTick({ delta: BREEDING_DURATION_MS }));
    const born = store.getState();
    const child = born.puffs.recentBirths![0].child.id;
    expect(born.puffs.birthCount).toBe(1);
    expect(born.puffs.keeperIds).toEqual(["male", "female"]);
    expect(born.puffs.keeperIds).not.toContain(child);
    expect(isPuffReadyToBreed(born.puffs.byId[child], born.clock.gameTime)).toBe(false);
    store.dispatch(puffUnassigned({ puffId: "male" }));
    expect(store.getState().pens.byId.pen.occupantIds).not.toContain("male");
    store.dispatch(gameTick({ delta: GROWTH_DURATION_MS }));
    expect(isPuffReadyToBreed(store.getState().puffs.byId[child], store.getState().clock.gameTime)).toBe(true);
    store.dispatch(puffUnassigned({ puffId: "female" }));
    const gold = store.getState().economy.gold;
    store.dispatch(gameTick({ delta: UPKEEP_INTERVAL_MS - store.getState().economy.upkeepAccumulator }));
    expect(store.getState().economy.gold).toBe(gold - Object.keys(store.getState().puffs.byId).length);
  });

  it("a trader purchase does not become a keeper automatically", () => {
    const store = seededStore();
    store.dispatch(puffKeeperToggled({ puffId: "male" }));
    store.dispatch(refreshTraderStock());
    const stock = store.getState().economy.trader!;
    expect(store.dispatch(buyTraderPuff(stock.day, stock.offers[0].id))).toBe(true);
    expect(store.getState().puffs.keeperIds).toEqual(["male"]);
  });
});
