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
    puffsSpawned: (state, action: PayloadAction<{ count: number; starterPair?: boolean }>) => {
      for (let i = 0; i < action.payload.count; i++) {
        const genes = randomGenes();
        // Female 0 and heterozygous male 1 can have offspring of either sex.
        if (action.payload.starterPair && i < 2) genes[9] = i === 0 ? 0 : 1;
        const puff = createPuff(createLocalId(), genes, Date.now());
        state.byId[puff.id] = puff;
      }
    },
    puffBorn: (state, action: PayloadAction<Puff>) => {
      state.byId[action.payload.id] = action.payload;
    },
    puffRemoved: (state, action: PayloadAction<{ puffId: PuffId }>) => {
      delete state.byId[action.payload.puffId];
    },
  },
});

export const { puffsSpawned, puffBorn, puffRemoved } = puffsSlice.actions;
export const puffsReducer = puffsSlice.reducer;
