import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, deriveTraits, type GeneArray, type Request } from "@bts/shared";
import { puffsReducer, puffBorn, puffKeeperToggled } from "./puffsSlice";
import { pensReducer } from "./pensSlice";
import { economyReducer } from "./economySlice";
import { selectionReducer } from "./selectionSlice";
import { clockReducer } from "./clockSlice";
import { requestsReducer, requestsSeeded, requestReplaced } from "./requestsSlice";
import { fulfillRequest, releasePuffs } from "./gameActions";
import { saveGameState, loadPersistedState, type PersistedState } from "./persistence";

const female: GeneArray = [1, 1, 1, 0, 0, 1, 1, 0, 0, 0];
const male: GeneArray = [...female]; male[9] = 1;
const request: Request = { id: "sale-request", requirements: [{ trait: "sex", value: "M" }], reward: 16 };
const makeStore = (preloadedState?: PersistedState) => configureStore({ reducer: {
  puffs: puffsReducer, pens: pensReducer, economy: economyReducer, selection: selectionReducer,
  clock: clockReducer, requests: requestsReducer,
}, preloadedState });
const seed = () => {
  const store = makeStore();
  store.dispatch(puffBorn(createPuff("mother", female, 0)));
  store.dispatch(puffBorn(createPuff("father", male, 0)));
  store.dispatch(puffBorn(createPuff("sold", male, 0)));
  store.dispatch(requestsSeeded([request]));
  return store;
};
afterEach(() => vi.unstubAllGlobals());

describe("past request sales", () => {
  it("records authoritative request and visible Puff snapshots, ignoring forged price/requirements", () => {
    const store = seed();
    store.dispatch(fulfillRequest("sold", { ...request, reward: 999, requirements: [{ trait: "sex", value: "F" }] }));
    const state = store.getState();
    expect(state.economy.gold).toBe(66);
    expect(state.puffs.byId.sold).toBeUndefined();
    expect(state.requests.byId[request.id]).toBeUndefined();
    expect(state.requests.pastSales).toEqual([{ requestId: request.id, requirements: request.requirements,
      reward: 16, puff: { id: "sold", traits: deriveTraits(male) } }]);
    expect(JSON.stringify(state.requests.pastSales)).not.toContain("genes");
    store.dispatch(fulfillRequest("sold", request));
    store.dispatch(fulfillRequest("father", request));
    expect(store.getState()).toBe(state);
  });

  it.each(["keeper", "last male", "mismatch", "missing Puff", "missing request"])("does not record a %s rejection", (reason) => {
    const store = seed();
    if (reason === "keeper") store.dispatch(puffKeeperToggled({ puffId: "sold" }));
    if (reason === "last male") store.dispatch(releasePuffs(["father"]));
    const before = store.getState();
    store.dispatch(fulfillRequest(reason === "mismatch" ? "mother" : reason === "missing Puff" ? "gone" : "sold",
      reason === "missing request" ? { ...request, id: "gone" } : request));
    expect(store.getState()).toBe(before);
    expect(store.getState().requests.pastSales).toBeUndefined();
  });

  it("does not fabricate receipts for normal replacement or release", () => {
    const store = seed();
    store.dispatch(requestReplaced({ oldRequestId: request.id, newRequest: { ...request, id: "new" } }));
    store.dispatch(releasePuffs(["sold"]));
    expect(store.getState().requests.pastSales).toBeUndefined();
  });

  it("keeps only the newest ten successful receipts", () => {
    const store = seed();
    for (let index = 0; index < 12; index++) {
      const id = `puff-${index}`;
      const nextRequest = { ...request, id: `request-${index}`, reward: 20 + index };
      store.dispatch(puffBorn(createPuff(id, male, 0)));
      store.dispatch(requestsSeeded([nextRequest]));
      store.dispatch(fulfillRequest(id, nextRequest));
    }
    const sales = store.getState().requests.pastSales!;
    expect(sales).toHaveLength(10);
    expect(sales.map(sale => sale.puff.id)).toEqual(Array.from({ length: 10 }, (_, index) => `puff-${11 - index}`));
    expect(sales[0].reward).toBe(31);
    expect(sales[9].reward).toBe(22);
  });

  it("loads old saves without backfill and keeps a receipt through the real save/load path", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value) });
    const store = seed();
    saveGameState(store);
    const old = makeStore(loadPersistedState());
    expect(old.getState().requests.pastSales).toBeUndefined();
    old.dispatch(fulfillRequest("sold", request));
    saveGameState(old);
    const saved = loadPersistedState()!;
    expect(Object.keys(saved).sort()).toEqual(["clock", "economy", "pens", "puffs", "requests"]);
    const reloaded = makeStore(saved);
    expect(reloaded.getState().requests.pastSales).toEqual(old.getState().requests.pastSales);
    expect(reloaded.getState().puffs.byId.sold).toBeUndefined();
  });
});
