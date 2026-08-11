import { Graphics, Text, useTick } from "@pixi/react";
import { useCallback, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import type { Pen } from "../store/pensSlice";

const FILL_COLOR = 0x333333; // dimgray
const BORDER_COLOR = 0x808080; // gray
const INNER_BORDER_COLOR = 0x555555;
const HEADER_COLOR = 0x111111;
const HIGHLIGHT_COLOR = 0xf5d76e; // accent, not a background -- left as-is
const CORNER_RADIUS = 14;
const HEADER_HEIGHT = 28;

interface PenViewProps {
  pen: Pen;
  x: number;
  y: number;
  width: number;
  height: number;
  highlighted?: boolean;
  onClick?: () => void;
}

export const PenView = ({ pen, x, y, width, height, highlighted = false, onClick }: PenViewProps) => {
  const [pulse, setPulse] = useState(0);
  const elapsed = useRef(0);

  useTick((delta) => {
    elapsed.current += delta;
    setPulse(Math.sin(elapsed.current * 0.08) * 0.5 + 0.5);
  }, highlighted);

  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle(2, BORDER_COLOR, 1);
      g.beginFill(FILL_COLOR, 0.6);
      g.drawRoundedRect(0, 0, width, height, CORNER_RADIUS);
      g.endFill();

      g.lineStyle(1, INNER_BORDER_COLOR, 0.9);
      g.drawRoundedRect(4, 4, width - 8, height - 8, CORNER_RADIUS - 4);

      g.lineStyle(0);
      g.beginFill(HEADER_COLOR, 0.55);
      g.drawRoundedRect(4, 4, width - 8, HEADER_HEIGHT, 10);
      g.endFill();
    },
    [width, height]
  );

  const drawHighlight = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle(3, HIGHLIGHT_COLOR, 1);
      g.drawRoundedRect(0, 0, width, height, CORNER_RADIUS);
    },
    [width, height]
  );

  const handlePointerTap = useCallback(
    (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      onClick?.();
    },
    [onClick]
  );

  const labelStyle = useMemo(
    () => new PIXI.TextStyle({ fill: 0xf0f0f0, fontSize: 14, fontWeight: "600" }),
    []
  );

  return (
    <>
      <Graphics
        x={x}
        y={y}
        draw={draw}
        interactive={Boolean(onClick)}
        cursor="pointer"
        pointertap={handlePointerTap}
      />
      {highlighted && (
        <Graphics x={x} y={y} draw={drawHighlight} alpha={0.5 + pulse * 0.5} />
      )}
      <Text
        x={x + 14}
        y={y + 12}
        text={`${pen.name} (${pen.occupantIds.length}/${pen.capacity})`}
        style={labelStyle}
      />
    </>
  );
};
