import { Graphics, Text } from "@pixi/react";
import { useCallback, useMemo } from "react";
import * as PIXI from "pixi.js";
import type { Pen } from "../store/pensSlice";

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
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    const rect = (x: number, y: number, w: number, h: number, color: number) => g.beginFill(color).drawRect(x, y, w, h).endFill();
    rect(0, 0, width, height, 0x211b32);
    rect(4, 4, width - 8, height - 8, highlighted ? 0xf5d78c : 0x8a6a65);
    rect(8, 8, width - 16, height - 16, 0x302b43);
    rect(8, 8, width - 16, 30, 0x49364d);
    rect(8, 38, width - 16, 2, 0x745565);
    // Quiet straw flecks leave the occupants easy to see.
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
      rect(24 + col * 50 + (row % 2) * 10, 58 + row * 45, 6, 2, 0x3e354b);
    }
    for (const px of [0, width - 12]) for (const py of [0, height - 16]) {
      rect(px, py, 12, 16, 0x211b32);
      rect(px + 2, py + 2, 8, 12, highlighted ? 0xf5d78c : 0xa98575);
      rect(px + 2, py + 2, 8, 2, 0xefc896);
      rect(px + 4, py + 7, 2, 2, 0x604854);
    }
  }, [width, height, highlighted]);
  const handlePointerTap = useCallback((event: PIXI.FederatedPointerEvent) => {
    event.stopPropagation();
    onClick?.();
  }, [onClick]);
  const labelStyle = useMemo(() => new PIXI.TextStyle({ fill: 0xf3e5cf, fontFamily: "monospace", fontSize: 16, fontWeight: "600", letterSpacing: 1 }), []);
  return (
    <>
      <Graphics x={x} y={y} draw={draw} interactive={Boolean(onClick)} cursor="pointer" pointertap={handlePointerTap} />
      <Text x={x + 20} y={y + 13} text={`${pen.name.toUpperCase()}  ${pen.occupantIds.length}/${pen.capacity}`} style={labelStyle} eventMode="none" />
    </>
  );
};
