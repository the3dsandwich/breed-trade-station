// GENE ENCODING: 0 = aa (homozygous recessive), 1 = Aa (heterozygous), 2 = AA (homozygous dominant)
// Indices: [0][1][2] body size, [3] eye color, [4] reserved, [5][6] ear size, [7][8] body color, [9] sex
export type Gene = 0 | 1 | 2;
export type GeneArray = [Gene, Gene, Gene, Gene, Gene, Gene, Gene, Gene, Gene, Gene];

export type PuffId = string;

export interface Puff {
  id: PuffId;
  genes: GeneArray;
  bornAt: number;
  matured: boolean;
}

export type BodySize = "XS" | "S" | "M" | "L" | "XL";
export type EyeColor = "RD" | "BR";
export type EarSize = "S" | "M" | "L";
export type BodyColor = "BL" | "MX" | "WH";
export type Sex = "M" | "F";

export interface PuffTraits {
  bodySize: BodySize;
  eyeColor: EyeColor;
  earSize: EarSize;
  bodyColor: BodyColor;
  sex: Sex;
}

export function deriveTraits(genes: GeneArray): PuffTraits {
  const bodySizeSum = genes[0] + genes[1] + genes[2];
  const earSizeSum = genes[5] + genes[6];
  const bodyColorSum = genes[7] + genes[8];

  return {
    bodySize: bodySizeSum === 0 ? "XS"
            : bodySizeSum === 1 ? "S"
            : bodySizeSum <= 4  ? "M"
            : bodySizeSum === 5 ? "L"
            : "XL",
    eyeColor: genes[3] === 0 ? "RD" : "BR",
    earSize: earSizeSum === 0 ? "S" : earSizeSum <= 3 ? "M" : "L",
    bodyColor: bodyColorSum === 0 ? "BL" : bodyColorSum <= 3 ? "MX" : "WH",
    sex: genes[9] === 0 ? "F" : "M",
  };
}

export function createPuff(id: PuffId, genes: GeneArray, bornAt: number): Puff {
  return { id, genes, bornAt, matured: false };
}

export function randomGenes(): GeneArray {
  const gene = () => (Math.floor(Math.random() * 3)) as Gene;
  return [gene(), gene(), gene(), gene(), gene(), gene(), gene(), gene(), gene(), gene()];
}
