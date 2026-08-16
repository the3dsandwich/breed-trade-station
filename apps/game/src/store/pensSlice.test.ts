import { describe, it, expect } from "vitest";
import { pensReducer, pensSeeded, breedingProgressReset, breedingProgressAdvanced } from "./pensSlice";
import { BREEDING_DURATION_MS } from "./breedingRules";

// Eligibility gating (occupant count, capacity, sex pairing) now lives in
// breedingMiddleware, which is the only thing that dispatches
// breedingProgressAdvanced -- see breedingMiddleware.test.ts for that
// coverage. pensSlice itself just applies whatever amount it's given.

describe("pensSlice breeding progress", () => {
  it("seeds pens with zero breeding progress", () => {
    const state = pensReducer(undefined, pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    expect(state.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("advances progress by the given amount", () => {
    const seeded = pensReducer(undefined, pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    const next = pensReducer(seeded, breedingProgressAdvanced({ penId: "pen-1", amount: 1000 }));
    expect(next.byId["pen-1"].breedingProgress).toBe(1000);
  });

  it("clamps progress at the breeding duration instead of growing unbounded", () => {
    const seeded = pensReducer(undefined, pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    const next = pensReducer(
      seeded,
      breedingProgressAdvanced({ penId: "pen-1", amount: BREEDING_DURATION_MS * 5 })
    );
    expect(next.byId["pen-1"].breedingProgress).toBe(BREEDING_DURATION_MS);
  });

  it("resets progress to 0 via breedingProgressReset", () => {
    const seeded = pensReducer(undefined, pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    const advanced = pensReducer(seeded, breedingProgressAdvanced({ penId: "pen-1", amount: 5000 }));
    const reset = pensReducer(advanced, breedingProgressReset({ penId: "pen-1" }));
    expect(reset.byId["pen-1"].breedingProgress).toBe(0);
  });
});
