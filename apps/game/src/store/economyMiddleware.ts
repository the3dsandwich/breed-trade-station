import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { gameTick, gameTickCatchup } from "./clockSlice";
import {
  goldAdjusted,
  upkeepAccumulatorAdvanced,
  upkeepAccumulatorReset,
  UPKEEP_INTERVAL_MS,
  UPKEEP_PER_PUFF,
} from "./economySlice";
import type { RootState, AppDispatch } from "./store";

export const economyMiddleware = createListenerMiddleware();
const startAppListening = economyMiddleware.startListening.withTypes<RootState, AppDispatch>();

// Upkeep is deducted in a periodic batch, not continuously every tick --
// a readable, occasional deduction rather than a constant tiny drain.
startAppListening({
  matcher: isAnyOf(gameTick, gameTickCatchup),
  effect: (action, listenerApi) => {
    const elapsed = action.type === gameTick.type ? action.payload.delta : action.payload.elapsed;
    listenerApi.dispatch(upkeepAccumulatorAdvanced({ delta: elapsed }));

    const { upkeepAccumulator } = listenerApi.getState().economy;
    if (upkeepAccumulator < UPKEEP_INTERVAL_MS) return;

    const puffCount = Object.keys(listenerApi.getState().puffs.byId).length;
    listenerApi.dispatch(goldAdjusted({ amount: -(puffCount * UPKEEP_PER_PUFF) }));
    listenerApi.dispatch(upkeepAccumulatorReset());
  },
});
