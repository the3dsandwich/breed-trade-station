import { Container, Graphics, useTick } from "@pixi/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as PIXI from "pixi.js";
import { deriveTraits, type Puff } from "@bts/shared";
import { SelectionRing } from "./SelectionRing";
import { BODY_RADIUS, drawPixels, puffHitArea, puffPixels, INK } from "./pixelPuff";
import { useReducedMotion } from "./useReducedMotion";

const MATCH_BADGE_HIT_AREA = new PIXI.Rectangle(-8, -8, 16, 16);

interface PuffSpriteProps {
  puff: Puff;
  x: number;
  y: number;
  selected?: boolean;
  releaseSelected?: boolean;
  matchesRequest?: boolean;
  onSelect?: () => void;
}

export const PuffSprite = ({ puff, x, y, selected = false, releaseSelected = false, matchesRequest = false, onSelect }: PuffSpriteProps) => {
  const traits = useMemo(() => deriveTraits(puff.genes), [puff.genes]);
  const radius = BODY_RADIUS[traits.bodySize];
  const reduced = useReducedMotion();
  const body = useRef<PIXI.Container>(null);
  const awake = useRef<PIXI.Graphics>(null);
  const asleep = useRef<PIXI.Graphics>(null);
  const phase = useMemo(() => [...puff.id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % 420, [puff.id]);
  const elapsed = useRef(0);
  const hitArea = useMemo(() => puffHitArea(traits), [traits]);

  useEffect(() => {
    if (body.current) body.current.y = 0;
    if (awake.current) awake.current.visible = true;
    if (asleep.current) asleep.current.visible = false;
  }, [reduced]);

  useTick((delta) => {
    if (reduced) return;
    elapsed.current += delta;
    const time = (elapsed.current + phase) % 420;
    if (body.current) body.current.y = time > 80 && time < 106 ? -2 : 0;
    const blink = time > 280 && time < 289;
    if (awake.current) awake.current.visible = !blink;
    if (asleep.current) asleep.current.visible = blink;
  });

  const drawBody = useCallback((g: PIXI.Graphics) => drawPixels(g, puffPixels(traits)), [traits]);
  const drawBlink = useCallback((g: PIXI.Graphics) => drawPixels(g, puffPixels(traits, true)), [traits]);
  const drawShadow = useCallback((g: PIXI.Graphics) => {
    g.clear().beginFill(INK, 0.55).drawRect(-radius + 2, radius - 2, radius * 2, 4).drawRect(-radius + 6, radius + 2, radius * 2 - 8, 2).endFill();
  }, [radius]);
  const drawMatchBadge = useCallback((g: PIXI.Graphics) => {
    g.clear().beginFill(INK).drawRect(-8, -8, 16, 16).endFill();
    g.beginFill(0xb6e3ad).drawRect(-6, -6, 12, 12).endFill();
    g.beginFill(INK).drawRect(-4, 0, 2, 2).drawRect(-2, 2, 2, 2).drawRect(0, 0, 2, 2).drawRect(2, -2, 2, 2).endFill();
  }, []);
  const handlePointerTap = useCallback((event: PIXI.FederatedPointerEvent) => {
    event.stopPropagation();
    onSelect?.();
  }, [onSelect]);

  return (
    <Container x={x} y={y}>
      <Graphics draw={drawShadow} eventMode="none" />
      {selected && <SelectionRing radius={radius + 6} />}
      {releaseSelected && <SelectionRing radius={radius + 6} color={0xf08c81} release />}
      <Container ref={body} interactive={Boolean(onSelect)} hitArea={hitArea} cursor="pointer" pointertap={handlePointerTap}>
        <Graphics ref={awake} draw={drawBody} eventMode="none" />
        <Graphics ref={asleep} draw={drawBlink} visible={false} eventMode="none" />
      </Container>
      {matchesRequest && <Graphics x={radius + 10} y={-radius - 12} draw={drawMatchBadge} interactive={Boolean(onSelect)} hitArea={MATCH_BADGE_HIT_AREA} cursor="pointer" pointertap={handlePointerTap} />}
    </Container>
  );
};
