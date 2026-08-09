import { Graphics } from "@pixi/react";
import { useCallback } from "react";
import type * as PIXI from "pixi.js";
import { deriveTraits, type Puff } from "@bts/shared";

const BODY_COLOR_HEX: Record<string, number> = {
  BL: 0x2b2b2b,
  MX: 0x8a5a3c,
  WH: 0xf2f2f2,
};

const EYE_COLOR_HEX: Record<string, number> = {
  RD: 0xd94f4f,
  BR: 0x4a2e1a,
};

const BODY_SIZE_RADIUS: Record<string, number> = {
  XS: 10,
  S: 14,
  M: 18,
  L: 22,
  XL: 26,
};

const EAR_SIZE_RADIUS: Record<string, number> = {
  S: 4,
  M: 6,
  L: 8,
};

interface PuffSpriteProps {
  puff: Puff;
  x: number;
  y: number;
}

export const PuffSprite = ({ puff, x, y }: PuffSpriteProps) => {
  const traits = deriveTraits(puff.genes);
  const radius = BODY_SIZE_RADIUS[traits.bodySize];
  const earRadius = EAR_SIZE_RADIUS[traits.earSize];
  const bodyColor = BODY_COLOR_HEX[traits.bodyColor];
  const eyeColor = EYE_COLOR_HEX[traits.eyeColor];

  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();

      g.beginFill(bodyColor);
      g.drawCircle(-radius * 0.6, -radius * 0.7, earRadius);
      g.drawCircle(radius * 0.6, -radius * 0.7, earRadius);
      g.endFill();

      g.lineStyle(2, 0x000000, 0.25);
      g.beginFill(bodyColor);
      g.drawCircle(0, 0, radius);
      g.endFill();

      g.lineStyle(0);
      g.beginFill(eyeColor);
      g.drawCircle(-radius * 0.35, -radius * 0.1, radius * 0.15);
      g.drawCircle(radius * 0.35, -radius * 0.1, radius * 0.15);
      g.endFill();
    },
    [bodyColor, eyeColor, radius, earRadius]
  );

  return <Graphics x={x} y={y} draw={draw} />;
};
