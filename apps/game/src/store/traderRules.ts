import { createAction } from "@reduxjs/toolkit";
import { randomGenes, type GeneArray, type Puff } from "@bts/shared";
import { createLocalId } from "./id";

export const TRADER_PRICE = 15;

export interface TraderStock {
  day: string;
  offers: Puff[];
  purchasedPuffId?: string;
}

// Local calendar day, not elapsed play time or a UTC date. Fixed-width parts
// let refresh compare days without depending on the browser's date locale.
export const localTraderDay = (now: number): string => {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const createTraderStock = (now: number): TraderStock => {
  const sizes: [GeneArray[0], GeneArray[1], GeneArray[2]][] = [[2, 2, 1], [1, 0, 0], [1, 1, 1]];
  return {
    day: localTraderDay(now),
    offers: sizes.map((size, index) => {
      const genes = randomGenes();
      [genes[0], genes[1], genes[2]] = size;
      // Guaranteed useful choices: a large female and a small male. The
      // medium Puff's sex and all other traits are random and stay saved.
      if (index < 2) genes[9] = index === 0 ? 0 : 1;
      return { id: createLocalId(), genes, bornAt: now, matured: true };
    }),
  };
};

// One event updates Gold, stock, the herd and selection together. The public
// purchase thunk validates the current state before dispatching this event.
export const traderPurchaseCompleted = createAction<{ day: string; puff: Puff }>("trader/purchaseCompleted");
