import { getExpansionQuote, getNewPenQuote, MAX_PEN_CAPACITY, NEW_PEN_CAPACITY, penBuilt, penExpanded } from "./penExpansionRules";
import type { AppDispatch, RootState } from "./store";

export const buildPen = (expectedCount: number, expectedCost: number) =>
  (dispatch: AppDispatch, getState: () => RootState): boolean => {
    const { pens, economy, selection } = getState();
    const quote = getNewPenQuote(pens);
    if (quote.blockedReason || pens.order.length !== expectedCount || quote.cost !== expectedCost ||
      !Number.isFinite(economy.gold) || economy.gold < quote.cost || selection.releaseModeActive) return false;
    let number = 1;
    while (pens.byId[`pen-${number}`] || pens.order.includes(`pen-${number}`)) number++;
    dispatch(penBuilt({ cost: quote.cost, pen: {
      id: `pen-${number}`, name: `Pen ${number}`, capacity: NEW_PEN_CAPACITY,
      occupantIds: [], breedingProgress: 0,
    } }));
    return true;
  };

export const expandPen = (penId: string, expectedCapacity: number, expectedCost: number) =>
  (dispatch: AppDispatch, getState: () => RootState): boolean => {
    const { pens, economy, selection } = getState();
    const pen = pens.byId[penId];
    const quote = getExpansionQuote(pen);
    if (!pen || quote.blockedReason || pen.capacity !== expectedCapacity || quote.cost !== expectedCost ||
      !Number.isFinite(economy.gold) || economy.gold < quote.cost || selection.releaseModeActive) return false;
    dispatch(penExpanded({ cost: quote.cost, penId, capacity: Math.min(pen.capacity + 2, MAX_PEN_CAPACITY) }));
    return true;
  };
