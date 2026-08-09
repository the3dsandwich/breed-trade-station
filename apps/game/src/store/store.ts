import { configureStore } from "@reduxjs/toolkit";
import { clockReducer } from "./clockSlice";
import { puffsReducer, puffsSpawned } from "./puffsSlice";
import { loadPersistedState } from "./persistence";

const INITIAL_PUFF_COUNT = 8;

const persisted = loadPersistedState();

export const store = configureStore({
  reducer: {
    clock: clockReducer,
    puffs: puffsReducer,
  },
  preloadedState: persisted,
});

if (!persisted) {
  store.dispatch(puffsSpawned({ count: INITIAL_PUFF_COUNT }));
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
