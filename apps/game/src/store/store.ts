import { configureStore } from "@reduxjs/toolkit";
import { clockReducer } from "./clockSlice";
import { puffsReducer, puffsSpawned } from "./puffsSlice";
import { pensReducer, pensSeeded } from "./pensSlice";
import { selectionReducer } from "./selectionSlice";
import { loadPersistedState } from "./persistence";
import { breedingMiddleware } from "./breedingMiddleware";

const INITIAL_PUFF_COUNT = 8;
const INITIAL_PENS = [
  { id: "pen-1", name: "Pen 1", capacity: 4 },
  { id: "pen-2", name: "Pen 2", capacity: 4 },
];

const persisted = loadPersistedState();

export const store = configureStore({
  reducer: {
    clock: clockReducer,
    puffs: puffsReducer,
    pens: pensReducer,
    selection: selectionReducer,
  },
  preloadedState: persisted,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(breedingMiddleware.middleware),
});

if (!persisted) {
  store.dispatch(puffsSpawned({ count: INITIAL_PUFF_COUNT }));
}
if (!persisted?.pens?.order.length) {
  store.dispatch(pensSeeded(INITIAL_PENS));
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
