import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { buildPen, expandPen } from "./store/penExpansionActions";
import { getExpansionQuote, getNewPenQuote, MAX_PENS, MAX_PEN_CAPACITY } from "./store/penExpansionRules";
import "./ManagePens.css";

export const ManagePens = () => {
  const dispatch = useAppDispatch();
  const pens = useAppSelector((state) => state.pens);
  const gold = useAppSelector((state) => state.economy.gold);
  const releaseMode = useAppSelector((state) => state.selection.releaseModeActive);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const notice = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const newPen = getNewPenQuote(pens);
  const reasonFor = (quote: { cost: number; blockedReason: string | null }) =>
    quote.blockedReason ?? (releaseMode ? "Finish bulk release before building." :
      !Number.isFinite(gold) ? "Your Gold could not be read." :
      gold < quote.cost ? `Earn ${quote.cost - gold}g more from requests or releasing spare Puffs.` : "");
  useEffect(() => {
    if (open && message) notice.current?.focus();
  }, [open, message]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return <div className="manage-pens">
    <button type="button" ref={trigger} aria-haspopup="dialog" aria-controls="manage-pens-dialog"
      aria-expanded={open} onClick={() => {
        setMessage(""); dialog.current?.showModal(); setOpen(true);
      }}>Manage pens</button>
    <dialog id="manage-pens-dialog" ref={dialog} aria-labelledby="manage-pens-title"
      aria-describedby="manage-pens-help" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <header>
        <div><p className="panel-kicker">Room for your next idea</p><h2 id="manage-pens-title">Manage pens</h2></div>
        <button type="button" onClick={() => dialog.current?.close()}>Close</button>
      </header>
      <div className="manage-pens-content">
        <p id="manage-pens-help">Build a pen for another breeding goal, or expand a full pen to leave more room for babies.</p>
        <p className="manage-pens-wallet">{Number.isFinite(gold) ? `You have ${gold}g` : "Gold unavailable"} · {pens.order.length}/{MAX_PENS} pens</p>
        <p ref={notice} className="manage-pens-notice" tabIndex={-1}>{message}</p>
        <article aria-label="Build a new pen">
          <h3>A new breeding pen</h3>
          <p>Four spaces. Starts empty and ready to use. Move your chosen parents here from their journals.</p>
          <button type="button" disabled={!!reasonFor(newPen)} aria-describedby="new-pen-reason"
            onClick={() => {
              const success = dispatch(buildPen(pens.order.length, newPen.cost));
              setMessage(success ? `Built a new pen with four spaces for ${newPen.cost}g. Choose a Puff and move it there from its journal.` : "Your Gold or pens changed. Check the current price and try again.");
            }}>{newPen.blockedReason ? "Pen limit reached" : `Build a pen · ${newPen.cost}g`}</button>
          <p id="new-pen-reason">{reasonFor(newPen)}</p>
        </article>
        <h3>Expand a pen</h3>
        <p>Babies stay with their parents. Extra space allows more births before you need to sort the pen. Parents are still chosen from all grown males and females in that pen.</p>
        <div className="manage-pens-grid">
          {pens.order.map((id) => {
            const pen = pens.byId[id];
            const quote = getExpansionQuote(pen);
            const nextCapacity = Math.min(pen.capacity + 2, MAX_PEN_CAPACITY);
            return <article key={id} aria-label={`Expand ${pen.name}`}>
              <h3>{pen.name}</h3>
              <p>{pen.occupantIds.length}/{pen.capacity} spaces used</p>
              <button type="button" disabled={!!reasonFor(quote)} aria-describedby={`expand-reason-${id}`}
                onClick={() => {
                  const success = dispatch(expandPen(id, pen.capacity, quote.cost));
                  setMessage(success ? `${pen.name} now has ${nextCapacity} spaces. Paid ${quote.cost}g. Its Puffs stay where they are.` : "Your Gold or pen changed. Check the current price and try again.");
                }}>{quote.blockedReason ? `${pen.name} at its limit` : `Expand ${pen.name} to ${nextCapacity} · ${quote.cost}g`}</button>
              <p id={`expand-reason-${id}`}>{reasonFor(quote)}</p>
            </article>;
          })}
        </div>
        <p className="manage-pens-footnote">Up to {MAX_PENS} pens and {MAX_PEN_CAPACITY} spaces per pen. Later upgrades cost more. Empty space has no upkeep; each Puff still does. Breeding and upkeep keep running while this window is open.</p>
      </div>
    </dialog>
  </div>;
};
