import { useAppSelector } from "./store/hooks";
import { getPenStatus } from "./store/penStatus";
import { BREEDING_DURATION_MS } from "./store/breedingRules";

export const PenStatusPanel = () => {
  const pens = useAppSelector((state) => state.pens);
  const puffs = useAppSelector((state) => state.puffs.byId);
  const gold = useAppSelector((state) => state.economy.gold);
  return (
    <section className="pen-status-panel" aria-label="Breeding pens">
      <h2>Breed Puffs</h2>
      <p>Choose a Puff, then move it to a pen from its journal.</p>
      <p>Each pen needs a male, a female, and a free space for a baby.</p>
      {pens.order.map((id) => {
        const pen = pens.byId[id];
        const status = getPenStatus(pen, puffs, gold);
        return (
          <section key={id} aria-label={`${pen.name} breeding status`}>
            <h3>{pen.name} · {pen.occupantIds.length}/{pen.capacity} spaces used</h3>
            <p>{status.text}</p>
            {status.progress !== undefined && (
              <progress aria-label={`${pen.name} breeding progress`} max={BREEDING_DURATION_MS} value={status.progress} />
            )}
          </section>
        );
      })}
    </section>
  );
};
