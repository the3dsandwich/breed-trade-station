import { useAppDispatch, useAppSelector } from "./store/hooks";
import { useRef } from "react";
import { releaseModeToggled } from "./store/selectionSlice";
import { releasePuffs } from "./store/gameActions";
import "./ReleaseControls.css";
import { removalBlockedReason } from "./store/removalRules";

// Bulk release: toggle release mode, tap Puffs on the canvas to add them
// to the batch (see GameCanvas/PuffSprite), confirm once. Single-Puff
// release still works via the button in PuffInspector.
export const ReleaseControls = () => {
  const dispatch = useAppDispatch();
  const releaseModeActive = useAppSelector((state) => state.selection.releaseModeActive);
  const releaseBatch = useAppSelector((state) => state.selection.releaseBatch);
  const blockedReason = useAppSelector((state) => removalBlockedReason(state.puffs.byId, releaseBatch, state.puffs.keeperIds));
  const hasKeeper = useAppSelector((state) => state.puffs.keeperIds?.some((id) => state.puffs.byId[id] && releaseBatch.includes(id)) ?? false);
  const toggle = useRef<HTMLButtonElement>(null);

  return (
    <div className="release-controls">
      <button
        ref={toggle}
        className={`release-controls-toggle${releaseModeActive ? " is-active" : ""}`}
        onClick={() => dispatch(releaseModeToggled())}
      >
        {releaseModeActive ? "Cancel bulk release" : "Bulk release"}
      </button>
      {releaseModeActive && (
        <>
          <span className="release-controls-count">{releaseBatch.length} selected</span>
          <button
            className="release-controls-confirm"
            disabled={releaseBatch.length === 0 || !!blockedReason}
            aria-describedby="bulk-release-reason"
            onClick={() => {
              if (dispatch(releasePuffs(releaseBatch))) toggle.current?.focus();
            }}
          >
            Release {releaseBatch.length || ""}
          </button>
          <p id="bulk-release-reason" role="status">{hasKeeper ? "This selection includes a keeper. Open Choose a Puff and deselect its Keeper row to release only the other Puffs." : blockedReason ? `${blockedReason} Remove it from your selection first.` : ""}</p>
        </>
      )}
    </div>
  );
};
