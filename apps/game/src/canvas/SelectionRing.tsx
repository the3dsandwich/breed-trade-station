import { Graphics, useTick } from "@pixi/react";
import { useCallback, useEffect, useRef } from "react";
import type * as PIXI from "pixi.js";
import { useReducedMotion } from "./useReducedMotion";

interface SelectionRingProps { radius: number; color?: number; release?: boolean }

export const SelectionRing = ({ radius, color = 0xf5d78c, release = false }: SelectionRingProps) => {
  const ring = useRef<PIXI.Graphics>(null);
  const elapsed = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => { if (ring.current) ring.current.alpha = 1; }, [reduced]);
  useTick((delta) => {
    if (reduced) return;
    elapsed.current += delta;
    if (ring.current) ring.current.alpha = elapsed.current % 90 < 45 ? 1 : 0.65;
  });
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx < 0 ? -radius : radius - 8;
      const y = sy < 0 ? -radius : radius - 2;
      g.beginFill(color).drawRect(x, y, 8, 2).drawRect(sx < 0 ? -radius : radius - 2, sy < 0 ? -radius : radius - 8, 2, 8).endFill();
    }
    if (release) {
      g.beginFill(0x211b32).drawRect(-6, radius - 2, 14, 14).endFill();
      for (let i = 0; i < 5; i++) {
        g.beginFill(color).drawRect(-4 + i * 2, radius + i * 2, 2, 2).drawRect(4 - i * 2, radius + i * 2, 2, 2).endFill();
      }
    }
  }, [radius, color, release]);
  return <Graphics ref={ring} draw={draw} eventMode="none" />;
};
