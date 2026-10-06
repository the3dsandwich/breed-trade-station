import type { Puff, PuffId } from "@bts/shared";
import { getGrownParentCounts } from "./parentSummary";

export const PenParentSummary = ({ occupantIds, puffs, gameTime }: {
  occupantIds: PuffId[];
  puffs: Record<PuffId, Puff>;
  gameTime: number;
}) => {
  const { males, females } = getGrownParentCounts(occupantIds, puffs, gameTime);
  return <div className="pen-parent-summary">
    <p className="pen-occupants-help">Grown: {males} {males === 1 ? "male" : "males"} · {females} {females === 1 ? "female" : "females"}</p>
    {males > 0 && females > 0 && (males > 1 || females > 1) &&
      <p className="pen-occupants-help">With room for a baby, any grown male and female here can become parents.</p>}
  </div>;
};
