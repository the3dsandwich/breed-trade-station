// side-effect import: registers WebGL and Canvas renderers before Stage mounts
import "pixi.js";
import { Stage, Container } from "@pixi/react";
import { ReactReduxContext } from "react-redux";
import { useAppSelector } from "../store/hooks";
import { PuffSprite } from "./PuffSprite";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const COLS = 6;
const CELL_W = CANVAS_WIDTH / COLS;
const CELL_H = 100;

function PuffLayer() {
  const puffs = useAppSelector((s) => s.puffs.puffs);

  return (
    <Container>
      {puffs.map((puff, i) => (
        <PuffSprite
          key={puff.id}
          puff={puff}
          x={CELL_W * (i % COLS) + CELL_W / 2}
          y={CELL_H * Math.floor(i / COLS) + CELL_H / 2}
        />
      ))}
    </Container>
  );
}

export function GameCanvas() {
  return (
    <ReactReduxContext.Consumer>
      {(reduxContext) => (
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          options={{ background: 0x1a1a2e, antialias: true }}
        >
          <ReactReduxContext.Provider value={reduxContext}>
            <PuffLayer />
          </ReactReduxContext.Provider>
        </Stage>
      )}
    </ReactReduxContext.Consumer>
  );
}
