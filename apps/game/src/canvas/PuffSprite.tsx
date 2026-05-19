import { Graphics } from "@pixi/react";
import { Graphics as PixiGraphics } from "pixi.js";
import { useCallback } from "react";
import { Puff, deriveTraits } from "@bts/shared";

const BODY_COLOR_MAP: Record<string, number> = {
  BL: 0x444466,
  MX: 0x88aacc,
  WH: 0xe8e8ff,
};

interface PuffSpriteProps {
  puff: Puff;
  x: number;
  y: number;
}

export function PuffSprite({ puff, x, y }: PuffSpriteProps) {
  const traits = deriveTraits(puff.genes);
  const color = BODY_COLOR_MAP[traits.bodyColor] ?? 0xaaaaaa;
  const radius = traits.bodySize === "XS" ? 16
               : traits.bodySize === "S"  ? 20
               : traits.bodySize === "M"  ? 24
               : traits.bodySize === "L"  ? 28
               : 32;

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.beginFill(color, 1);
      g.drawCircle(0, 0, radius);
      g.endFill();
    },
    [color, radius]
  );

  return <Graphics draw={draw} x={x} y={y} />;
}
