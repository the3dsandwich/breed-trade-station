import type { PuffTraits, TraitKey } from "@bts/shared";

export const TRAIT_LABELS: Record<TraitKey, string> = {
  bodySize: "Body size",
  bodyColor: "Body color",
  eyeColor: "Eye color",
  earSize: "Ear size",
  sex: "Sex",
};

const VALUE_LABELS: { [K in TraitKey]: Record<PuffTraits[K], string> } = {
  bodySize: { XS: "Extra small", S: "Small", M: "Medium", L: "Large", XL: "Extra large" },
  bodyColor: { BL: "Black", MX: "Mixed", WH: "White" },
  eyeColor: { RD: "Red", BR: "Brown" },
  earSize: { S: "Small", M: "Medium", L: "Large" },
  sex: { M: "Male", F: "Female" },
};

export const traitValueLabel = (trait: TraitKey, value: string): string =>
  (VALUE_LABELS[trait] as Record<string, string>)[value] ?? "Unknown";
