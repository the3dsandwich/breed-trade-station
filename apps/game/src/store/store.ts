import { configureStore } from "@reduxjs/toolkit";
import { generateRequest } from "@bts/shared";
import { clockReducer } from "./clockSlice";
import { puffsReducer, puffsSpawned } from "./puffsSlice";
import { pensReducer, pensSeeded } from "./pensSlice";
import { selectionReducer } from "./selectionSlice";
import { economyReducer } from "./economySlice";
import { requestsReducer, requestsSeeded } from "./requestsSlice";
import { loadPersistedState } from "./persistence";
import { breedingMiddleware } from "./breedingMiddleware";
import { economyMiddleware } from "./economyMiddleware";
import { createLocalId } from "./id";

const INITIAL_PUFF_COUNT = 8;
const INITIAL_PENS = [
  { id: "pen-1", name: "Pen 1", capacity: 4 },
  { id: "pen-2", name: "Pen 2", capacity: 4 },
];
const INITIAL_REQUEST_COUNT = 3;

const persisted = loadPersistedState();

export const store = configureStore({
  reducer: {
    clock: clockReducer,
    puffs: puffsReducer,
    pens: pensReducer,
    selection: selectionReducer,
    economy: economyReducer,
    requests: requestsReducer,
  },
  preloadedState: persisted,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(breedingMiddleware.middleware, economyMiddleware.middleware),
});

if (!persisted) {
  store.dispatch(puffsSpawned({ count: INITIAL_PUFF_COUNT }));
}
if (!persisted?.pens?.order.length) {
  store.dispatch(pensSeeded(INITIAL_PENS));
}
if (!persisted?.requests?.order.length) {
  const initialRequests = Array.from({ length: INITIAL_REQUEST_COUNT }, () =>
    generateRequest(createLocalId())
  );
  store.dispatch(requestsSeeded(initialRequests));
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
