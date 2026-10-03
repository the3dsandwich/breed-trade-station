import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createPuff, randomGenes, type Puff, type PuffId, type PuffTraits } from "@bts/shared";
import { createLocalId } from "./id";
import { traderPurchaseCompleted } from "./traderRules";

export interface BirthPuffSnapshot {
  id: PuffId;
  traits: PuffTraits;
}

export interface BirthRecord {
  number: number;
  child: BirthPuffSnapshot;
  mother: BirthPuffSnapshot;
  father: BirthPuffSnapshot;
  penId: string;
  penName: string;
  catchup: boolean;
}

export const RECENT_BIRTH_LIMIT = 20;

export interface PuffsState {
  byId: Record<PuffId, Puff>;
  // Optional so saves made before birth records still load without invented history.
  recentBirths?: BirthRecord[];
  birthCount?: number;
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
    birthRecorded: (state, action: PayloadAction<Omit<BirthRecord, "number">>) => {
      const number = (state.birthCount ?? 0) + 1;
      state.birthCount = number;
      state.recentBirths = [{ ...action.payload, number }, ...(state.recentBirths ?? [])].slice(0, RECENT_BIRTH_LIMIT);
    },
    puffRemoved: (state, action: PayloadAction<{ puffId: PuffId }>) => {
      delete state.byId[action.payload.puffId];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(traderPurchaseCompleted, (state, action) => {
      state.byId[action.payload.puff.id] = action.payload.puff;
    });
  },
});

export const { puffsSpawned, puffBorn, puffRemoved, birthRecorded } = puffsSlice.actions;
export const puffsReducer = puffsSlice.reducer;
