import { Stage, Graphics } from "@pixi/react";
import { useCallback, useMemo } from "react";
import type * as PIXI from "pixi.js";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { puffAssignedToPen, puffUnassigned } from "../store/pensSlice";
import { puffSelectionToggled, selectionCleared } from "../store/selectionSlice";
import { PuffSprite } from "./PuffSprite";
import { PenView } from "./PenView";
import { gridSlotInPen } from "./penLayout";
import { ContextBridge } from "./ContextBridge";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CANVAS_BG = 0x262626;

const PASTURE_MARGIN = 50;
const PASTURE_BOTTOM = 340;

const PEN_Y = 380;
const PEN_WIDTH = 340;
const PEN_HEIGHT = 190;
const PEN_GAP = 40;
const PEN_START_X = 40;

// Puffs don't have a pen/layout system-independent position yet, so an
// unassigned Puff's spot in the pasture is derived deterministically from
// its id rather than tracked as state.
const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const pasturePositionFor = (id: string) => {
  const hash = hashString(id);
  return {
    x: PASTURE_MARGIN + (hash % (CANVAS_WIDTH - PASTURE_MARGIN * 2)),
    y: PASTURE_MARGIN + ((hash * 7) % (PASTURE_BOTTOM - PASTURE_MARGIN)),
  };
};

export const GameCanvas = () => {
  const dispatch = useAppDispatch();
  const puffs = useAppSelector((state) => state.puffs.byId);
  const pens = useAppSelector((state) => state.pens);
  const selectedPuffId = useAppSelector((state) => state.selection.selectedPuffId);

  const puffToPen = useMemo(() => {
    const map = new Map<string, string>();
    for (const penId of pens.order) {
      for (const puffId of pens.byId[penId].occupantIds) {
        map.set(puffId, penId);
      }
    }
    return map;
  }, [pens]);

  const handleSelectPuff = useCallback(
    (puffId: string) => {
      dispatch(puffSelectionToggled({ puffId }));
    },
    [dispatch]
  );

  const handleClickPen = useCallback(
    (penId: string) => {
      if (!selectedPuffId) return;
      dispatch(puffAssignedToPen({ puffId: selectedPuffId, penId }));
      dispatch(selectionCleared());
    },
    [dispatch, selectedPuffId]
  );

  const handleBackgroundTap = useCallback(() => {
    if (!selectedPuffId) return;
    if (puffToPen.has(selectedPuffId)) {
      dispatch(puffUnassigned({ puffId: selectedPuffId }));
    }
    dispatch(selectionCleared());
  }, [dispatch, puffToPen, selectedPuffId]);

  const drawBackground = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.beginFill(CANVAS_BG);
    g.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    g.endFill();
  }, []);

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
      <Graphics
        draw={drawBackground}
        interactive
        cursor="default"
        pointertap={handleBackgroundTap}
      />

      {pens.order.map((penId, index) => (
        <PenView
          key={penId}
          pen={pens.byId[penId]}
          x={PEN_START_X + index * (PEN_WIDTH + PEN_GAP)}
          y={PEN_Y}
          width={PEN_WIDTH}
          height={PEN_HEIGHT}
          highlighted={Boolean(selectedPuffId) && pens.byId[penId].occupantIds.length < pens.byId[penId].capacity}
          onClick={() => handleClickPen(penId)}
        />
      ))}

      {Object.values(puffs).map((puff) => {
        const penId = puffToPen.get(puff.id);
        let x: number;
        let y: number;

        if (penId) {
          const pen = pens.byId[penId];
          const slotIndex = pen.occupantIds.indexOf(puff.id);
          const penX = PEN_START_X + pens.order.indexOf(penId) * (PEN_WIDTH + PEN_GAP);
          const { dx, dy } = gridSlotInPen(slotIndex, pen.capacity, PEN_WIDTH, PEN_HEIGHT);
          x = penX + dx;
          y = PEN_Y + dy;
        } else {
          const position = pasturePositionFor(puff.id);
          x = position.x;
          y = position.y;
        }

        return (
          <PuffSprite
            key={puff.id}
            puff={puff}
            x={x}
            y={y}
            selected={selectedPuffId === puff.id}
            onSelect={() => handleSelectPuff(puff.id)}
          />
        );
      })}
    </ContextBridge>
  );
};
