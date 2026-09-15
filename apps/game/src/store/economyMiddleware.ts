import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { gameTick, gameTickCatchup } from "./clockSlice";
import { goldAdjusted, upkeepAccumulatorAdvanced, UPKEEP_INTERVAL_MS, UPKEEP_PER_PUFF } from "./economySlice";
import type { RootState, AppDispatch } from "./store";

export const economyMiddleware = createListenerMiddleware();
const startAppListening = economyMiddleware.startListening.withTypes<RootState, AppDispatch>();

// Upkeep is deducted in periodic batches, not continuously every tick -- a
// readable, occasional deduction rather than a constant tiny drain. Unlike
// breeding's deliberate one-cycle-per-catchup cap (parent-picking/mutation
// don't trivially "loop"), upkeep is a flat linear cost, so a long
// gameTickCatchup gap correctly deducts every interval that elapsed rather
// than just one -- matching state-and-tick.md's full-duration fast-forward.
startAppListening({
  matcher: isAnyOf(gameTick, gameTickCatchup),
  effect: (action, listenerApi) => {
    const elapsed = gameTick.match(action) ? action.payload.delta : gameTickCatchup.match(action) ? action.payload.elapsed : 0;
    listenerApi.dispatch(upkeepAccumulatorAdvanced({ delta: elapsed }));

    const { upkeepAccumulator } = listenerApi.getState().economy;
    const intervalsElapsed = Math.floor(upkeepAccumulator / UPKEEP_INTERVAL_MS);
    if (intervalsElapsed === 0) return;

    const puffCount = Object.keys(listenerApi.getState().puffs.byId).length;
    listenerApi.dispatch(goldAdjusted({ amount: -(puffCount * UPKEEP_PER_PUFF * intervalsElapsed) }));
    listenerApi.dispatch(upkeepAccumulatorAdvanced({ delta: -(intervalsElapsed * UPKEEP_INTERVAL_MS) }));
  },
});
