import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { traderPurchaseCompleted, TRADER_PRICE, type TraderStock } from "./traderRules";

// Placeholders pending playtesting balance (see core-mechanics.md Gold and Upkeep deferrals).
export const STARTING_GOLD = 50;
export const UPKEEP_PER_PUFF = 1;
export const UPKEEP_INTERVAL_MS = 300000;
// Starving speeds breeding up rather than slowing it down: Gold is already
// floored at 0, so extra Puffs born during a shortage don't cost anything
// more right now, and they're exactly the new supply the player needs to
// Release/fulfill their way back to positive Gold.
export const STARVING_BREEDING_MULTIPLIER = 3;
export const RELEASE_REWARD = 2;

export interface EconomyState {
  gold: number;
  upkeepAccumulator: number;
  // Optional for saves from before the first NPC trader.
  trader?: TraderStock;
}

const initialState: EconomyState = {
  gold: STARTING_GOLD,
  upkeepAccumulator: 0,
};

const economySlice = createSlice({
  name: "economy",
  initialState,
  reducers: {
    traderStockRefreshed: (state, action: PayloadAction<TraderStock>) => {
      if (!state.trader || action.payload.day > state.trader.day) state.trader = action.payload;
    },
    goldAdjusted: (state, action: PayloadAction<{ amount: number }>) => {
      // An older/malformed save may predate this field.
      state.gold = Math.max(0, (state.gold ?? 0) + action.payload.amount);
    },
    upkeepAccumulatorAdvanced: (state, action: PayloadAction<{ delta: number }>) => {
      state.upkeepAccumulator = (state.upkeepAccumulator ?? 0) + action.payload.delta;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(traderPurchaseCompleted, (state, action) => {
      state.gold -= TRADER_PRICE;
      if (state.trader) state.trader.purchasedPuffId = action.payload.puff.id;
    });
  },
});

export const { goldAdjusted, upkeepAccumulatorAdvanced, traderStockRefreshed } = economySlice.actions;
export const economyReducer = economySlice.reducer;
