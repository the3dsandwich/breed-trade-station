import { describe, it, expect } from "vitest";
import { requestsReducer, requestsSeeded, requestReplaced } from "./requestsSlice";
import type { Request } from "@bts/shared";

const makeRequest = (id: string): Request => ({
  id,
  requirements: [{ trait: "bodySize", value: "M" }],
  reward: 10,
});

describe("requestsSlice", () => {
  it("seeds requests and preserves order", () => {
    const requests = [makeRequest("r1"), makeRequest("r2")];
    const state = requestsReducer(undefined, requestsSeeded(requests));
    expect(state.order).toEqual(["r1", "r2"]);
    expect(state.byId.r1).toEqual(requests[0]);
    expect(state.byId.r2).toEqual(requests[1]);
  });

  it("replaces a request in the same slot position", () => {
    const seeded = requestsReducer(
      undefined,
      requestsSeeded([makeRequest("r1"), makeRequest("r2"), makeRequest("r3")])
    );
    const newRequest = makeRequest("r4");
    const next = requestsReducer(seeded, requestReplaced({ oldRequestId: "r2", newRequest }));

    expect(next.order).toEqual(["r1", "r4", "r3"]);
    expect(next.byId.r2).toBeUndefined();
    expect(next.byId.r4).toEqual(newRequest);
  });
});
