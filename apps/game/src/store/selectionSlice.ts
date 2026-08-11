import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PuffId } from "@bts/shared";

// Deliberately not part of PersistedState -- selection is ephemeral UI
// state, not something that should survive a reload.
export interface SelectionState {
  selectedPuffId: PuffId | null;
}

const initialState: SelectionState = { selectedPuffId: null };

const selectionSlice = createSlice({
  name: "selection",
  initialState,
  reducers: {
    puffSelectionToggled: (state, action: PayloadAction<{ puffId: PuffId }>) => {
      state.selectedPuffId = state.selectedPuffId === action.payload.puffId ? null : action.payload.puffId;
    },
    selectionCleared: (state) => {
      state.selectedPuffId = null;
    },
  },
});

export const { puffSelectionToggled, selectionCleared } = selectionSlice.actions;
export const selectionReducer = selectionSlice.reducer;
