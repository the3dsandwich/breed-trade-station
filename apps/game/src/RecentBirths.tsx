import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { puffSelectionToggled } from "./store/selectionSlice";
import { RECENT_BIRTH_LIMIT, type BirthPuffSnapshot } from "./store/puffsSlice";
import { traitValueLabel } from "./traitLabels";

const BirthPuff = ({ label, puff, children }: { label: string; puff: BirthPuffSnapshot; children?: ReactNode }) => (
  <div className="birth-puff">
    <h4>{label}</h4>
    <p>{traitValueLabel("sex", puff.traits.sex)} · {traitValueLabel("bodySize", puff.traits.bodySize)} · {traitValueLabel("bodyColor", puff.traits.bodyColor)}</p>
    <p>{traitValueLabel("eyeColor", puff.traits.eyeColor)} eyes · {traitValueLabel("earSize", puff.traits.earSize)} ears</p>
    <span className="herd-picker-id">ID: {puff.id}</span>
    {children}
  </div>
);

type ParentPair = { motherId: string; fatherId: string };

export const RecentBirths = ({ onChoose }: { onChoose: () => void }) => {
  const dispatch = useAppDispatch();
  const records = useAppSelector((state) => state.puffs.recentBirths);
  const puffs = useAppSelector((state) => state.puffs.byId);
  const { selectedPuffId, releaseModeActive } = useAppSelector((state) => state.selection);
  const [pair, setPair] = useState<ParentPair | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusRequested = useRef(false);
  const lastFocused = useRef<HTMLElement | null>(null);
  const visibleRecords = (records ?? []).filter((record) => !pair ||
    (record.mother.id === pair.motherId && record.father.id === pair.fatherId));

  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    headingRef.current?.focus({ preventScroll: true });
    if (sectionRef.current) sectionRef.current.scrollTop = 0;
  }, [pair]);

  // A live birth can push the focused card out of the bounded history.
  // Recover only that lost focus; never pull it from other dialog controls.
  useEffect(() => {
    const previous = lastFocused.current;
    if (!previous || previous.isConnected) return;
    lastFocused.current = null;
    if (document.activeElement === document.body && sectionRef.current?.closest("dialog")?.open) {
      headingRef.current?.focus({ preventScroll: true });
      sectionRef.current.scrollTop = 0;
    }
  }, [records, puffs]);

  const choosePair = (nextPair: ParentPair | null) => {
    focusRequested.current = true;
    setPair(nextPair);
  };
  const openJournal = (puffId: string) => {
    if (selectedPuffId !== puffId) dispatch(puffSelectionToggled({ puffId }));
    onChoose();
  };
  const parentJournal = (label: string, puffId: string) => puffs[puffId]
    ? <button type="button" disabled={releaseModeActive} onClick={() => openJournal(puffId)}>Open {label} journal</button>
    : <p className="birth-record-help">No longer in your herd</p>;

  return (
    <section className="recent-births" aria-label="Recent births" ref={sectionRef}
      onFocusCapture={(event) => { lastFocused.current = event.target; }}>
      <div className="birth-history-summary">
        <h3 ref={headingRef} tabIndex={-1}>{pair ? "This pair's births" : "All recent births"}</h3>
        <p className="birth-record-help">Latest {RECENT_BIRTH_LIMIT} births, newest first. Numbers count recorded births only; earlier births were not recorded. Traits are saved at birth, even after a Puff leaves your herd.</p>
        {pair && <>
          <p className="birth-record-help" role="status">{visibleRecords.length} {visibleRecords.length === 1 ? "birth" : "births"} from this pair in the latest {RECENT_BIRTH_LIMIT} records. Includes all pens. Older births may no longer be shown.</p>
          <p className="herd-picker-id">Mother ID: {pair.motherId}<br />Father ID: {pair.fatherId}</p>
          <button type="button" onClick={() => choosePair(null)}>Show all births</button>
        </>}
      </div>
      {releaseModeActive && <p className="birth-record-help">Finish bulk release before opening a journal.</p>}
      {!visibleRecords.length && <p className="birth-record-empty">{pair
        ? `No births from this pair remain among the latest ${RECENT_BIRTH_LIMIT} recorded births. Older records are not kept.`
        : "No births recorded yet. Put a male and a female in a pen with room for a baby. Earlier births were not recorded."}</p>}
      {visibleRecords.map((record) => (
        <article className="birth-record" key={record.number} aria-label={`Birth ${record.number}`}>
          <header>
            <h3>Birth {record.number} · {record.penName}</h3>
            {record.catchup && <p className="birth-record-help">Born while you were away. Exact time unknown.</p>}
            {!pair && <button type="button" onClick={() => choosePair({ motherId: record.mother.id, fatherId: record.father.id })}>Show this pair's births</button>}
          </header>
          <BirthPuff label="Baby" puff={record.child} />
          <div className="birth-parents">
            <BirthPuff label="Mother" puff={record.mother}>{parentJournal("mother", record.mother.id)}</BirthPuff>
            <BirthPuff label="Father" puff={record.father}>{parentJournal("father", record.father.id)}</BirthPuff>
          </div>
          {puffs[record.child.id] ? <button type="button" disabled={releaseModeActive} onClick={() => openJournal(record.child.id)}>Open baby journal</button> : <p className="birth-record-help">No longer in your herd</p>}
        </article>
      ))}
    </section>
  );
};
