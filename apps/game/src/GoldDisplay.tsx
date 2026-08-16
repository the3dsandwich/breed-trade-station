import { useAppSelector } from "./store/hooks";
import "./GoldDisplay.css";

export const GoldDisplay = () => {
  const gold = useAppSelector((state) => state.economy.gold);
  const starving = gold <= 0;

  return (
    <div className="gold-display">
      <div className="gold-display-row">
        <span className="gold-display-label">Gold</span>
        <span className="gold-display-amount">{gold}g</span>
      </div>
      {starving && (
        <p className="gold-display-starving">Puffs are starving — breeding faster to survive!</p>
      )}
    </div>
  );
};
