import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Placeholders pending playtesting balance (see core-mechanics.md Gold and Upkeep deferrals).
export const STARTING_GOLD = 50;
export const UPKEEP_PER_PUFF = 1;
export const UPKEEP_INTERVAL_MS = 10000;
// Starving speeds breeding up rather than slowing it down: Gold is already
// floored at 0, so extra Puffs born during a shortage don't cost anything
// more right now, and they're exactly the new supply the player needs to
// Release/fulfill their way back to positive Gold.
export const STARVING_BREEDING_MULTIPLIER = 3;
export const RELEASE_REWARD = 2;

export interface EconomyState {
  gold: number;
  upkeepAccumulator: number;
}

const initialState: EconomyState = {
  gold: STARTING_GOLD,
  upkeepAccumulator: 0,
};

const economySlice = createSlice({
  name: "economy",
  initialState,
  reducers: {
    goldAdjusted: (state, action: PayloadAction<{ amount: number }>) => {
      state.gold = Math.max(0, state.gold + action.payload.amount);
    },
    upkeepAccumulatorAdvanced: (state, action: PayloadAction<{ delta: number }>) => {
      state.upkeepAccumulator += action.payload.delta;
    },
    upkeepAccumulatorReset: (state) => {
      state.upkeepAccumulator = 0;
    },
  },
});

export const { goldAdjusted, upkeepAccumulatorAdvanced, upkeepAccumulatorReset } = economySlice.actions;
export const economyReducer = economySlice.reducer;
