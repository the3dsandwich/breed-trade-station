import { describe, it, expect } from "vitest";
import { pensReducer, pensSeeded, breedingProgressReset, type PensState } from "./pensSlice";
import { gameTick, gameTickCatchup } from "./clockSlice";
import { BREEDING_DURATION_MS } from "./breedingRules";

const seeded = (capacity: number, occupantCount: number): PensState => {
  const state = pensReducer(undefined, pensSeeded([{ id: "pen-1", name: "Pen 1", capacity }]));
  return {
    ...state,
    byId: {
      ...state.byId,
      "pen-1": {
        ...state.byId["pen-1"],
        occupantIds: Array.from({ length: occupantCount }, (_, i) => `puff-${i}`),
      },
    },
  };
};

describe("pensSlice breeding progress", () => {
  it("seeds pens with zero breeding progress", () => {
    const state = pensReducer(undefined, pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    expect(state.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("does not advance progress with fewer than 2 occupants", () => {
    const state = seeded(4, 1);
    const next = pensReducer(state, gameTick({ delta: 1000 }));
    expect(next.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("advances progress when eligible", () => {
    const state = seeded(4, 2);
    const next = pensReducer(state, gameTick({ delta: 1000 }));
    expect(next.byId["pen-1"].breedingProgress).toBe(1000);
  });

  it("does not advance progress once the pen is full", () => {
    const state = seeded(2, 2);
    const next = pensReducer(state, gameTick({ delta: 1000 }));
    expect(next.byId["pen-1"].breedingProgress).toBe(0);
  });

  it("clamps progress at the breeding duration instead of growing unbounded", () => {
    const state = seeded(4, 2);
    const next = pensReducer(state, gameTick({ delta: BREEDING_DURATION_MS * 5 }));
    expect(next.byId["pen-1"].breedingProgress).toBe(BREEDING_DURATION_MS);
  });

  it("advances progress on offline catchup too", () => {
    const state = seeded(4, 2);
    const next = pensReducer(state, gameTickCatchup({ elapsed: 2000 }));
    expect(next.byId["pen-1"].breedingProgress).toBe(2000);
  });

  it("resets progress to 0 via breedingProgressReset", () => {
    const state = seeded(4, 2);
    const advanced = pensReducer(state, gameTick({ delta: 5000 }));
    const reset = pensReducer(advanced, breedingProgressReset({ penId: "pen-1" }));
    expect(reset.byId["pen-1"].breedingProgress).toBe(0);
  });
});
