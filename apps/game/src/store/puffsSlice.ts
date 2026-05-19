import { createSlice } from "@reduxjs/toolkit";
import { Puff, createPuff, randomGenes } from "@bts/shared";

const INITIAL_PUFFS: Puff[] = Array.from({ length: 12 }, (_, i) =>
  createPuff(`puff-${i}`, randomGenes(), Date.now())
);

interface PuffsState {
  puffs: Puff[];
}

const initialState: PuffsState = {
  puffs: INITIAL_PUFFS,
};

export const puffsSlice = createSlice({
  name: "puffs",
  initialState,
  reducers: {},
});

export default puffsSlice.reducer;
