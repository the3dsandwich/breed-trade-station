import { useAppSelector } from "./store/hooks";
import { hasBreedingPair } from "./store/removalRules";
import { confirmRestartGame } from "./store/restartGame";

export const HerdRecovery = () => {
  const canBreed = useAppSelector((state) => hasBreedingPair(state.puffs.byId));
  if (canBreed) return null;
  return (
    <section aria-label="Start over" className="puff-inspector">
      <p>Your herd needs a male and a female to breed. This saved game is missing a breeding pair.</p>
      <p>You can start a new game. This clears all your Puffs, Gold, pens, and requests.</p>
      <button onClick={confirmRestartGame}>Start a new game</button>
    </section>
  );
};
