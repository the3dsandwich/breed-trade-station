import { traderStockRefreshed } from "./economySlice";
import { createTraderStock, localTraderDay, TRADER_PRICE, traderPurchaseCompleted } from "./traderRules";
import type { AppDispatch, RootState } from "./store";

export const refreshTraderStock = (now = Date.now()) => (dispatch: AppDispatch, getState: () => RootState): void => {
  const stock = getState().economy.trader;
  // A clock rollback must not grant another visit. A large gap grants only
  // the current day's three offers, with no bank of missed purchases.
  if (stock && stock.day >= localTraderDay(now)) return;
  dispatch(traderStockRefreshed(createTraderStock(now)));
};

export const buyTraderPuff = (day: string, puffId: string, now = Date.now()) =>
  (dispatch: AppDispatch, getState: () => RootState): boolean => {
    dispatch(refreshTraderStock(now));
    const { economy, puffs, selection } = getState();
    const stock = economy.trader;
    if (!stock || stock.day !== day || day !== localTraderDay(now) || stock.purchasedPuffId ||
      !Number.isFinite(economy.gold) || economy.gold < TRADER_PRICE || selection.releaseModeActive || puffs.byId[puffId]) return false;
    const puff = stock.offers.find((offer) => offer.id === puffId);
    if (!puff) return false;
    dispatch(traderPurchaseCompleted({ day, puff }));
    return true;
  };
