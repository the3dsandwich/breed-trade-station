import { deriveTraits, type Puff, type PuffId } from "@bts/shared";
import { isPuffReadyToBreed } from "./store/breedingRules";

export const getGrownParentCounts = (occupantIds: PuffId[], puffs: Record<PuffId, Puff>, gameTime: number) => {
  let males = 0;
  let females = 0;
  for (const id of occupantIds) {
    const puff = puffs[id];
    if (!puff || !isPuffReadyToBreed(puff, gameTime)) continue;
    if (deriveTraits(puff.genes).sex === "M") males++;
    else females++;
  }
  return { males, females };
};
