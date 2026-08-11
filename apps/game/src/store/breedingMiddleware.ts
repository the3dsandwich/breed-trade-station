import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { createPuff, deriveTraits, meiosis, type Puff, type PuffId } from "@bts/shared";
import { createLocalId } from "./id";
import { gameTick, gameTickCatchup } from "./clockSlice";
import { puffBorn } from "./puffsSlice";
import { puffAssignedToPen, breedingProgressReset } from "./pensSlice";
import { BREEDING_DURATION_MS, isBreedingEligible } from "./breedingRules";
import type { RootState, AppDispatch } from "./store";

// A pen needs at least one M and one F occupant to breed; same-sex pens
// hold their progress at the cap until a compatible mate arrives.
const pickParents = (
  occupantIds: PuffId[],
  puffsById: Record<PuffId, Puff>
): [Puff, Puff] | undefined => {
  const occupants = occupantIds.map((id) => puffsById[id]).filter((puff): puff is Puff => !!puff);
  const males = occupants.filter((puff) => deriveTraits(puff.genes).sex === "M");
  const females = occupants.filter((puff) => deriveTraits(puff.genes).sex === "F");
  if (males.length === 0 || females.length === 0) return undefined;

  const male = males[Math.floor(Math.random() * males.length)];
  const female = females[Math.floor(Math.random() * females.length)];
  return [male, female];
};

export const breedingMiddleware = createListenerMiddleware();
const startAppListening = breedingMiddleware.startListening.withTypes<RootState, AppDispatch>();

// Listens for both the regular tick and offline-catchup actions -- the
// eligibility check only reads current state, so the same effect handles
// both without caring which one fired it. One birth per pen per dispatch:
// a very long catchup gap only credits progress and fires at most one
// birth per pen, it does not simulate multiple breeding cycles.
startAppListening({
  matcher: isAnyOf(gameTick, gameTickCatchup),
  effect: (_action, listenerApi) => {
    const state = listenerApi.getState();

    for (const penId of state.pens.order) {
      const pen = state.pens.byId[penId];
      if (pen.breedingProgress < BREEDING_DURATION_MS) continue;
      if (!isBreedingEligible(pen.occupantIds.length, pen.capacity)) continue;

      const parents = pickParents(pen.occupantIds, state.puffs.byId);
      if (!parents) continue;

      const [parentA, parentB] = parents;
      const child = createPuff(createLocalId(), meiosis(parentA.genes, parentB.genes), Date.now());

      listenerApi.dispatch(puffBorn(child));
      listenerApi.dispatch(puffAssignedToPen({ puffId: child.id, penId }));
      listenerApi.dispatch(breedingProgressReset({ penId }));
    }
  },
});
