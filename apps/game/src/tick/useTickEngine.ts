import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import { gameTick, gameTickCatchup, stateSaved } from "../store/clockSlice";
import { savePersistedState, type PersistedState } from "../store/persistence";
import { store } from "../store/store";
import type { TickCommand, TickEvent } from "./tickWorker";

// Picks only the slices that should survive a reload -- passing the whole
// RootState would silently persist ephemeral slices (like selection) that
// aren't declared in PersistedState.
const persistableState = (): PersistedState => {
  const state = store.getState();
  return {
    puffs: state.puffs,
    clock: state.clock,
    pens: state.pens,
    economy: state.economy,
    requests: state.requests,
  };
};

export const useTickEngine = () => {
  const dispatch = useAppDispatch();

  // Mounted once: creates the worker and starts the tick loop for the
  // lifetime of the app. lastSavedAt is only needed at start, so an
  // empty dependency array is intentional here.
  useEffect(() => {
    const worker = new Worker(new URL("./tickWorker.ts", import.meta.url), {
      type: "module",
    });

    const post = (command: TickCommand) => worker.postMessage(command);

    worker.onmessage = (e: MessageEvent) => {
      const event = e.data as TickEvent;
      switch (event.type) {
        case "TICK":
          dispatch(gameTick({ delta: event.delta }));
          break;
        case "CATCHUP":
          dispatch(gameTickCatchup({ elapsed: event.elapsed }));
          break;
        case "SAVE":
          savePersistedState(persistableState());
          dispatch(stateSaved());
          break;
      }
    };

    post({ type: "START", lastSavedAt: store.getState().clock.lastSavedAt });

    const handleBeforeUnload = () => {
      savePersistedState(persistableState());
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      savePersistedState(persistableState());
      post({ type: "STOP" });
      worker.terminate();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
