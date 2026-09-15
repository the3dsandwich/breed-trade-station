import { useAppSelector } from "./store/hooks";
import "./RequestsPanel.css";
import { TRAIT_LABELS, traitValueLabel } from "./traitLabels";

export const RequestsPanel = () => {
  const requests = useAppSelector((state) => state.requests);

  return (
    <div className="requests-panel">
      <p className="requests-panel-title">Requests</p>
      <div className="requests-panel-list">
        {requests.order.map((id) => {
          const request = requests.byId[id];
          return (
            <div key={id} className="requests-panel-item">
              <div className="requests-panel-requirements">
                {request.requirements.map((req) => (
                  <span key={req.trait} className="requests-panel-tag">
                    {TRAIT_LABELS[req.trait]}: {traitValueLabel(req.trait, req.value)}
                  </span>
                ))}
              </div>
              <span className="requests-panel-reward">{request.reward}g</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
