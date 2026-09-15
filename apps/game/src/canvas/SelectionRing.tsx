import { Graphics, useTick } from "@pixi/react";
import { useCallback, useRef, useState } from "react";
import type * as PIXI from "pixi.js";

const DEFAULT_RING_COLOR = 0xf5d76e;

interface SelectionRingProps {
  radius: number;
  color?: number;
}

export const SelectionRing = ({ radius, color = DEFAULT_RING_COLOR }: SelectionRingProps) => {
  const [pulse, setPulse] = useState(0);
  const elapsed = useRef(0);

  useTick((delta) => {
    elapsed.current += delta;
    setPulse(Math.sin(elapsed.current * 0.1));
  });

  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle(2.5, color, 1);
      g.drawCircle(0, 0, radius);
    },
    [radius, color]
  );

  return <Graphics draw={draw} scale={1 + pulse * 0.06} alpha={0.65 + pulse * 0.35} />;
};
