import { describe, it, expect } from "vitest";
import { deriveTraits, createPuff, randomGenes } from "./puff";
import type { GeneArray } from "./puff";

describe("deriveTraits", () => {
  it("maps all-zero genes to minimum traits", () => {
    const genes: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const traits = deriveTraits(genes);
    expect(traits.bodySize).toBe("XS");
    expect(traits.eyeColor).toBe("RD");
    expect(traits.earSize).toBe("S");
    expect(traits.bodyColor).toBe("BL");
    expect(traits.sex).toBe("F");
  });

  it("maps all-two genes to maximum traits", () => {
    const genes: GeneArray = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    const traits = deriveTraits(genes);
    expect(traits.bodySize).toBe("XL");
    expect(traits.eyeColor).toBe("BR");
    expect(traits.earSize).toBe("L");
    expect(traits.bodyColor).toBe("WH");
    expect(traits.sex).toBe("M");
  });

  it("derives body size XS when sum is 0", () => {
    const genes: GeneArray = [0, 0, 0, 1, 0, 1, 0, 1, 0, 1];
    expect(deriveTraits(genes).bodySize).toBe("XS");
  });

  it("derives body size S when sum is 1", () => {
    const genes: GeneArray = [1, 0, 0, 1, 0, 1, 0, 1, 0, 1];
    expect(deriveTraits(genes).bodySize).toBe("S");
  });

  it("derives body size M when sum is 2, 3, or 4", () => {
    const g2: GeneArray = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    const g3: GeneArray = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
    const g4: GeneArray = [2, 1, 1, 0, 0, 0, 0, 0, 0, 0];
    expect(deriveTraits(g2).bodySize).toBe("M");
    expect(deriveTraits(g3).bodySize).toBe("M");
    expect(deriveTraits(g4).bodySize).toBe("M");
  });

  it("derives body size L when sum is 5", () => {
    const genes: GeneArray = [2, 2, 1, 0, 0, 0, 0, 0, 0, 0];
    expect(deriveTraits(genes).bodySize).toBe("L");
  });

  it("derives body size XL when sum is 6", () => {
    const genes: GeneArray = [2, 2, 2, 0, 0, 0, 0, 0, 0, 0];
    expect(deriveTraits(genes).bodySize).toBe("XL");
  });

  it("derives RD eye color when gene[3] is 0", () => {
    const genes: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(deriveTraits(genes).eyeColor).toBe("RD");
  });

  it("derives BR eye color when gene[3] is 1 or 2", () => {
    const g1: GeneArray = [0, 0, 0, 1, 0, 0, 0, 0, 0, 0];
    const g2: GeneArray = [0, 0, 0, 2, 0, 0, 0, 0, 0, 0];
    expect(deriveTraits(g1).eyeColor).toBe("BR");
    expect(deriveTraits(g2).eyeColor).toBe("BR");
  });

  it("derives ear size S when sum is 0", () => {
    const genes: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(deriveTraits(genes).earSize).toBe("S");
  });

  it("derives ear size L when sum is 4", () => {
    const genes: GeneArray = [0, 0, 0, 0, 0, 2, 2, 0, 0, 0];
    expect(deriveTraits(genes).earSize).toBe("L");
  });

  it("derives BL body color when sum is 0", () => {
    const genes: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(deriveTraits(genes).bodyColor).toBe("BL");
  });

  it("derives WH body color when sum is 4", () => {
    const genes: GeneArray = [0, 0, 0, 0, 0, 0, 0, 2, 2, 0];
    expect(deriveTraits(genes).bodyColor).toBe("WH");
  });

  it("derives MX body color when sum is 1, 2, or 3", () => {
    const g1: GeneArray = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0];
    const g3: GeneArray = [0, 0, 0, 0, 0, 0, 0, 2, 1, 0];
    expect(deriveTraits(g1).bodyColor).toBe("MX");
    expect(deriveTraits(g3).bodyColor).toBe("MX");
  });
});

describe("createPuff", () => {
  it("creates a puff with given id, genes and birthTime", () => {
    const genes: GeneArray = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const puff = createPuff("test-1", genes, 1000);
    expect(puff.id).toBe("test-1");
    expect(puff.genes).toBe(genes);
    expect(puff.bornAt).toBe(1000);
    expect(puff.matured).toBe(false);
  });
});

describe("randomGenes", () => {
  it("returns an array of 10 genes", () => {
    const genes = randomGenes();
    expect(genes).toHaveLength(10);
  });

  it("each gene is 0, 1, or 2", () => {
    const genes = randomGenes();
    genes.forEach((g) => expect([0, 1, 2]).toContain(g));
  });
});
