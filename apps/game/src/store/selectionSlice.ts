import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PuffId } from "@bts/shared";

// Deliberately not part of PersistedState -- selection is ephemeral UI
// state, not something that should survive a reload.
export interface SelectionState {
  selectedPuffId: PuffId | null;
  releaseModeActive: boolean;
  releaseBatch: PuffId[];
}

const initialState: SelectionState = {
  selectedPuffId: null,
  releaseModeActive: false,
  releaseBatch: [],
};

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
    releaseModeToggled: (state) => {
      state.releaseModeActive = !state.releaseModeActive;
      state.releaseBatch = [];
    },
    releaseBatchMembershipToggled: (state, action: PayloadAction<{ puffId: PuffId }>) => {
      const { puffId } = action.payload;
      state.releaseBatch = state.releaseBatch.includes(puffId)
        ? state.releaseBatch.filter((id) => id !== puffId)
        : [...state.releaseBatch, puffId];
    },
    releaseBatchCleared: (state) => {
      state.releaseBatch = [];
    },
  },
});

export const {
  puffSelectionToggled,
  selectionCleared,
  releaseModeToggled,
  releaseBatchMembershipToggled,
  releaseBatchCleared,
} = selectionSlice.actions;
export const selectionReducer = selectionSlice.reducer;
