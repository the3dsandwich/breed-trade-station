import { useRef } from "react";
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
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const closePicker = () => {
    if (details.current) details.current.open = false;
    summary.current?.focus();
  };

  return (
    <details className="herd-picker" ref={details} onKeyDown={(event) => {
      if (event.key === "Escape" && details.current?.open) {
        event.preventDefault();
        closePicker();
      }
    }}>
      <summary id="herd-picker-summary" ref={summary}>Choose a Puff · {Object.keys(puffs).length}</summary>
      <p className="herd-picker-help">
        {releaseModeActive ? "Mark Puffs for bulk release. Confirm below when ready." : "Choose one to see its journal and move it to a pen."}
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
    </details>
  );
};
