import { describe, it, expect } from "vitest";
import {
  selectionReducer,
  puffSelectionToggled,
  selectionCleared,
  releaseModeToggled,
  releaseBatchMembershipToggled,
  releaseBatchCleared,
} from "./selectionSlice";

describe("selectionSlice", () => {
  it("toggles single-puff selection on and off", () => {
    const selected = selectionReducer(undefined, puffSelectionToggled({ puffId: "p1" }));
    expect(selected.selectedPuffId).toBe("p1");

    const deselected = selectionReducer(selected, puffSelectionToggled({ puffId: "p1" }));
    expect(deselected.selectedPuffId).toBeNull();
  });

  it("selecting a different puff replaces the current selection", () => {
    const first = selectionReducer(undefined, puffSelectionToggled({ puffId: "p1" }));
    const second = selectionReducer(first, puffSelectionToggled({ puffId: "p2" }));
    expect(second.selectedPuffId).toBe("p2");
  });

  it("selectionCleared clears the selected puff", () => {
    const selected = selectionReducer(undefined, puffSelectionToggled({ puffId: "p1" }));
    expect(selectionReducer(selected, selectionCleared()).selectedPuffId).toBeNull();
  });

  it("toggling release mode on clears any existing batch", () => {
    const withBatch = selectionReducer(undefined, releaseBatchMembershipToggled({ puffId: "p1" }));
    const toggled = selectionReducer(withBatch, releaseModeToggled());
    expect(toggled.releaseModeActive).toBe(true);
    expect(toggled.releaseBatch).toEqual([]);
  });

  it("toggling release mode again turns it back off and clears the batch", () => {
    const on = selectionReducer(undefined, releaseModeToggled());
    const withBatch = selectionReducer(on, releaseBatchMembershipToggled({ puffId: "p1" }));
    const off = selectionReducer(withBatch, releaseModeToggled());
    expect(off.releaseModeActive).toBe(false);
    expect(off.releaseBatch).toEqual([]);
  });

  it("adds and removes puffs from the release batch", () => {
    const added = selectionReducer(undefined, releaseBatchMembershipToggled({ puffId: "p1" }));
    expect(added.releaseBatch).toEqual(["p1"]);

    const addedTwo = selectionReducer(added, releaseBatchMembershipToggled({ puffId: "p2" }));
    expect(addedTwo.releaseBatch).toEqual(["p1", "p2"]);

    const removedOne = selectionReducer(addedTwo, releaseBatchMembershipToggled({ puffId: "p1" }));
    expect(removedOne.releaseBatch).toEqual(["p2"]);
  });

  it("releaseBatchCleared empties the batch", () => {
    const withBatch = selectionReducer(undefined, releaseBatchMembershipToggled({ puffId: "p1" }));
    expect(selectionReducer(withBatch, releaseBatchCleared()).releaseBatch).toEqual([]);
  });
});
