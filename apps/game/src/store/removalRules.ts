import { deriveTraits, type Puff, type PuffId } from "@bts/shared";

type Herd = Record<PuffId, Puff>;

export const hasBreedingPair = (herd: Herd): boolean => {
  const sexes = new Set(Object.values(herd).map((puff) => deriveTraits(puff.genes).sex));
  return sexes.has("M") && sexes.has("F");
};

// Protect the last Puff of either sex, including in older, already stuck saves.
export const removalBlockedReason = (herd: Herd, ids: PuffId[]): string | null => {
  const removed = new Set(ids);
  for (const sex of ["M", "F"] as const) {
    const sameSex = Object.values(herd).filter((puff) => deriveTraits(puff.genes).sex === sex);
    if (sameSex.length > 0 && sameSex.every((puff) => removed.has(puff.id))) {
      return `Keep at least one ${sex === "M" ? "male" : "female"} Puff so you can keep breeding.`;
    }
  }
  return null;
};
