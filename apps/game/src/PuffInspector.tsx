import { deriveTraits, puffSatisfiesRequest, type Sex } from "@bts/shared";
import { useRef } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { releasePuffs, fulfillRequest } from "./store/gameActions";
import "./PuffInspector.css";
import { TRAIT_LABELS, traitValueLabel } from "./traitLabels";
import { removalBlockedReason } from "./store/removalRules";
import { puffAssignedToPen, puffUnassigned } from "./store/pensSlice";

const SEX_DISPLAY: Record<Sex, { label: string; symbol: string; className: string }> = {
  M: { label: traitValueLabel("sex", "M"), symbol: "♂", className: "puff-inspector-sex-male" },
  F: { label: traitValueLabel("sex", "F"), symbol: "♀", className: "puff-inspector-sex-female" },
};

// Plain React DOM, outside the PixiJS canvas -- reads the same Redux
// store as GameCanvas via the normal Provider, not the ContextBridge.
export const PuffInspector = () => {
  const dispatch = useAppDispatch();
  const releaseModeActive = useAppSelector((state) => state.selection.releaseModeActive);
  const selectedPuffId = useAppSelector((state) => state.selection.selectedPuffId);
  const puff = useAppSelector((state) =>
    selectedPuffId ? state.puffs.byId[selectedPuffId] : undefined
  );
  const blockedReason = useAppSelector((state) => removalBlockedReason(state.puffs.byId, selectedPuffId ? [selectedPuffId] : []));
  const requests = useAppSelector((state) => state.requests);
  const pens = useAppSelector((state) => state.pens);
  const locationStatus = useRef<HTMLParagraphElement>(null);

  if (releaseModeActive) {
    return (
      <aside className="puff-inspector puff-inspector-empty">
        <p>Release mode: use Choose a Puff or tap Puffs on the canvas to mark them for release. Confirm below when ready.</p>
      </aside>
    );
  }

  if (!puff) {
    return (
      <aside className="puff-inspector puff-inspector-empty">
        <span className="inspector-star" aria-hidden="true">✦</span>
        <h2>Your next little wonder</h2>
        <p>Select a Puff to see its details.</p>
      </aside>
    );
  }

  const traits = deriveTraits(puff.genes);
  const sex = SEX_DISPLAY[traits.sex];
  const currentPen = pens.order.map((id) => pens.byId[id]).find((pen) => pen.occupantIds.includes(puff.id));
  const matchingRequests = requests.order
    .map((id) => requests.byId[id])
    .filter((request) => puffSatisfiesRequest(traits, request));

  return (
    <aside className="puff-inspector">
      <h2 className="panel-kicker">Puff journal</h2>
      <div className={`puff-inspector-sex ${sex.className}`}>
        <span className="puff-inspector-sex-symbol">{sex.symbol}</span>
        <span>{sex.label}</span>
      </div>
      <dl className="puff-inspector-traits">
        <dt>{TRAIT_LABELS.bodySize}</dt>
        <dd>{traitValueLabel("bodySize", traits.bodySize)}</dd>
        <dt>{TRAIT_LABELS.bodyColor}</dt>
        <dd>{traitValueLabel("bodyColor", traits.bodyColor)}</dd>
        <dt>{TRAIT_LABELS.eyeColor}</dt>
        <dd>{traitValueLabel("eyeColor", traits.eyeColor)}</dd>
        <dt>{TRAIT_LABELS.earSize}</dt>
        <dd>{traitValueLabel("earSize", traits.earSize)}</dd>
      </dl>

      {matchingRequests.length > 0 && (
        <div className="puff-inspector-matches">
          {matchingRequests.map((request) => (
            <button
              key={request.id}
              className="puff-inspector-fulfill-button"
              disabled={!!blockedReason}
              onClick={() => {
                dispatch(fulfillRequest(puff.id, request));
                document.getElementById("herd-picker-summary")?.focus();
              }}
            >
              Fulfill request for {request.reward}g
            </button>
          ))}
        </div>
      )}

      {blockedReason && <p role="status">{blockedReason}</p>}
      <button disabled={!!blockedReason} className="puff-inspector-release-button" onClick={() => {
        dispatch(releasePuffs([puff.id]));
        document.getElementById("herd-picker-summary")?.focus();
      }}>
        Release
      </button>

      <div className="puff-inspector-movement" role="group" aria-label="Move this Puff">
        <p ref={locationStatus} tabIndex={-1} role="status">Location: {currentPen?.name ?? "Pasture"}</p>
        <div className="puff-inspector-destinations">
          {pens.order.map((id) => {
            const pen = pens.byId[id];
            const current = currentPen?.id === id;
            const full = pen.occupantIds.length >= pen.capacity;
            return <button key={id} type="button" disabled={current || full} onClick={() => {
              dispatch(puffAssignedToPen({ puffId: puff.id, penId: id }));
              locationStatus.current?.focus();
            }}>
              {current ? `In ${pen.name}` : full ? `${pen.name} full` : `Move to ${pen.name}`}
              <span>{pen.occupantIds.length}/{pen.capacity} spaces used</span>
            </button>;
          })}
        </div>
        {currentPen && <button type="button" className="puff-inspector-pasture" onClick={() => {
          dispatch(puffUnassigned({ puffId: puff.id }));
          locationStatus.current?.focus();
        }}>Return to pasture</button>}
      </div>

      <p className="puff-inspector-id">{puff.id}</p>
    </aside>
  );
};
