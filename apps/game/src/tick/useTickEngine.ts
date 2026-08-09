import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { gameTick, gameTickCatchup, stateSaved } from "../store/clockSlice";
import { savePersistedState } from "../store/persistence";
import type { RootState } from "../store/store";
import type { TickCommand, TickEvent } from "./tickWorker";

export const useTickEngine = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s);
  const stateRef = useRef<RootState>(state);
  stateRef.current = state;

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
          savePersistedState(stateRef.current);
          dispatch(stateSaved());
          break;
      }
    };

    post({ type: "START", lastSavedAt: stateRef.current.clock.lastSavedAt });

    const handleBeforeUnload = () => {
      savePersistedState(stateRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      savePersistedState(stateRef.current);
      post({ type: "STOP" });
      worker.terminate();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
