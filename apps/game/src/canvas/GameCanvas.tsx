// side-effect import: registers WebGL and Canvas renderers before Stage mounts
import "pixi.js";
import { Stage } from "@pixi/react";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function GameCanvas() {
  return (
    <Stage
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      options={{ background: 0x1a1a2e, antialias: true }}
    />
  );
}
