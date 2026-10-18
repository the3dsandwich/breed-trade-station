import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "./store/hooks";
import { TRAIT_LABELS, traitValueLabel } from "./traitLabels";
import type { TraitKey } from "@bts/shared";
import "./PastSales.css";

const TRAITS: TraitKey[] = ["sex", "bodySize", "bodyColor", "eyeColor", "earSize"];

export const PastSales = () => {
  const sales = useAppSelector((state) => state.requests.pastSales);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return <>
    <button className="past-sales-trigger" type="button" ref={trigger} aria-haspopup="dialog"
      aria-controls="past-sales-dialog" aria-expanded={open}
      onClick={() => { dialog.current?.showModal(); setOpen(true); }}>Past sales</button>
    <dialog id="past-sales-dialog" className="past-sales-dialog" ref={dialog}
      aria-labelledby="past-sales-title" aria-describedby="past-sales-help"
      onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <header className="past-sales-header">
        <h2 id="past-sales-title">Past sales</h2>
        <button type="button" onClick={() => dialog.current?.close()}>Close</button>
      </header>
      <div className="past-sales-content">
        <p id="past-sales-help">Latest 10 recorded request sales, newest first. Sales from before this record began aren't available.</p>
        {!sales?.length && <p>No request sales recorded yet. Complete a request to save its receipt here.</p>}
        {sales?.map((sale) => <article className="past-sale" key={sale.requestId} aria-label={`Sale of Puff ${sale.puff.id}`}>
          <h3>Earned {sale.reward}g</h3>
          <h4>Request requirements</h4>
          <ul>{sale.requirements.map((requirement) => <li key={requirement.trait}>
            {TRAIT_LABELS[requirement.trait]}: {traitValueLabel(requirement.trait, requirement.value)}
          </li>)}</ul>
          <h4>Sold Puff</h4>
          <dl>{TRAITS.map((trait) => <div key={trait}>
            <dt>{TRAIT_LABELS[trait]}</dt><dd>{traitValueLabel(trait, sale.puff.traits[trait])}</dd>
          </div>)}</dl>
          <p className="past-sale-id">ID: {sale.puff.id}</p>
        </article>)}
        <p>Breeding and upkeep keep running while you browse.</p>
      </div>
    </dialog>
  </>;
};
