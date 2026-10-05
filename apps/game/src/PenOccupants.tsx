import { PenReleaseControls } from "./PenReleaseControls";
import { PuffGrowthStatus } from "./PuffGrowthStatus";
import { KeeperBadge } from "./KeeperControls";
import { useRef, useState } from "react";
import { deriveTraits, puffSatisfiesRequest } from "@bts/shared";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { puffUnassigned } from "./store/pensSlice";
import { puffSelectionToggled } from "./store/selectionSlice";
import { getPenStatus } from "./store/penStatus";
import { traitValueLabel } from "./traitLabels";

export const PenOccupants = ({ selectedPenId, onPenChange, onChoose }: {
  selectedPenId: string | null;
  onPenChange: (penId: string) => void;
  onChoose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const pens = useAppSelector((state) => state.pens);
  const puffs = useAppSelector((state) => state.puffs.byId);
  const records = useAppSelector((state) => state.puffs.recentBirths);
  const requests = useAppSelector((state) => state.requests);
  const gold = useAppSelector((state) => state.economy.gold);
  const gameTime = useAppSelector((state) => state.clock.gameTime);
  const { selectedPuffId, releaseModeActive } = useAppSelector((state) => state.selection);
  const selector = useRef<HTMLSelectElement>(null);
  const [notice, setNotice] = useState("");
  const availablePens = pens.order.map((id) => pens.byId[id]).filter(Boolean);
  const pen = availablePens.find((candidate) => candidate.id === selectedPenId) ?? availablePens[0];

  return (
    <section className="pen-occupants" aria-label="Pen occupants">
      {pen ? <>
        <label className="pen-occupants-label" htmlFor="pen-occupants-select">Choose a pen</label>
        <select id="pen-occupants-select" ref={selector} value={pen.id} onChange={(event) => {
          onPenChange(event.target.value);
          setNotice("");
        }}>
          {availablePens.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.occupantIds.length}/{option.capacity} spaces used</option>)}
        </select>
        <h3>{pen.name} · {pen.occupantIds.length}/{pen.capacity} spaces used</h3>
        <p className="pen-occupants-help">{getPenStatus(pen, puffs, gold, gameTime).text}</p>
        {releaseModeActive && <p className="pen-occupants-help">Finish bulk release before opening journals or moving Puffs. You can still read this pen.</p>}
        <p className="pen-occupants-notice" role="status">{notice}</p>
        {pen.occupantIds.length === 0 && <p className="pen-occupants-help">This pen is empty. Choose a Puff from Your Puffs, then use its journal to move it here.</p>}
        <PenReleaseControls key={pen.id} penId={pen.id}>
          {({ selectedIds, toggle }) => <div className="pen-occupants-cards">
          {pen.occupantIds.map((id) => {
            const puff = puffs[id];
            if (!puff) return null;
            const traits = deriveTraits(puff.genes);
            const birth = records?.find((record) => record.child.id === id && record.penId === pen.id);
            return <article className="pen-occupant" key={id} aria-label={`Puff ${id}`} data-release-selected={selectedIds.includes(id)}>
              <h4>{traitValueLabel("sex", traits.sex)} · {traitValueLabel("bodySize", traits.bodySize)} · {traitValueLabel("bodyColor", traits.bodyColor)}</h4>
              <p>{traitValueLabel("eyeColor", traits.eyeColor)} eyes · {traitValueLabel("earSize", traits.earSize)} ears</p>
              <p><PuffGrowthStatus puff={puff} /></p>
              <KeeperBadge puffId={puff.id} />
              {birth && <p className="herd-picker-location">Born here · Birth {birth.number}</p>}
              {requests.order.some((requestId) => puffSatisfiesRequest(traits, requests.byId[requestId])) && <p className="herd-picker-match">✓ Request match</p>}
              <p className="herd-picker-id">ID: {id}</p>
              <div className="pen-occupant-actions">
                <button type="button" disabled={releaseModeActive} onClick={() => {
                  if (selectedPuffId !== id) dispatch(puffSelectionToggled({ puffId: id }));
                  onChoose();
                }}>Open journal</button>
                <button type="button" disabled={releaseModeActive} onClick={() => {
                  dispatch(puffUnassigned({ puffId: id }));
                  setNotice(`Moved ${id} to pasture.`);
                  selector.current?.focus();
                }}>Move to pasture</button>
              </div>
              {!releaseModeActive && <label className="pen-release-choice">
                <input type="checkbox" aria-label={`Select ${id} for release`} checked={selectedIds.includes(id)} onChange={() => toggle(id)} />
                <span>{selectedIds.includes(id) ? "Selected for release" : "Select for release"}</span>
              </label>}
            </article>;
          })}
          </div>}
        </PenReleaseControls>
      </> : <p className="pen-occupants-help">No pens yet.</p>}
    </section>
  );
};
