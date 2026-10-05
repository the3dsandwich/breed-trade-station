import { useEffect, useRef, useState, type ReactNode } from "react";
import { deriveTraits, puffSatisfiesRequest } from "@bts/shared";
import { useStore } from "react-redux";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { releasePuffs } from "./store/gameActions";
import { RELEASE_REWARD } from "./store/economySlice";
import { removalBlockedReason } from "./store/removalRules";
import type { RootState } from "./store/store";
import "./PenReleaseControls.css";

export const PenReleaseControls = ({ penId, children }: {
  penId: string;
  children: (selection: { selectedIds: string[]; toggle: (id: string) => void }) => ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const puffs = useAppSelector((state) => state.puffs);
  const requests = useAppSelector((state) => state.requests);
  const pen = useAppSelector((state) => state.pens.byId[penId]);
  const releaseModeActive = useAppSelector((state) => state.selection.releaseModeActive);
  const [marked, setMarked] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const selectedIds = marked.filter((id) => pen?.occupantIds.includes(id) && puffs.byId[id]);
  const requestMatches = selectedIds.filter((id) => requests.order.some((requestId) =>
    puffSatisfiesRequest(deriveTraits(puffs.byId[id].genes), requests.byId[requestId]))).length;
  const blockedReason = removalBlockedReason(puffs.byId, selectedIds, puffs.keeperIds);

  // A move/removal drops its mark permanently; returning later never selects it.
  useEffect(() => {
    setMarked((current) => {
      const remaining = releaseModeActive ? [] : current.filter((id) => pen?.occupantIds.includes(id) && puffs.byId[id]);
      return remaining.length === current.length ? current : remaining;
    });
  }, [pen?.occupantIds, puffs.byId, releaseModeActive]);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const toggle = (id: string) => {
    if (releaseModeActive || !pen?.occupantIds.includes(id) || !puffs.byId[id]) return;
    setNotice("");
    setMarked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return <>
    {!releaseModeActive && <p className="pen-release-help">Select individual Puffs to release. Nothing is removed until you confirm below.</p>}
    {children({ selectedIds, toggle })}
    {!releaseModeActive && <div className="pen-release-controls" role="group" aria-label="Release selected pen occupants">
      <p ref={noticeRef} tabIndex={-1} className="pen-release-notice">{notice}</p>
      <p>{pen?.name} · {selectedIds.length} selected · {selectedIds.length * RELEASE_REWARD}g total</p>
      {requestMatches > 0 && <p className="pen-release-match">{requestMatches} selected {requestMatches === 1 ? "Puff matches" : "Puffs match"} a request. A request sale may pay more.</p>}
      <p id="pen-release-reason" role="status" className="pen-release-blocked">{blockedReason}{blockedReason && selectedIds.some((id) => puffs.keeperIds?.includes(id)) ? " Deselect the keeper to release only the others." : ""}</p>
      <button type="button" aria-describedby="pen-release-reason" disabled={selectedIds.length === 0 || !!blockedReason} onClick={() => {
        const state = store.getState();
        if (state.selection.releaseModeActive) return;
        const currentIds = selectedIds.filter((id) => state.pens.byId[penId]?.occupantIds.includes(id) && state.puffs.byId[id]);
        const reason = removalBlockedReason(state.puffs.byId, currentIds, state.puffs.keeperIds);
        if (currentIds.length !== selectedIds.length || reason) {
          setMarked(currentIds);
          setNotice(reason ?? "The selection changed. Review it before confirming.");
          return;
        }
        if (dispatch(releasePuffs(currentIds))) {
          setMarked([]);
          setNotice(`Released ${currentIds.length} ${currentIds.length === 1 ? "Puff" : "Puffs"} for ${currentIds.length * RELEASE_REWARD}g.`);
        }
      }}>Release {selectedIds.length} {selectedIds.length === 1 ? "Puff" : "Puffs"} for {selectedIds.length * RELEASE_REWARD}g</button>
    </div>}
  </>;
};
