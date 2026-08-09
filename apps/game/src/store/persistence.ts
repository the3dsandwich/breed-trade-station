import type { ClockState } from "./clockSlice";
import type { PuffsState } from "./puffsSlice";

const STORAGE_KEY = "bts:save";

export interface PersistedState {
  puffs: PuffsState;
  clock: ClockState;
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

export const savePersistedState = (state: PersistedState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
