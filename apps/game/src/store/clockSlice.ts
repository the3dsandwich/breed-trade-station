import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ClockState {
  gameTime: number;
  speed: number;
  lastSavedAt: number;
}

const initialState: ClockState = {
  gameTime: 0,
  speed: 1,
  lastSavedAt: Date.now(),
};

const clockSlice = createSlice({
  name: "clock",
  initialState,
  reducers: {
    gameTick: (state, action: PayloadAction<{ delta: number }>) => {
      state.gameTime += action.payload.delta;
    },
    gameTickCatchup: (state, action: PayloadAction<{ elapsed: number }>) => {
      state.gameTime += action.payload.elapsed;
    },
    speedChanged: (state, action: PayloadAction<{ multiplier: number }>) => {
      state.speed = action.payload.multiplier;
    },
    stateSaved: (state) => {
      state.lastSavedAt = Date.now();
    },
  },
});

export const { gameTick, gameTickCatchup, speedChanged, stateSaved } = clockSlice.actions;
export const clockReducer = clockSlice.reducer;
