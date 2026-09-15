import { describe, it, expect } from "vitest";
import { economyReducer, goldAdjusted, upkeepAccumulatorAdvanced, STARTING_GOLD } from "./economySlice";

describe("economySlice", () => {
  it("starts with the starting gold balance and zero upkeep accumulator", () => {
    const state = economyReducer(undefined, { type: "@@INIT" });
    expect(state.gold).toBe(STARTING_GOLD);
    expect(state.upkeepAccumulator).toBe(0);
  });

  it("adds gold", () => {
    const state = economyReducer(undefined, goldAdjusted({ amount: 10 }));
    expect(state.gold).toBe(STARTING_GOLD + 10);
  });

  it("subtracts gold", () => {
    const state = economyReducer(undefined, goldAdjusted({ amount: -10 }));
    expect(state.gold).toBe(STARTING_GOLD - 10);
  });

  it("clamps gold at zero -- never goes negative", () => {
    const state = economyReducer(undefined, goldAdjusted({ amount: -(STARTING_GOLD + 100) }));
    expect(state.gold).toBe(0);
  });

  it("advances the upkeep accumulator", () => {
    const state = economyReducer(undefined, upkeepAccumulatorAdvanced({ delta: 1000 }));
    expect(state.upkeepAccumulator).toBe(1000);
  });

  it("can advance the upkeep accumulator by a negative delta (used to subtract elapsed intervals)", () => {
    const advanced = economyReducer(undefined, upkeepAccumulatorAdvanced({ delta: 1000 }));
    const reduced = economyReducer(advanced, upkeepAccumulatorAdvanced({ delta: -400 }));
    expect(reduced.upkeepAccumulator).toBe(600);
  });
});
