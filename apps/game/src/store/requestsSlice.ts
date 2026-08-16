import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Request } from "@bts/shared";

export interface RequestsState {
  byId: Record<string, Request>;
  order: string[];
}

const initialState: RequestsState = { byId: {}, order: [] };

const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    requestsSeeded: (state, action: PayloadAction<Request[]>) => {
      for (const request of action.payload) {
        state.byId[request.id] = request;
        state.order.push(request.id);
      }
    },
    // Replaces a fulfilled request with a freshly generated one in the
    // same slot, so the active request count stays constant.
    requestReplaced: (state, action: PayloadAction<{ oldRequestId: string; newRequest: Request }>) => {
      const { oldRequestId, newRequest } = action.payload;
      delete state.byId[oldRequestId];
      state.byId[newRequest.id] = newRequest;
      const index = state.order.indexOf(oldRequestId);
      if (index === -1) {
        state.order.push(newRequest.id);
      } else {
        state.order[index] = newRequest.id;
      }
    },
  },
});

export const { requestsSeeded, requestReplaced } = requestsSlice.actions;
export const requestsReducer = requestsSlice.reducer;
