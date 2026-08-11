import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import { gameTick, gameTickCatchup, stateSaved } from "../store/clockSlice";
import { savePersistedState } from "../store/persistence";
import { store } from "../store/store";
import type { TickCommand, TickEvent } from "./tickWorker";

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
          savePersistedState(store.getState());
          dispatch(stateSaved());
          break;
      }
    };

    post({ type: "START", lastSavedAt: store.getState().clock.lastSavedAt });

    const handleBeforeUnload = () => {
      savePersistedState(store.getState());
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      savePersistedState(store.getState());
      post({ type: "STOP" });
      worker.terminate();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
