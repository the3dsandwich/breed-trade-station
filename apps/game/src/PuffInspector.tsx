import { deriveTraits, puffSatisfiesRequest, type Sex } from "@bts/shared";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { releasePuffs, fulfillRequest } from "./store/gameActions";
import "./PuffInspector.css";

const SEX_DISPLAY: Record<Sex, { label: string; symbol: string; className: string }> = {
  M: { label: "Male", symbol: "♂", className: "puff-inspector-sex-male" },
  F: { label: "Female", symbol: "♀", className: "puff-inspector-sex-female" },
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
  const requests = useAppSelector((state) => state.requests);

  if (releaseModeActive) {
    return (
      <aside className="puff-inspector puff-inspector-empty">
        <p>Release mode: tap Puffs on the canvas to add them to the batch.</p>
      </aside>
    );
  }

  if (!puff) {
    return (
      <aside className="puff-inspector puff-inspector-empty">
        <p>Select a Puff to see its details.</p>
      </aside>
    );
  }

  const traits = deriveTraits(puff.genes);
  const sex = SEX_DISPLAY[traits.sex];
  const matchingRequests = requests.order
    .map((id) => requests.byId[id])
    .filter((request) => puffSatisfiesRequest(traits, request));

  return (
    <aside className="puff-inspector">
      <div className={`puff-inspector-sex ${sex.className}`}>
        <span className="puff-inspector-sex-symbol">{sex.symbol}</span>
        <span>{sex.label}</span>
      </div>
      <dl className="puff-inspector-traits">
        <dt>Body size</dt>
        <dd>{traits.bodySize}</dd>
        <dt>Body color</dt>
        <dd>{traits.bodyColor}</dd>
        <dt>Eye color</dt>
        <dd>{traits.eyeColor}</dd>
        <dt>Ear size</dt>
        <dd>{traits.earSize}</dd>
      </dl>

      {matchingRequests.length > 0 && (
        <div className="puff-inspector-matches">
          {matchingRequests.map((request) => (
            <button
              key={request.id}
              className="puff-inspector-fulfill-button"
              onClick={() => dispatch(fulfillRequest(puff.id, request))}
            >
              Fulfill request for {request.reward}g
            </button>
          ))}
        </div>
      )}

      <button className="puff-inspector-release-button" onClick={() => dispatch(releasePuffs([puff.id]))}>
        Release
      </button>

      <p className="puff-inspector-id">{puff.id}</p>
    </aside>
  );
};
