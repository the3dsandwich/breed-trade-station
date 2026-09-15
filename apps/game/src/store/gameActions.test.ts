import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createPuff, type GeneArray, type Request } from "@bts/shared";
import { puffsReducer, puffBorn } from "./puffsSlice";
import { pensReducer, pensSeeded, puffAssignedToPen } from "./pensSlice";
import { economyReducer, STARTING_GOLD, RELEASE_REWARD } from "./economySlice";
import { requestsReducer, requestsSeeded } from "./requestsSlice";
import { selectionReducer, puffSelectionToggled } from "./selectionSlice";
import { releasePuffs, fulfillRequest } from "./gameActions";

const GENES: GeneArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const createTestStore = () =>
  configureStore({
    reducer: {
      puffs: puffsReducer,
      pens: pensReducer,
      economy: economyReducer,
      requests: requestsReducer,
      selection: selectionReducer,
    },
  });

const makeRequest = (id: string, reward: number): Request => ({
  id,
  requirements: [{ trait: "bodySize", value: "XS" }],
  reward,
});

describe("releasePuffs", () => {
  it("removes the Puff, unassigns it from its pen, and awards the flat reward", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(pensSeeded([{ id: "pen-1", name: "Pen 1", capacity: 4 }]));
    store.dispatch(puffAssignedToPen({ puffId: "p1", penId: "pen-1" }));

    store.dispatch(releasePuffs(["p1"]));

    const state = store.getState();
    expect(state.puffs.byId.p1).toBeUndefined();
    expect(state.pens.byId["pen-1"].occupantIds).toEqual([]);
    expect(state.economy.gold).toBe(STARTING_GOLD + RELEASE_REWARD);
  });

  it("awards the reward once per Puff for a batch", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(puffBorn(createPuff("p2", GENES, 0)));

    store.dispatch(releasePuffs(["p1", "p2"]));

    expect(store.getState().economy.gold).toBe(STARTING_GOLD + 2 * RELEASE_REWARD);
  });

  it("clears the current selection and release batch", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    store.dispatch(puffSelectionToggled({ puffId: "p1" }));

    store.dispatch(releasePuffs(["p1"]));

    expect(store.getState().selection.selectedPuffId).toBeNull();
    expect(store.getState().selection.releaseBatch).toEqual([]);
  });

  it("a duplicate invocation for an already-released Puff does not award gold again", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));

    store.dispatch(releasePuffs(["p1"]));
    const goldAfterFirst = store.getState().economy.gold;
    store.dispatch(releasePuffs(["p1"]));

    expect(store.getState().economy.gold).toBe(goldAfterFirst);
  });
});

describe("fulfillRequest", () => {
  it("removes the Puff, awards the request reward, and refills the slot", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    const request = makeRequest("r1", 25);
    store.dispatch(requestsSeeded([request]));

    store.dispatch(fulfillRequest("p1", request));

    const state = store.getState();
    expect(state.puffs.byId.p1).toBeUndefined();
    expect(state.economy.gold).toBe(STARTING_GOLD + 25);
    expect(state.requests.order).toHaveLength(1);
    expect(state.requests.byId.r1).toBeUndefined();
  });

  it("a duplicate invocation for an already-fulfilled request does not award gold twice or grow the request count", () => {
    const store = createTestStore();
    store.dispatch(puffBorn(createPuff("p1", GENES, 0)));
    const request = makeRequest("r1", 25);
    store.dispatch(requestsSeeded([request]));

    store.dispatch(fulfillRequest("p1", request));
    const goldAfterFirst = store.getState().economy.gold;
    const countAfterFirst = store.getState().requests.order.length;

    store.dispatch(fulfillRequest("p1", request));

    expect(store.getState().economy.gold).toBe(goldAfterFirst);
    expect(store.getState().requests.order).toHaveLength(countAfterFirst);
  });

  it("does nothing if the Puff no longer exists", () => {
    const store = createTestStore();
    const request = makeRequest("r1", 25);
    store.dispatch(requestsSeeded([request]));

    store.dispatch(fulfillRequest("nonexistent-puff", request));

    expect(store.getState().economy.gold).toBe(STARTING_GOLD);
    expect(store.getState().requests.byId.r1).toEqual(request);
  });
});
