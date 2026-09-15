import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PuffId } from "@bts/shared";
import { BREEDING_DURATION_MS } from "./breedingRules";

export type PenId = string;

export interface Pen {
  id: PenId;
  name: string;
  capacity: number;
  occupantIds: PuffId[];
  breedingProgress: number;
}

export interface PensState {
  byId: Record<PenId, Pen>;
  order: PenId[];
}

const initialState: PensState = { byId: {}, order: [] };

const pensSlice = createSlice({
  name: "pens",
  initialState,
  reducers: {
    pensSeeded: (
      state,
      action: PayloadAction<{ id: PenId; name: string; capacity: number }[]>
    ) => {
      for (const pen of action.payload) {
        state.byId[pen.id] = { ...pen, occupantIds: [], breedingProgress: 0 };
        state.order.push(pen.id);
      }
    },
    puffAssignedToPen: (state, action: PayloadAction<{ puffId: PuffId; penId: PenId }>) => {
      const { puffId, penId } = action.payload;
      const target = state.byId[penId];
      if (!target || target.occupantIds.length >= target.capacity) return;

      for (const pen of Object.values(state.byId)) {
        pen.occupantIds = pen.occupantIds.filter((id) => id !== puffId);
      }
      target.occupantIds.push(puffId);
    },
    puffUnassigned: (state, action: PayloadAction<{ puffId: PuffId }>) => {
      for (const pen of Object.values(state.byId)) {
        pen.occupantIds = pen.occupantIds.filter((id) => id !== action.payload.puffId);
      }
    },
    breedingProgressReset: (state, action: PayloadAction<{ penId: PenId }>) => {
      const pen = state.byId[action.payload.penId];
      if (pen) pen.breedingProgress = 0;
    },
    // Breeding rate depends on economy state (starving speeds it up), which
    // a plain reducer can't read -- breedingMiddleware computes the actual
    // (possibly scaled) amount and dispatches it here per eligible pen.
    breedingProgressAdvanced: (state, action: PayloadAction<{ penId: PenId; amount: number }>) => {
      const pen = state.byId[action.payload.penId];
      if (!pen) return;
      // An older save may predate this field.
      pen.breedingProgress = Math.min((pen.breedingProgress ?? 0) + action.payload.amount, BREEDING_DURATION_MS);
    },
  },
});

export const { pensSeeded, puffAssignedToPen, puffUnassigned, breedingProgressReset, breedingProgressAdvanced } =
  pensSlice.actions;
export const pensReducer = pensSlice.reducer;
