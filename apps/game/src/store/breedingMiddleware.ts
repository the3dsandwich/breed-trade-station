import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { createPuff, deriveTraits, meiosis, type Puff, type PuffId } from "@bts/shared";
import { createLocalId } from "./id";
import { gameTick, gameTickCatchup } from "./clockSlice";
import { puffBorn, birthRecorded } from "./puffsSlice";
import { puffAssignedToPen, breedingProgressReset, breedingProgressAdvanced } from "./pensSlice";
import { BREEDING_DURATION_MS, GROWTH_DURATION_MS, isBreedingEligible, isPuffReadyToBreed } from "./breedingRules";
import { STARVING_BREEDING_MULTIPLIER } from "./economySlice";
import type { RootState, AppDispatch } from "./store";

// A pen needs at least one M and one F occupant to breed; same-sex pens
// hold their progress at the cap until a compatible mate arrives.
const pickParents = (
  occupantIds: PuffId[],
  puffsById: Record<PuffId, Puff>,
  gameTime: number
): [Puff, Puff] | undefined => {
  const occupants = occupantIds.map((id) => puffsById[id]).filter((puff): puff is Puff => !!puff && isPuffReadyToBreed(puff, gameTime));
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
// effect credits only time when two occupants were ready to breed.
// One birth per pen per dispatch:
// a very long catchup gap only credits progress and fires at most one
// birth per pen, it does not simulate multiple breeding cycles.
startAppListening({
  matcher: isAnyOf(gameTick, gameTickCatchup),
  effect: (action, listenerApi) => {
    const rawDelta = gameTick.match(action) ? action.payload.delta : gameTickCatchup.match(action) ? action.payload.elapsed : 0;
    const state = listenerApi.getState();
    const multiplier = state.economy.gold <= 0 ? STARVING_BREEDING_MULTIPLIER : 1;

    for (const penId of state.pens.order) {
      const pen = state.pens.byId[penId];
      if (!isBreedingEligible(pen.occupantIds.length, pen.capacity)) continue;

      // Same-sex adults can still bank progress. Young occupants count toward
      // capacity, but do not start the clock or contribute to parent selection.
      const readyTimes = pen.occupantIds.flatMap((id) => {
        const puff = state.puffs.byId[id];
        return puff ? [puff.breedingReadyAt ?? -Infinity] : [];
      }).sort((a, b) => a - b);
      const secondReadyAt = readyTimes[1] ?? Infinity;
      const eligibleDelta = Math.max(0, Math.min(rawDelta, state.clock.gameTime - secondReadyAt));
      listenerApi.dispatch(breedingProgressAdvanced({ penId, amount: eligibleDelta * multiplier }));

      const updatedPen = listenerApi.getState().pens.byId[penId];
      if (updatedPen.breedingProgress < BREEDING_DURATION_MS) continue;

      const parents = pickParents(pen.occupantIds, state.puffs.byId, state.clock.gameTime);
      if (!parents) continue;

      const [parentA, parentB] = parents;
      const child: Puff = {
        ...createPuff(createLocalId(), meiosis(parentA.genes, parentB.genes), Date.now()),
        breedingReadyAt: state.clock.gameTime + GROWTH_DURATION_MS,
      };

      listenerApi.dispatch(puffBorn(child));
      // Record the parents actually chosen, not whoever happens to be in the pen
      // later. Visible traits remain readable even after these Puffs leave.
      listenerApi.dispatch(birthRecorded({
        child: { id: child.id, traits: deriveTraits(child.genes) },
        father: { id: parentA.id, traits: deriveTraits(parentA.genes) },
        mother: { id: parentB.id, traits: deriveTraits(parentB.genes) },
        penId,
        penName: pen.name,
        catchup: gameTickCatchup.match(action),
      }));
      listenerApi.dispatch(puffAssignedToPen({ puffId: child.id, penId }));
      listenerApi.dispatch(breedingProgressReset({ penId }));
    }
  },
});
