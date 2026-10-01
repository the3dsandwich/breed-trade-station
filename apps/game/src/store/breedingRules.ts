import type { Puff } from "@bts/shared";

// Placeholder pending playtesting balance (see core-mechanics.md pen system deferrals).
export const BREEDING_DURATION_MS = 8000;

// A pen needs two occupants to have parents, and room for a third to hold
// the offspring -- breeding stops once a pen is full.
export const isBreedingEligible = (occupantCount: number, capacity: number): boolean =>
  occupantCount >= 2 && occupantCount < capacity;

// Newborns grow for one minute of game time, including offline catchup.
export const GROWTH_DURATION_MS = 60_000;

export const growthRemainingMs = (puff: Puff, gameTime: number): number =>
  Math.max(0, (puff.breedingReadyAt ?? gameTime) - gameTime);

export const isPuffReadyToBreed = (puff: Puff, gameTime: number): boolean =>
  growthRemainingMs(puff, gameTime) === 0;
