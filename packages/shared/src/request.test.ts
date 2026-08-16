import { describe, it, expect } from "vitest";
import { calculateRequestReward, generateRequest, puffSatisfiesRequest } from "./request";
import { deriveTraits } from "./puff";
import type { GeneArray } from "./puff";
import type { TraitRequirement } from "./request";

describe("calculateRequestReward", () => {
  it("rewards a single common-trait request less than a single rare-trait request", () => {
    const common: TraitRequirement[] = [{ trait: "bodySize", value: "M" }];
    const rare: TraitRequirement[] = [{ trait: "bodySize", value: "XS" }];
    expect(calculateRequestReward(common)).toBeLessThan(calculateRequestReward(rare));
  });

  it("rewards more traits more than fewer traits", () => {
    const one: TraitRequirement[] = [{ trait: "bodySize", value: "M" }];
    const three: TraitRequirement[] = [
      { trait: "bodySize", value: "M" },
      { trait: "eyeColor", value: "RD" },
      { trait: "sex", value: "M" },
    ];
    expect(calculateRequestReward(three)).toBeGreaterThan(calculateRequestReward(one));
  });

  it("returns the base reward for an empty requirement list", () => {
    expect(calculateRequestReward([])).toBeGreaterThan(0);
  });
});

describe("generateRequest", () => {
  it("generates between 1 and 3 distinct trait requirements", () => {
    for (let i = 0; i < 50; i++) {
      const request = generateRequest(`req-${i}`);
      expect(request.requirements.length).toBeGreaterThanOrEqual(1);
      expect(request.requirements.length).toBeLessThanOrEqual(3);
      const traits = request.requirements.map((r) => r.trait);
      expect(new Set(traits).size).toBe(traits.length);
    }
  });

  it("sets reward consistent with calculateRequestReward for its own requirements", () => {
    const request = generateRequest("req-1");
    expect(request.reward).toBe(calculateRequestReward(request.requirements));
  });

  it("uses the given id", () => {
    expect(generateRequest("my-id").id).toBe("my-id");
  });
});

describe("puffSatisfiesRequest", () => {
  const allZero: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const traits = deriveTraits(allZero); // XS, RD, S, BL, F

  it("is satisfied when all requirements match", () => {
    const request = {
      id: "r1",
      requirements: [
        { trait: "bodySize", value: "XS" },
        { trait: "sex", value: "F" },
      ] as TraitRequirement[],
      reward: 10,
    };
    expect(puffSatisfiesRequest(traits, request)).toBe(true);
  });

  it("is not satisfied when any requirement mismatches", () => {
    const request = {
      id: "r2",
      requirements: [
        { trait: "bodySize", value: "XS" },
        { trait: "sex", value: "M" },
      ] as TraitRequirement[],
      reward: 10,
    };
    expect(puffSatisfiesRequest(traits, request)).toBe(false);
  });

  it("is trivially satisfied by an empty requirement list", () => {
    expect(puffSatisfiesRequest(traits, { id: "r3", requirements: [], reward: 5 })).toBe(true);
  });
});
