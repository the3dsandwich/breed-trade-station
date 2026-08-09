import { Stage } from "@pixi/react";
import { useAppSelector } from "../store/hooks";
import { PuffSprite } from "./PuffSprite";
import { ContextBridge } from "./ContextBridge";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CANVAS_BG = 0x1a1a2e;
const PUFF_MARGIN = 60;

// Puffs don't have a pen/layout system yet, so their on-screen position is
// derived deterministically from their id rather than tracked as state.
const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const positionFor = (id: string) => {
  const hash = hashString(id);
  return {
    x: PUFF_MARGIN + (hash % (CANVAS_WIDTH - PUFF_MARGIN * 2)),
    y: PUFF_MARGIN + ((hash * 7) % (CANVAS_HEIGHT - PUFF_MARGIN * 2)),
  };
};

export const GameCanvas = () => {
  const puffs = useAppSelector((state) => state.puffs.byId);

  return (
    <ContextBridge
      render={(children) => (
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          options={{ background: CANVAS_BG, antialias: true }}
        >
          {children}
        </Stage>
      )}
    >
      {Object.values(puffs).map((puff) => {
        const { x, y } = positionFor(puff.id);
        return <PuffSprite key={puff.id} puff={puff} x={x} y={y} />;
      })}
    </ContextBridge>
  );
};
