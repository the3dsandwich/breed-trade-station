import type { PuffTraits, BodySize, EyeColor, EarSize, BodyColor, Sex } from "./puff";

export type TraitKey = keyof PuffTraits;

export interface TraitRequirement {
  trait: TraitKey;
  value: string;
}

export interface Request {
  id: string;
  requirements: TraitRequirement[];
  reward: number;
}

// Trait value pools, keyed by the same TraitKey used in TraitRequirement.
const TRAIT_VALUES: { [K in TraitKey]: PuffTraits[K][] } = {
  bodySize: ["XS", "S", "M", "L", "XL"] satisfies BodySize[],
  eyeColor: ["RD", "BR"] satisfies EyeColor[],
  earSize: ["S", "M", "L"] satisfies EarSize[],
  bodyColor: ["BL", "MX", "WH"] satisfies BodyColor[],
  sex: ["M", "F"] satisfies Sex[],
};

const TRAIT_KEYS = Object.keys(TRAIT_VALUES) as TraitKey[];

// Rarity weight per requested value: 1 = common, 2 = uncommon, 3 = rare,
// derived from the underlying gene-sum distribution in deriveTraits (e.g.
// bodySize XS/XL only come from a single gene combination out of 27,
// while M covers the bulk of the distribution). Placeholder tiers, not
// exact inverse-probability -- pending playtesting balance.
const RARITY_WEIGHT: { [K in TraitKey]: Record<string, number> } = {
  bodySize: { XS: 3, S: 2, M: 1, L: 2, XL: 3 },
  eyeColor: { RD: 2, BR: 1 },
  earSize: { S: 2, M: 1, L: 2 },
  bodyColor: { BL: 2, MX: 1, WH: 2 },
  sex: { F: 2, M: 1 },
};

// Placeholders pending playtesting balance (see core-mechanics.md Request System deferrals).
export const BASE_REQUEST_REWARD = 5;
export const PER_TRAIT_REWARD = 5;
export const MIN_REQUEST_TRAITS = 1;
export const MAX_REQUEST_TRAITS = 3;

export const calculateRequestReward = (requirements: TraitRequirement[]): number =>
  requirements.reduce(
    (total, req) => total + RARITY_WEIGHT[req.trait][req.value] * PER_TRAIT_REWARD,
    BASE_REQUEST_REWARD
  );

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

// Picks a random count of distinct traits (MIN..MAX) and a random value for
// each -- content is generated, not hand-authored (see core-mechanics.md).
export const generateRequest = (id: string): Request => {
  const traitCount =
    MIN_REQUEST_TRAITS + Math.floor(Math.random() * (MAX_REQUEST_TRAITS - MIN_REQUEST_TRAITS + 1));

  const shuffledKeys = [...TRAIT_KEYS].sort(() => Math.random() - 0.5);
  const requirements: TraitRequirement[] = shuffledKeys.slice(0, traitCount).map((trait) => ({
    trait,
    value: pickRandom(TRAIT_VALUES[trait]),
  }));

  return { id, requirements, reward: calculateRequestReward(requirements) };
};

export const puffSatisfiesRequest = (traits: PuffTraits, request: Request): boolean =>
  request.requirements.every((req) => traits[req.trait] === req.value);
