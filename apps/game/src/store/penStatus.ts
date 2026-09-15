import { deriveTraits, type Puff, type PuffId } from "@bts/shared";
import type { Pen } from "./pensSlice";
import { BREEDING_DURATION_MS } from "./breedingRules";
import { STARVING_BREEDING_MULTIPLIER } from "./economySlice";

export const getPenStatus = (pen: Pen, puffs: Record<PuffId, Puff>, gold: number) => {
  if (pen.occupantIds.length >= pen.capacity) {
    return { text: "Pen full. Move or release a Puff to make room for a baby." };
  }
  const sexes = pen.occupantIds.flatMap((id) => puffs[id] ? [deriveTraits(puffs[id].genes).sex] : []);
  if (!sexes.length) return { text: "Add a male and a female to start breeding." };
  if (!sexes.includes("M")) return { text: "Add a male to start breeding." };
  if (!sexes.includes("F")) return { text: "Add a female to start breeding." };
  const progress = Math.max(0, Math.min(pen.breedingProgress ?? 0, BREEDING_DURATION_MS));
  const rate = gold <= 0 ? STARVING_BREEDING_MULTIPLIER : 1;
  const seconds = Math.ceil((BREEDING_DURATION_MS - progress) / rate / 1000);
  return {
    text: seconds === 0 ? "Baby due on the next tick." : `Baby in about ${seconds}s.${gold <= 0 ? " Breeding is 3× faster at zero Gold." : ""}`,
    progress,
  };
};
