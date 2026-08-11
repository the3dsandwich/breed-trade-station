import { deriveTraits, type Sex } from "@bts/shared";
import { useAppSelector } from "./store/hooks";
import "./PuffInspector.css";

const SEX_DISPLAY: Record<Sex, { label: string; symbol: string; className: string }> = {
  M: { label: "Male", symbol: "♂", className: "puff-inspector-sex-male" },
  F: { label: "Female", symbol: "♀", className: "puff-inspector-sex-female" },
};

// Plain React DOM, outside the PixiJS canvas -- reads the same Redux
// store as GameCanvas via the normal Provider, not the ContextBridge.
export const PuffInspector = () => {
  const selectedPuffId = useAppSelector((state) => state.selection.selectedPuffId);
  const puff = useAppSelector((state) =>
    selectedPuffId ? state.puffs.byId[selectedPuffId] : undefined
  );

  if (!puff) {
    return (
      <aside className="puff-inspector puff-inspector-empty">
        <p>Select a Puff to see its details.</p>
      </aside>
    );
  }

  const traits = deriveTraits(puff.genes);
  const sex = SEX_DISPLAY[traits.sex];

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
      <p className="puff-inspector-id">{puff.id}</p>
    </aside>
  );
};
