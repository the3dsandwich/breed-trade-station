import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { deriveTraits } from "@bts/shared";
import { clockReducer, gameTick, gameTickCatchup } from "./clockSlice";
import { economyReducer, goldAdjusted } from "./economySlice";
import { economyMiddleware } from "./economyMiddleware";
import { puffsReducer } from "./puffsSlice";
import { pensReducer } from "./pensSlice";
import { requestsReducer } from "./requestsSlice";
import { selectionReducer, releaseModeToggled } from "./selectionSlice";
import { buyTraderPuff, refreshTraderStock } from "./traderActions";
import { localTraderDay, TRADER_PRICE } from "./traderRules";
import { loadPersistedState, saveGameState, type PersistedState } from "./persistence";

const MORNING = new Date(2026, 9, 2, 9, 30).getTime();
const NEXT_DAY = new Date(2026, 9, 3, 0, 0).getTime();
const makeStore = (preloadedState?: PersistedState) => configureStore({
  reducer: { clock: clockReducer, economy: economyReducer, puffs: puffsReducer,
    pens: pensReducer, requests: requestsReducer, selection: selectionReducer },
  preloadedState,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(economyMiddleware.middleware),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MORNING);
  const saved = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("daily trader", () => {
  it("adds ready stock to an old save without changing its herd, Gold or birth history", () => {
    const store = makeStore();
    const before = store.getState();
    expect(before.economy.trader).toBeUndefined();
    store.dispatch(refreshTraderStock());
    const after = store.getState();
    expect(after.puffs).toBe(before.puffs);
    expect(after.economy.gold).toBe(before.economy.gold);
    const offers = after.economy.trader!.offers;
    expect(offers.map(puff => deriveTraits(puff.genes).bodySize)).toEqual(["L", "S", "M"]);
    expect(new Set(offers.map(puff => deriveTraits(puff.genes).sex))).toEqual(new Set(["F", "M"]));
    expect(new Set(offers.map(puff => puff.id)).size).toBe(3);
    expect(offers.every(puff => puff.matured && puff.breedingReadyAt === undefined)).toBe(true);
  });

  it("buys the exact saved Puff in one update, selects it, and never invents a birth", () => {
    const store = makeStore();
    store.dispatch(refreshTraderStock());
    const stock = store.getState().economy.trader!;
    const offer = stock.offers[0];
    const subscriber = vi.fn();
    store.subscribe(subscriber);
    expect(store.dispatch(buyTraderPuff(stock.day, offer.id))).toBe(true);
    expect(subscriber).toHaveBeenCalledOnce();
    const state = store.getState();
    expect(state.economy.gold).toBe(50 - TRADER_PRICE);
    expect(state.economy.trader!.purchasedPuffId).toBe(offer.id);
    expect(state.puffs.byId[offer.id]).toEqual(offer);
    expect(state.selection.selectedPuffId).toBe(offer.id);
    expect(state.puffs.birthCount).toBeUndefined();
    expect(state.puffs.recentBirths).toBeUndefined();
    expect(Object.values(state.pens.byId).every(pen => !pen.occupantIds.includes(offer.id))).toBe(true);
    expect(store.dispatch(buyTraderPuff(stock.day, offer.id))).toBe(false);
    expect(store.dispatch(buyTraderPuff(stock.day, stock.offers[1].id))).toBe(false);
    expect(store.getState()).toBe(state);
  });

  it.each(["poor", "release mode", "missing offer", "wrong day"])("rejects %s without spending Gold or adding a Puff", (reason) => {
    const store = makeStore();
    store.dispatch(refreshTraderStock());
    const stock = store.getState().economy.trader!;
    if (reason === "poor") store.dispatch(goldAdjusted({ amount: -36 }));
    if (reason === "release mode") store.dispatch(releaseModeToggled());
    const before = store.getState();
    expect(store.dispatch(buyTraderPuff(reason === "wrong day" ? "2026-10-01" : stock.day,
      reason === "missing offer" ? "not-an-offer" : stock.offers[0].id))).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it("accepts exactly 15 Gold and charges it only once", () => {
    const store = makeStore();
    store.dispatch(refreshTraderStock());
    store.dispatch(goldAdjusted({ amount: -35 }));
    const stock = store.getState().economy.trader!;
    expect(store.dispatch(buyTraderPuff(stock.day, stock.offers[0].id))).toBe(true);
    expect(store.getState().economy.gold).toBe(0);
  });

  it("keeps today's offers and purchase cap across a real save/load", () => {
    const store = makeStore();
    store.dispatch(refreshTraderStock());
    const stock = store.getState().economy.trader!;
    store.dispatch(buyTraderPuff(stock.day, stock.offers[1].id));
    saveGameState(store);
    const saved = loadPersistedState()!;
    expect(Object.keys(saved).sort()).toEqual(["clock", "economy", "pens", "puffs", "requests"]);
    const reloaded = makeStore(saved);
    reloaded.dispatch(refreshTraderStock());
    expect(reloaded.getState().economy).toEqual(store.getState().economy);
    expect(reloaded.getState().puffs).toEqual(store.getState().puffs);
    expect(reloaded.dispatch(buyTraderPuff(stock.day, stock.offers[2].id))).toBe(false);
  });

  it("refreshes while open at local midnight and rejects a stale click without buying replacement stock", () => {
    const store = makeStore();
    store.dispatch(refreshTraderStock());
    const oldStock = store.getState().economy.trader!;
    vi.setSystemTime(NEXT_DAY);
    expect(store.dispatch(buyTraderPuff(oldStock.day, oldStock.offers[0].id))).toBe(false);
    const fresh = store.getState().economy.trader!;
    expect(fresh.day).toBe(localTraderDay(NEXT_DAY));
    expect(fresh.offers.map(puff => puff.id)).not.toEqual(oldStock.offers.map(puff => puff.id));
    expect(store.getState().economy.gold).toBe(50);
    expect(Object.keys(store.getState().puffs.byId)).toHaveLength(0);
    vi.setSystemTime(new Date(2026, 9, 4, 0, 0));
    store.dispatch(gameTick({ delta: 250 }));
    expect(store.getState().economy.trader!.day).toBe("2026-10-04");
  });

  it("does not restock or allow a purchase when the local date goes backward", () => {
    const store = makeStore();
    store.dispatch(refreshTraderStock());
    const before = store.getState();
    vi.setSystemTime(new Date(2026, 9, 1, 12));
    store.dispatch(refreshTraderStock());
    const stock = before.economy.trader!;
    expect(store.dispatch(buyTraderPuff(stock.day, stock.offers[0].id))).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it("a long absence creates one visit, with no missed-day purchase bank", () => {
    const store = makeStore();
    store.dispatch(refreshTraderStock());
    const original = store.getState().economy.trader!;
    store.dispatch(buyTraderPuff(original.day, original.offers[0].id));
    vi.setSystemTime(new Date(2027, 0, 1, 10));
    store.dispatch(gameTickCatchup({ elapsed: 90 * 86400000 }));
    const stock = store.getState().economy.trader!;
    expect(stock.day).toBe("2027-01-01");
    expect(stock.offers).toHaveLength(3);
    expect(stock.purchasedPuffId).toBeUndefined();
    store.dispatch(goldAdjusted({ amount: 50 }));
    expect(store.dispatch(buyTraderPuff(stock.day, stock.offers[0].id))).toBe(true);
    expect(store.dispatch(buyTraderPuff(stock.day, stock.offers[1].id))).toBe(false);
    store.dispatch(refreshTraderStock());
    expect(store.getState().economy.trader!.offers).toEqual(stock.offers);
  });
});
