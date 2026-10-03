import { useAppSelector } from "./store/hooks";
import "./GoldDisplay.css";
import { Trader } from "./Trader";
import { UPKEEP_INTERVAL_MS, UPKEEP_PER_PUFF } from "./store/economySlice";

export const GoldDisplay = () => {
  const gold = useAppSelector((state) => state.economy.gold);
  const starving = gold <= 0;
  const upkeep = useAppSelector((state) => state.economy.upkeepAccumulator ?? 0);
  const herdSize = useAppSelector((state) => Object.keys(state.puffs.byId).length);
  const seconds = Math.max(0, Math.ceil((UPKEEP_INTERVAL_MS - upkeep) / 1000));

  return (
    <div className="gold-display">
      <div className="gold-display-row">
        <span className="gold-display-label">Gold</span>
        <span className="gold-display-amount">{gold}g</span>
      </div>
      <p className="gold-upkeep">Upkeep: {herdSize * UPKEEP_PER_PUFF}g every {UPKEEP_INTERVAL_MS / 60_000} min<br />Next charge in {Math.floor(seconds / 60)}m {seconds % 60}s</p>
      {starving && (
        <p className="gold-display-starving">Puffs are starving — breeding faster to survive!</p>
      )}
      <Trader />
    </div>
  );
};
