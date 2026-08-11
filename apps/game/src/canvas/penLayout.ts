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
