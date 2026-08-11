// Placeholder pending playtesting balance (see core-mechanics.md pen system deferrals).
export const BREEDING_DURATION_MS = 8000;

// A pen needs two occupants to have parents, and room for a third to hold
// the offspring -- breeding stops once a pen is full.
export const isBreedingEligible = (occupantCount: number, capacity: number): boolean =>
  occupantCount >= 2 && occupantCount < capacity;
