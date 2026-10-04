const HEADER_RESERVED_HEIGHT = 40;

export const gridSlotInPen = (
  index: number,
  capacity: number,
  width: number,
  height: number
) => {
  const cols = Math.max(1, Math.ceil(Math.sqrt(capacity)));
  const rows = Math.max(1, Math.ceil(capacity / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cellWidth = width / cols;
  const cellHeight = (height - HEADER_RESERVED_HEIGHT) / rows;
  return {
    dx: cellWidth * (col + 0.5),
    dy: HEADER_RESERVED_HEIGHT + cellHeight * (row + 0.5),
  };
};


// Keep the original two-pen layout. Extra pens form new rows, and an
// eight-space pen gets enough height for three rows of full-size Puffs.
export const ranchLayout = (capacities: number[]) => {
  const pens: { x: number; y: number; width: number; height: number }[] = [];
  let y = 380;
  for (let i = 0; i < capacities.length; i += 2) {
    const largest = Math.max(...capacities.slice(i, i + 2));
    const height = largest > 6 ? 320 : largest > 4 ? 240 : 190;
    for (let column = 0; column < 2 && i + column < capacities.length; column++) {
      pens.push({ x: 40 + column * 380, y, width: 340, height });
    }
    y += height + 30;
  }
  return { pens, height: Math.max(600, y) };
};
