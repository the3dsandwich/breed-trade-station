import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PuffId } from "@bts/shared";
import { gameTick } from "./clockSlice";

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
  },
  extraReducers: (builder) => {
    builder.addCase(gameTick, (state, action) => {
      for (const pen of Object.values(state.byId)) {
        // Breeding needs two Puffs and stops once the pen is full -- an
        // older save may also predate this field.
        const eligible = pen.occupantIds.length >= 2 && pen.occupantIds.length < pen.capacity;
        if (eligible) {
          pen.breedingProgress = (pen.breedingProgress ?? 0) + action.payload.delta;
        }
      }
    });
  },
});

export const { pensSeeded, puffAssignedToPen, puffUnassigned, breedingProgressReset } =
  pensSlice.actions;
export const pensReducer = pensSlice.reducer;
