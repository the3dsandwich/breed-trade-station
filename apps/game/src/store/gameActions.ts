import { generateRequest, type PuffId, type Request } from "@bts/shared";
import { puffRemoved } from "./puffsSlice";
import { puffUnassigned } from "./pensSlice";
import { goldAdjusted, RELEASE_REWARD } from "./economySlice";
import { requestReplaced } from "./requestsSlice";
import { selectionCleared, releaseBatchCleared } from "./selectionSlice";
import { createLocalId } from "./id";
import type { AppDispatch, RootState } from "./store";

// Plain (non-async) thunks: dispatch/getState come from the store's
// default thunk middleware, not a singleton import, so these stay
// testable against any isolated store.
type AppThunk = (dispatch: AppDispatch, getState: () => RootState) => void;

// Removes each Puff and unassigns it from any pen it was in, then awards
// the flat Release reward once for the whole batch. Filters out ids that
// no longer exist (e.g. a double-fired click) so a duplicate invocation
// can't award gold twice for the same Puff.
export const releasePuffs =
  (puffIds: PuffId[]): AppThunk =>
  (dispatch, getState) => {
    const existingIds = puffIds.filter((puffId) => getState().puffs.byId[puffId]);
    if (existingIds.length === 0) return;

    for (const puffId of existingIds) {
      dispatch(puffUnassigned({ puffId }));
      dispatch(puffRemoved({ puffId }));
    }
    dispatch(goldAdjusted({ amount: RELEASE_REWARD * existingIds.length }));
    dispatch(selectionCleared());
    dispatch(releaseBatchCleared());
  };

// Removes the matching Puff, awards the request's reward, and refills the
// slot with a freshly generated request. Bails out if the Puff or the
// request no longer exists (e.g. a double-fired click on the Fulfill
// button) so a duplicate invocation can't award gold twice or grow the
// active request count past its normal size.
export const fulfillRequest =
  (puffId: PuffId, request: Request): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    if (!state.puffs.byId[puffId] || !state.requests.byId[request.id]) return;

    dispatch(puffUnassigned({ puffId }));
    dispatch(puffRemoved({ puffId }));
    dispatch(goldAdjusted({ amount: request.reward }));
    dispatch(requestReplaced({ oldRequestId: request.id, newRequest: generateRequest(createLocalId()) }));
    dispatch(selectionCleared());
  };
