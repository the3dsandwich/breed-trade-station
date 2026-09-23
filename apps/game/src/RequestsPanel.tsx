import { deriveTraits } from "@bts/shared";
import { useAppSelector } from "./store/hooks";
import "./RequestsPanel.css";
import { TRAIT_LABELS, traitValueLabel } from "./traitLabels";
import { compareRequest } from "./requestComparison";

export const RequestsPanel = () => {
  const requests = useAppSelector((state) => state.requests);
  const releaseModeActive = useAppSelector((state) => state.selection.releaseModeActive);
  const puff = useAppSelector((state) => {
    const id = state.selection.selectedPuffId;
    return id === null ? undefined : state.puffs.byId[id];
  });
  const traits = !releaseModeActive && puff ? deriveTraits(puff.genes) : undefined;

  return (
    <div className="requests-panel">
      <p className="requests-panel-title">Requests</p>
      {!releaseModeActive && !traits && (
        <p className="requests-panel-hint">Select a Puff to compare its traits with requests.</p>
      )}
      <div className="requests-panel-list">
        {requests.order.map((id) => {
          const request = requests.byId[id];
          const comparison = traits ? compareRequest(traits, request) : undefined;
          return (
            <div key={id} className="requests-panel-item">
              {comparison && (
                <p className="requests-panel-comparison-title">Selected Puff</p>
              )}
              <div className="requests-panel-requirements">
                {request.requirements.map((req, index) => {
                  const result = comparison?.[index];
                  return (
                    <span key={req.trait} className="requests-panel-tag">
                      {TRAIT_LABELS[req.trait]}: {traitValueLabel(req.trait, req.value)}
                      {result && (
                        <span className={`requests-panel-comparison ${
                          result.matches ? "requests-panel-match" : "requests-panel-different"
                        }`}>
                          {result.matches ? "Matches" : `Different — has ${result.actualLabel}`}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
              <span className="requests-panel-reward">{request.reward}g</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
