import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createPuff, randomGenes, type Puff, type PuffId } from "@bts/shared";
import { createLocalId } from "./id";

export interface PuffsState {
  byId: Record<PuffId, Puff>;
}

const initialState: PuffsState = { byId: {} };

const puffsSlice = createSlice({
  name: "puffs",
  initialState,
  reducers: {
    puffsSpawned: (state, action: PayloadAction<{ count: number }>) => {
      for (let i = 0; i < action.payload.count; i++) {
        const puff = createPuff(createLocalId(), randomGenes(), Date.now());
        state.byId[puff.id] = puff;
      }
    },
  },
});

export const { puffsSpawned } = puffsSlice.actions;
export const puffsReducer = puffsSlice.reducer;
