import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { confirmRestartGame } from "./restartGame";
import { clockReducer, gameTick, gameTickCatchup } from "./clockSlice";
import { puffsReducer } from "./puffsSlice";
import { pensReducer } from "./pensSlice";
import { economyReducer } from "./economySlice";
import { requestsReducer } from "./requestsSlice";
import { selectionReducer } from "./selectionSlice";
import { clearPersistedState, loadPersistedState, saveGameState, suppressNextSave } from "./persistence";

const makeStore = () => configureStore({ reducer: {
  clock: clockReducer, puffs: puffsReducer, pens: pensReducer,
  economy: economyReducer, requests: requestsReducer, selection: selectionReducer,
} });

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("saving a game", () => {
  it("writes the current timestamp on every save, keeping played time out of reload catchup", () => {
    const store = makeStore();
    vi.setSystemTime(100_000);
    saveGameState(store);
    store.dispatch(gameTick({ delta: 10_000 }));
    vi.setSystemTime(110_000);
    saveGameState(store);
    const saved = loadPersistedState()!;
    expect(saved.clock.lastSavedAt).toBe(110_000);
    expect(saved.clock.gameTime).toBe(10_000);
    vi.setSystemTime(110_100);
    expect(Date.now() - saved.clock.lastSavedAt).toBe(100);
    expect(saved.clock).toEqual(store.getState().clock);
    expect(saved).not.toHaveProperty("selection");
  });
  it("still credits time actually spent away after a save", () => {
    const store = makeStore();
    store.dispatch(gameTick({ delta: 10_000 }));
    vi.setSystemTime(100_000);
    saveGameState(store);
    vi.setSystemTime(105_000);
    const saved = loadPersistedState()!;
    const clock = clockReducer(saved.clock, gameTickCatchup({ elapsed: Date.now() - saved.clock.lastSavedAt }));
    expect(clock.gameTime).toBe(15_000);
  });
  it("keeps the reset button's next-save suppression", () => {
    const store = makeStore();
    saveGameState(store);
    clearPersistedState();
    suppressNextSave();
    saveGameState(store);
    expect(loadPersistedState()).toBeUndefined();
    saveGameState(store);
    expect(loadPersistedState()).toBeDefined();
  });
});


describe("confirmed whole-game restart", () => {
  it("cancel keeps all saved state and does not reload", () => {
    const store = makeStore();
    saveGameState(store);
    const before = loadPersistedState();
    const reload = vi.fn();
    vi.stubGlobal("window", { confirm: vi.fn(() => false), location: { reload } });
    expect(confirmRestartGame()).toBe(false);
    expect(loadPersistedState()).toEqual(before);
    expect(reload).not.toHaveBeenCalled();
    saveGameState(store);
    expect(loadPersistedState()).toBeDefined();
  });
  it("confirm removes the entire save and prevents unload from restoring it", () => {
    const store = makeStore();
    saveGameState(store);
    const reload = vi.fn();
    vi.stubGlobal("window", { confirm: vi.fn(() => true), location: { reload } });
    expect(confirmRestartGame()).toBe(true);
    expect(loadPersistedState()).toBeUndefined();
    expect(reload).toHaveBeenCalledOnce();
    saveGameState(store);
    expect(loadPersistedState()).toBeUndefined();
  });
});
