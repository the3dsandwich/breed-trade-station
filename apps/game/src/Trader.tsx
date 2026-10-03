import { useEffect, useRef, useState } from "react";
import { deriveTraits } from "@bts/shared";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { buyTraderPuff, refreshTraderStock } from "./store/traderActions";
import { localTraderDay, TRADER_PRICE } from "./store/traderRules";
import { traitValueLabel } from "./traitLabels";
import "./Trader.css";

export const Trader = () => {
  const dispatch = useAppDispatch();
  const { gold, trader } = useAppSelector((state) => state.economy);
  const releaseMode = useAppSelector((state) => state.selection.releaseModeActive);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const notice = useRef<HTMLParagraphElement>(null);
  const previousDay = useRef(trader?.day);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const futureStock = !!trader && trader.day > localTraderDay(Date.now());
  useEffect(() => {
    if (open && previousDay.current && previousDay.current !== trader?.day) {
      setMessage("New daily stock has arrived. Please review the new choices.");
    }
    previousDay.current = trader?.day;
  }, [open, trader?.day]);
  useEffect(() => {
    if (open && message) notice.current?.focus();
  }, [open, message]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return <div className="trader">
    <button type="button" className="trader-trigger" ref={trigger}
      aria-haspopup="dialog" aria-controls="trader-dialog" aria-expanded={open}
      onClick={() => {
        dispatch(refreshTraderStock());
        setMessage("");
        dialog.current?.showModal();
        setOpen(true);
      }}>Visit trader · Puffs {TRADER_PRICE}g</button>
    <p className="trader-teaser">New breeding stock each day. Choose one Puff.</p>
    <dialog id="trader-dialog" className="trader-dialog" ref={dialog}
      aria-labelledby="trader-title" aria-describedby="trader-help"
      onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <header className="trader-header">
        <div><p className="panel-kicker">Dusk Ranch · Visiting trader</p><h2 id="trader-title">A new breeding idea</h2></div>
        <button type="button" onClick={() => dialog.current?.close()}>Close</button>
      </header>
      <div className="trader-content">
        <p id="trader-help">Buy <strong>one Puff per day</strong> for {TRADER_PRICE}g. It joins your pasture, grown and ready to breed. Choose traits to try with your herd; babies may differ.</p>
        <p className="trader-wallet">You have {gold}g · Stock for {trader?.day}</p>
        <p className="trader-notice" tabIndex={-1} ref={notice}>{message}</p>
        {futureStock ? <p className="trader-limit">Your device date is earlier than this stock ({trader?.day}). Check your device date before buying.</p>
          : trader?.purchasedPuffId ? <p className="trader-limit">You bought today's Puff. New choices arrive on the next local day.</p>
          : releaseMode ? <p className="trader-limit">Finish bulk release before buying.</p>
          : gold < TRADER_PRICE ? <p className="trader-limit">Earn {TRADER_PRICE - gold}g more from requests or releasing spare Puffs.</p> : null}
        <div className="trader-offers">
          {trader?.offers.map((puff) => {
            const traits = deriveTraits(puff.genes);
            const bought = trader.purchasedPuffId === puff.id;
            const title = `${traitValueLabel("sex", traits.sex)} · ${traitValueLabel("bodySize", traits.bodySize)}`;
            return <article className="trader-offer" key={puff.id} aria-label={title}>
              <h3>{title}</h3>
              <p>{traitValueLabel("bodyColor", traits.bodyColor)} coat</p>
              <p>{traitValueLabel("eyeColor", traits.eyeColor)} eyes · {traitValueLabel("earSize", traits.earSize)} ears</p>
              <p className="trader-grown">Grown · ready to breed</p>
              <button type="button" disabled={futureStock || !!trader.purchasedPuffId || releaseMode || gold < TRADER_PRICE}
                aria-label={bought ? `${title} bought` : `Buy ${title} for ${TRADER_PRICE}g`}
                onClick={() => {
                  const success = dispatch(buyTraderPuff(trader.day, puff.id));
                  setMessage(success ? `${title} joined your pasture. Close this window to see its journal and choose a pen.` : "The offer or your Gold changed. Please check the current choices.");
                }}>{bought ? "Bought today" : `Buy for ${TRADER_PRICE}g`}</button>
            </article>;
          })}
        </div>
        <p className="trader-footnote">Stock stays the same when you reopen or reload. New choices arrive at local midnight. Each bought Puff joins your herd's upkeep. Breeding and upkeep keep running while you browse.</p>
      </div>
    </dialog>
  </div>;
};
