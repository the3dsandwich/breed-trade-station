import { Container, Graphics, useTick } from "@pixi/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type * as PIXI from "pixi.js";
import { deriveTraits, type Puff } from "@bts/shared";
import { SelectionRing } from "./SelectionRing";

const BODY_COLOR_HEX: Record<string, number> = {
  BL: 0x3a3a4a,
  MX: 0x9a6a48,
  WH: 0xf5f0e8,
};

const BODY_HIGHLIGHT_HEX: Record<string, number> = {
  BL: 0x5c5c78,
  MX: 0xc79363,
  WH: 0xffffff,
};

const EYE_COLOR_HEX: Record<string, number> = {
  RD: 0xe8695f,
  BR: 0x5a3a22,
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

// Gives each Puff a stable-but-different animation phase so a group of
// them doesn't bob/breathe in unison.
const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

interface PuffSpriteProps {
  puff: Puff;
  x: number;
  y: number;
  selected?: boolean;
  onSelect?: () => void;
}

export const PuffSprite = ({ puff, x, y, selected = false, onSelect }: PuffSpriteProps) => {
  const traits = deriveTraits(puff.genes);
  const radius = BODY_SIZE_RADIUS[traits.bodySize];
  const earRadius = EAR_SIZE_RADIUS[traits.earSize];
  const bodyColor = BODY_COLOR_HEX[traits.bodyColor];
  const highlightColor = BODY_HIGHLIGHT_HEX[traits.bodyColor];
  const eyeColor = EYE_COLOR_HEX[traits.eyeColor];

  const phase = useMemo(() => ((hashString(puff.id) % 1000) / 1000) * Math.PI * 2, [puff.id]);
  const elapsed = useRef(phase * 10);
  const [bobY, setBobY] = useState(0);
  const [breathScale, setBreathScale] = useState(1);

  useTick((delta) => {
    elapsed.current += delta;
    setBobY(Math.sin(elapsed.current * 0.05 + phase) * 3);
    setBreathScale(1 + Math.sin(elapsed.current * 0.04 + phase) * 0.03);
  });

  const drawShadow = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.beginFill(0x000000, 0.25);
      g.drawEllipse(0, radius * 0.85, radius * 0.75, radius * 0.25);
      g.endFill();
    },
    [radius]
  );

  const drawBody = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();

      g.beginFill(bodyColor);
      g.drawCircle(-radius * 0.6, -radius * 0.7, earRadius);
      g.drawCircle(radius * 0.6, -radius * 0.7, earRadius);
      g.endFill();

      g.lineStyle(1.5, 0x000000, 0.2);
      g.beginFill(bodyColor);
      g.drawCircle(0, 0, radius);
      g.endFill();

      g.lineStyle(0);
      g.beginFill(highlightColor, 0.35);
      g.drawEllipse(-radius * 0.3, -radius * 0.35, radius * 0.45, radius * 0.3);
      g.endFill();

      g.beginFill(eyeColor);
      g.drawCircle(-radius * 0.35, -radius * 0.1, radius * 0.15);
      g.drawCircle(radius * 0.35, -radius * 0.1, radius * 0.15);
      g.endFill();

      g.beginFill(0xffffff, 0.85);
      g.drawCircle(-radius * 0.3, -radius * 0.15, radius * 0.05);
      g.drawCircle(radius * 0.4, -radius * 0.15, radius * 0.05);
      g.endFill();
    },
    [bodyColor, highlightColor, eyeColor, radius, earRadius]
  );

  const handlePointerTap = useCallback(
    (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      onSelect?.();
    },
    [onSelect]
  );

  return (
    <Container x={x} y={y}>
      <Graphics draw={drawShadow} />
      <Graphics
        y={bobY}
        scale={breathScale}
        draw={drawBody}
        interactive={Boolean(onSelect)}
        cursor="pointer"
        pointertap={handlePointerTap}
      />
      {selected && <SelectionRing radius={radius + 6} />}
    </Container>
  );
};
