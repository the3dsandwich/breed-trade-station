import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PuffId } from "@bts/shared";

export type PenId = string;

export interface Pen {
  id: PenId;
  name: string;
  capacity: number;
  occupantIds: PuffId[];
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
        state.byId[pen.id] = { ...pen, occupantIds: [] };
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
  },
});

export const { pensSeeded, puffAssignedToPen, puffUnassigned } = pensSlice.actions;
export const pensReducer = pensSlice.reducer;
