import { clearPersistedState, suppressNextSave } from "./persistence";

export const confirmRestartGame = (): boolean => {
  if (!window.confirm("Start a new game? This clears ALL your Puffs, Gold, pens, and requests. You will start again with 8 Puffs and the starting Gold.")) return false;
  suppressNextSave();
  clearPersistedState();
  window.location.reload();
  return true;
};
