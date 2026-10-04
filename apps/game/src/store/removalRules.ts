import { deriveTraits, type Puff, type PuffId } from "@bts/shared";

type Herd = Record<PuffId, Puff>;

export const hasBreedingPair = (herd: Herd): boolean => {
  const sexes = new Set(Object.values(herd).map((puff) => deriveTraits(puff.genes).sex));
  return sexes.has("M") && sexes.has("F");
};

// Keepers block the whole removal first. Last-sex protection still applies
// after a keeper is unmarked, including in older, already stuck saves.
export const removalBlockedReason = (herd: Herd, ids: PuffId[], keeperIds: PuffId[] = []): string | null => {
  const removed = new Set(ids);
  if (keeperIds.some((id) => herd[id] && removed.has(id))) {
    return "This selection includes a keeper. Turn off Keep this Puff in its journal before selling or releasing it.";
  }
  for (const sex of ["M", "F"] as const) {
    const sameSex = Object.values(herd).filter((puff) => deriveTraits(puff.genes).sex === sex);
    if (sameSex.length > 0 && sameSex.every((puff) => removed.has(puff.id))) {
      return `Keep at least one ${sex === "M" ? "male" : "female"} Puff so you can keep breeding.`;
    }
  }
  return null;
};
