import { clearPersistedState, suppressNextSave } from "./store/persistence";
import "./DevTools.css";

// Dev-only: only rendered when import.meta.env.DEV, tree-shaken out of
// production builds. Fixes the class of bug where a stale/corrupt
// localStorage save (e.g. from an HMR-related store desync) leaves the
// game stuck, without needing to open devtools to clear it by hand.
export const DevResetButton = () => {
  const handleReset = () => {
    if (!window.confirm("Clear saved game state and restart?")) return;
    suppressNextSave();
    clearPersistedState();
    window.location.reload();
  };

  return (
    <button className="dev-reset-button" onClick={handleReset}>
      Reset save
    </button>
  );
};
