import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Request, PuffTraits } from "@bts/shared";

export const PAST_SALES_LIMIT = 10;
export interface RequestSale {
  requestId: string;
  requirements: Request["requirements"];
  reward: number;
  puff: { id: string; traits: PuffTraits };
}

export interface RequestsState {
  byId: Record<string, Request>;
  order: string[];
  // Older saves have no receipts. Earlier sales cannot be reconstructed.
  pastSales?: RequestSale[];
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
    requestReplaced: (state, action: PayloadAction<{ oldRequestId: string; newRequest: Request; sale?: RequestSale["puff"] }>) => {
      const { oldRequestId, newRequest } = action.payload;
      // Already replaced (e.g. a double-fired fulfillment) -- no-op rather
      // than adding a second replacement and growing the active count.
      if (!state.byId[oldRequestId]) return;
      if (action.payload.sale) {
        const request = state.byId[oldRequestId];
        const receipt: RequestSale = {
          requestId: request.id,
          requirements: request.requirements.map(requirement => ({ ...requirement })),
          reward: request.reward,
          puff: { id: action.payload.sale.id, traits: { ...action.payload.sale.traits } },
        };
        state.pastSales = [receipt, ...(state.pastSales ?? [])].slice(0, PAST_SALES_LIMIT);
      }
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
