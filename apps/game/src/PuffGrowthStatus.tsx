import type { Puff } from "@bts/shared";
import { useAppSelector } from "./store/hooks";
import { growthRemainingMs } from "./store/breedingRules";

export const PuffGrowthStatus = ({ puff }: { puff: Puff }) => {
  const gameTime = useAppSelector((state) => state.clock.gameTime);
  const remaining = growthRemainingMs(puff, gameTime);
  // Plain text: don't announce a changing countdown every second.
  return <span className="puff-growth-status">{remaining > 0
    ? `Young · can breed in about ${Math.ceil(remaining / 1000)}s`
    : "Grown · ready to breed"}</span>;
};
