import { useAppDispatch, useAppSelector } from "./store/hooks";
import { releaseModeToggled } from "./store/selectionSlice";
import { releasePuffs } from "./store/gameActions";
import "./ReleaseControls.css";

// Bulk release: toggle release mode, tap Puffs on the canvas to add them
// to the batch (see GameCanvas/PuffSprite), confirm once. Single-Puff
// release still works via the button in PuffInspector.
export const ReleaseControls = () => {
  const dispatch = useAppDispatch();
  const releaseModeActive = useAppSelector((state) => state.selection.releaseModeActive);
  const releaseBatch = useAppSelector((state) => state.selection.releaseBatch);

  return (
    <div className="release-controls">
      <button
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
            disabled={releaseBatch.length === 0}
            onClick={() => releasePuffs(dispatch, releaseBatch)}
          >
            Release {releaseBatch.length || ""}
          </button>
        </>
      )}
    </div>
  );
};
