import { Stage } from "@pixi/react";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CANVAS_BG = 0x1a1a2e;

export const GameCanvas = () => (
  <Stage
    width={CANVAS_WIDTH}
    height={CANVAS_HEIGHT}
    options={{ background: CANVAS_BG, antialias: true }}
  />
);
