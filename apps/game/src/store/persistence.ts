import { stateSaved, type ClockState } from "./clockSlice";
import type { PuffsState } from "./puffsSlice";
import type { PensState } from "./pensSlice";
import type { EconomyState } from "./economySlice";
import type { RequestsState } from "./requestsSlice";

const STORAGE_KEY = "bts:save";

export interface PersistedState {
  puffs: PuffsState;
  clock: ClockState;
  pens: PensState;
  economy: EconomyState;
  requests: RequestsState;
}

export const loadPersistedState = (): PersistedState | undefined => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as PersistedState;
  } catch {
    return undefined;
  }
};

let saveSuppressed = false;

// Lets a caller (e.g. the dev reset button) prevent the beforeunload
// autosave in useTickEngine from immediately re-writing the state that
// clearPersistedState() just removed, during the same reload.
export const suppressNextSave = () => {
  saveSuppressed = true;
};

export const savePersistedState = (state: PersistedState) => {
  if (saveSuppressed) {
    saveSuppressed = false;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearPersistedState = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// All save triggers stamp the snapshot first, so reload only adds time spent away.
export const saveGameState = (gameStore: {
  dispatch: (action: ReturnType<typeof stateSaved>) => unknown;
  getState: () => PersistedState;
}) => {
  gameStore.dispatch(stateSaved());
  const { puffs, clock, pens, economy, requests } = gameStore.getState();
  savePersistedState({ puffs, clock, pens, economy, requests });
};
