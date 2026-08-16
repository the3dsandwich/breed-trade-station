import { generateRequest, type PuffId, type Request } from "@bts/shared";
import { puffRemoved } from "./puffsSlice";
import { puffUnassigned } from "./pensSlice";
import { goldAdjusted, RELEASE_REWARD } from "./economySlice";
import { requestReplaced } from "./requestsSlice";
import { selectionCleared, releaseBatchCleared } from "./selectionSlice";
import { createLocalId } from "./id";
import type { AppDispatch } from "./store";

// Removes each Puff and unassigns it from any pen it was in, then awards
// the flat Release reward once for the whole batch.
export const releasePuffs = (dispatch: AppDispatch, puffIds: PuffId[]) => {
  if (puffIds.length === 0) return;
  for (const puffId of puffIds) {
    dispatch(puffUnassigned({ puffId }));
    dispatch(puffRemoved({ puffId }));
  }
  dispatch(goldAdjusted({ amount: RELEASE_REWARD * puffIds.length }));
  dispatch(selectionCleared());
  dispatch(releaseBatchCleared());
};

// Removes the matching Puff, awards the request's reward, and refills the
// slot with a freshly generated request.
export const fulfillRequest = (dispatch: AppDispatch, puffId: PuffId, request: Request) => {
  dispatch(puffUnassigned({ puffId }));
  dispatch(puffRemoved({ puffId }));
  dispatch(goldAdjusted({ amount: request.reward }));
  dispatch(requestReplaced({ oldRequestId: request.id, newRequest: generateRequest(createLocalId()) }));
  dispatch(selectionCleared());
};
