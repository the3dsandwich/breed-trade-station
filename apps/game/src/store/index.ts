import { configureStore } from "@reduxjs/toolkit";
import puffsReducer from "./puffsSlice";

export const store = configureStore({
  reducer: {
    puffs: puffsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
