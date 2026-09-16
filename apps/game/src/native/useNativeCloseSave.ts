import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { saveGameState } from "../store/persistence";
import { store } from "../store/store";

// Tauri waits for this callback before destroying the native window.
// Browser beforeunload is not reliable when a native webview is destroyed.
export const useNativeCloseSave = () => {
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow().onCloseRequested(() => saveGameState(store)).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    }).catch((error: unknown) => {
      console.error("Could not set up saving when the app closes", error);
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
};
