import { useEffect, useRef, useState } from "react";
import { deriveTraits, puffSatisfiesRequest } from "@bts/shared";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { puffSelectionToggled, releaseBatchMembershipToggled } from "./store/selectionSlice";
import { traitValueLabel } from "./traitLabels";
import "./HerdPicker.css";

export const HerdPicker = () => {
  const dispatch = useAppDispatch();
  const puffs = useAppSelector((state) => state.puffs.byId);
  const pens = useAppSelector((state) => state.pens);
  const requests = useAppSelector((state) => state.requests);
  const { selectedPuffId, releaseModeActive, releaseBatch } = useAppSelector((state) => state.selection);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  const closePicker = () => dialog.current?.close();

  return (
    <div className="herd-picker">
      <button type="button" id="herd-picker-summary" className="herd-picker-trigger" ref={trigger}
        aria-haspopup="dialog" aria-controls="herd-dialog" aria-expanded={open}
        onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        Choose a Puff · {Object.keys(puffs).length}
      </button>
      <dialog id="herd-dialog" className="herd-dialog" ref={dialog}
        aria-labelledby="herd-dialog-title" aria-describedby="herd-dialog-help"
        onClose={() => { setOpen(false); trigger.current?.focus(); }}>
        <header className="herd-dialog-header">
          <div>
            <p className="panel-kicker">Your herd · {Object.keys(puffs).length} Puffs</p>
            <h2 id="herd-dialog-title">Choose a Puff</h2>
          </div>
          <button type="button" className="herd-dialog-close" onClick={closePicker}>Close</button>
        </header>
        <p id="herd-dialog-help" className="herd-picker-help">
          {releaseModeActive ? "Mark Puffs for bulk release. Close this list to review and confirm." : "Compare your Puffs. Choose one to open its journal."}
        </p>
        <ul className="herd-picker-list" aria-label="Your Puffs">
          {Object.values(puffs).map((puff) => {
            const traits = deriveTraits(puff.genes);
            const pen = pens.order.map((id) => pens.byId[id]).find((pen) => pen.occupantIds.includes(puff.id));
            const chosen = releaseModeActive ? releaseBatch.includes(puff.id) : selectedPuffId === puff.id;
            return (
              <li key={puff.id}>
                <button type="button" aria-pressed={chosen} onClick={() => {
                  if (releaseModeActive) {
                    dispatch(releaseBatchMembershipToggled({ puffId: puff.id }));
                  } else {
                    if (selectedPuffId !== puff.id) dispatch(puffSelectionToggled({ puffId: puff.id }));
                    closePicker();
                  }
                }}>
                  <strong>{traitValueLabel("sex", traits.sex)} · {traitValueLabel("bodySize", traits.bodySize)} · {traitValueLabel("bodyColor", traits.bodyColor)}</strong>
                  <span>{traitValueLabel("eyeColor", traits.eyeColor)} eyes · {traitValueLabel("earSize", traits.earSize)} ears</span>
                  <span className="herd-picker-location">{pen?.name ?? "Pasture"}{chosen ? releaseModeActive ? " · To release" : " · Selected" : ""}</span>
                  {requests.order.some((id) => puffSatisfiesRequest(traits, requests.byId[id])) && <span className="herd-picker-match">✓ Request match</span>}
                  <span className="herd-picker-id" title={puff.id}>ID: {puff.id}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {Object.keys(puffs).length === 0 && <p className="herd-picker-help">Your pasture is empty.</p>}
        {releaseModeActive && <footer className="herd-dialog-footer">
          <span role="status">{releaseBatch.length} marked for release</span>
          <button type="button" onClick={closePicker}>Done choosing</button>
        </footer>}
      </dialog>
    </div>
  );
};
