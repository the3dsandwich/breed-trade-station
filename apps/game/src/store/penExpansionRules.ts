import { createAction } from "@reduxjs/toolkit";
import type { Pen, PensState } from "./pensSlice";

export const MAX_PENS = 6;
export const MAX_PEN_CAPACITY = 8;
export const NEW_PEN_CAPACITY = 4;

export interface PenQuote {
  cost: number;
  blockedReason: string | null;
}

export const getNewPenQuote = (pens: PensState): PenQuote => ({
  cost: 25 * Math.max(1, pens.order.length - 1),
  blockedReason: pens.order.length >= MAX_PENS ? "Your ranch already has six pens." : null,
});

export const getExpansionQuote = (pen: Pen | undefined): PenQuote => {
  if (!pen || !Number.isInteger(pen.capacity) || pen.capacity < 3) {
    return { cost: 0, blockedReason: "This pen cannot be expanded." };
  }
  return {
    cost: 20 * Math.max(1, Math.ceil((pen.capacity - 2) / 2)),
    blockedReason: pen.capacity >= MAX_PEN_CAPACITY ? "This pen already has eight or more spaces." : null,
  };
};

// Each accepted purchase changes Gold and pens in a single store update.
// Only the purchase thunks dispatch these after validating a fresh quote.
export const penBuilt = createAction<{ cost: number; pen: Pen }>("penExpansion/built");
export const penExpanded = createAction<{ cost: number; penId: string; capacity: number }>("penExpansion/expanded");
