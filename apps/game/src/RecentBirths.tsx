import { useAppDispatch, useAppSelector } from "./store/hooks";
import { puffSelectionToggled } from "./store/selectionSlice";
import { RECENT_BIRTH_LIMIT, type BirthPuffSnapshot } from "./store/puffsSlice";
import { traitValueLabel } from "./traitLabels";

const BirthPuff = ({ label, puff }: { label: string; puff: BirthPuffSnapshot }) => (
  <div className="birth-puff">
    <h4>{label}</h4>
    <p>{traitValueLabel("sex", puff.traits.sex)} · {traitValueLabel("bodySize", puff.traits.bodySize)} · {traitValueLabel("bodyColor", puff.traits.bodyColor)}</p>
    <p>{traitValueLabel("eyeColor", puff.traits.eyeColor)} eyes · {traitValueLabel("earSize", puff.traits.earSize)} ears</p>
    <span className="herd-picker-id">ID: {puff.id}</span>
  </div>
);

export const RecentBirths = ({ onChoose }: { onChoose: () => void }) => {
  const dispatch = useAppDispatch();
  const records = useAppSelector((state) => state.puffs.recentBirths);
  const puffs = useAppSelector((state) => state.puffs.byId);
  const { selectedPuffId, releaseModeActive } = useAppSelector((state) => state.selection);
  return (
    <section className="recent-births" aria-label="Recent births">
      <p className="birth-record-help">Latest {RECENT_BIRTH_LIMIT} births, newest first. Numbers count recorded births only; earlier births were not recorded. Traits are saved at birth, even after a Puff leaves your herd.</p>
      {releaseModeActive && <p className="birth-record-help">Finish bulk release before opening a baby’s journal.</p>}
      {!records?.length && <p className="birth-record-empty">No births recorded yet. Put a male and a female in a pen with room for a baby. Earlier births were not recorded.</p>}
      {records?.map((record) => (
        <article className="birth-record" key={record.number} aria-label={`Birth ${record.number}`}>
          <header>
            <h3>Birth {record.number} · {record.penName}</h3>
            {record.catchup && <p className="birth-record-help">Born while you were away. Exact time unknown.</p>}
          </header>
          <BirthPuff label="Baby" puff={record.child} />
          <div className="birth-parents">
            <BirthPuff label="Mother" puff={record.mother} />
            <BirthPuff label="Father" puff={record.father} />
          </div>
          {puffs[record.child.id] ? <button type="button" disabled={releaseModeActive} onClick={() => {
            if (selectedPuffId !== record.child.id) dispatch(puffSelectionToggled({ puffId: record.child.id }));
            onChoose();
          }}>Open baby journal</button> : <p className="birth-record-help">No longer in your herd</p>}
        </article>
      ))}
    </section>
  );
};
