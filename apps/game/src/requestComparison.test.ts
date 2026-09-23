import { describe, it, expect } from "vitest";
import type { PuffTraits, Request } from "@bts/shared";
import { compareRequest } from "./requestComparison";
import { requestsReducer, requestsSeeded, requestReplaced } from "./store/requestsSlice";

const traits: PuffTraits = {
  bodySize: "XS",
  bodyColor: "MX",
  eyeColor: "RD",
  earSize: "L",
  sex: "F",
};

const request: Request = {
  id: "original",
  requirements: [
    { trait: "bodySize", value: "XS" },
    { trait: "bodyColor", value: "MX" },
    { trait: "sex", value: "F" },
  ],
  reward: 35,
};

 describe("compareRequest", () => {
  it("reports every required trait for a complete match in request order", () => {
    expect(compareRequest(traits, request)).toEqual([
      { trait: "bodySize", actualValue: "XS", actualLabel: "Extra small", matches: true },
      { trait: "bodyColor", actualValue: "MX", actualLabel: "Mixed", matches: true },
      { trait: "sex", actualValue: "F", actualLabel: "Female", matches: true },
    ]);
  });

  it("distinguishes matching traits from differences in a partial match", () => {
    const partial: Request = {
      ...request,
      requirements: [
        { trait: "eyeColor", value: "RD" },
        { trait: "earSize", value: "S" },
        { trait: "bodyColor", value: "WH" },
      ],
    };
    expect(compareRequest(traits, partial)).toEqual([
      { trait: "eyeColor", actualValue: "RD", actualLabel: "Red", matches: true },
      { trait: "earSize", actualValue: "L", actualLabel: "Large", matches: false },
      { trait: "bodyColor", actualValue: "MX", actualLabel: "Mixed", matches: false },
    ]);
  });

  it("reports zero matches and the selected Puff's actual readable values", () => {
    const different: Request = {
      ...request,
      requirements: [
        { trait: "bodySize", value: "XL" },
        { trait: "eyeColor", value: "BR" },
        { trait: "sex", value: "M" },
      ],
    };
    expect(compareRequest(traits, different)).toEqual([
      { trait: "bodySize", actualValue: "XS", actualLabel: "Extra small", matches: false },
      { trait: "eyeColor", actualValue: "RD", actualLabel: "Red", matches: false },
      { trait: "sex", actualValue: "F", actualLabel: "Female", matches: false },
    ]);
  });

  it("compares the replacement request's requirements in the same slot", () => {
    const seeded = requestsReducer(undefined, requestsSeeded([request]));
    expect(compareRequest(traits, seeded.byId[seeded.order[0]]).map((row) => row.matches))
      .toEqual([true, true, true]);

    const replacement: Request = {
      id: "replacement",
      requirements: [{ trait: "eyeColor", value: "BR" }],
      reward: 10,
    };
    const next = requestsReducer(seeded, requestReplaced({
      oldRequestId: request.id,
      newRequest: replacement,
    }));
    expect(next.order).toEqual([replacement.id]);
    expect(compareRequest(traits, next.byId[next.order[0]])).toEqual([
      { trait: "eyeColor", actualValue: "RD", actualLabel: "Red", matches: false },
    ]);
  });

  it("uses the newly selected Puff's traits without retaining earlier matches", () => {
    const otherTraits: PuffTraits = { ...traits, sex: "M" };
    expect(compareRequest(traits, request)[2].matches).toBe(true);
    expect(compareRequest(otherTraits, request)[2]).toEqual({
      trait: "sex", actualValue: "M", actualLabel: "Male", matches: false,
    });
    expect(compareRequest(traits, request)[2].matches).toBe(true);
  });
});
