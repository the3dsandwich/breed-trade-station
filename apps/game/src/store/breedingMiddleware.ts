import { createListenerMiddleware } from "@reduxjs/toolkit";
import { createPuff, deriveTraits, meiosis, type Puff, type PuffId } from "@bts/shared";
import { createLocalId } from "./id";
import { gameTick } from "./clockSlice";
import { puffBorn } from "./puffsSlice";
import { puffAssignedToPen, breedingProgressReset } from "./pensSlice";
import type { RootState, AppDispatch } from "./store";

// Placeholder pending playtesting balance (see core-mechanics.md pen system deferrals).
const BREEDING_DURATION_MS = 8000;

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

breedingMiddleware.startListening({
  actionCreator: gameTick,
  effect: (_action, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const dispatch = listenerApi.dispatch as AppDispatch;

    for (const penId of state.pens.order) {
      const pen = state.pens.byId[penId];
      if (pen.breedingProgress < BREEDING_DURATION_MS) continue;
      if (pen.occupantIds.length < 2 || pen.occupantIds.length >= pen.capacity) continue;

      const parents = pickParents(pen.occupantIds, state.puffs.byId);
      if (!parents) continue;

      const [parentA, parentB] = parents;
      const child = createPuff(createLocalId(), meiosis(parentA.genes, parentB.genes), Date.now());

      dispatch(puffBorn(child));
      dispatch(puffAssignedToPen({ puffId: child.id, penId }));
      dispatch(breedingProgressReset({ penId }));
    }
  },
});
