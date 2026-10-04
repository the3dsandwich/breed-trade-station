import { useAppDispatch, useAppSelector } from "./store/hooks";
import { puffKeeperToggled } from "./store/puffsSlice";
import "./KeeperControls.css";

export const KeeperBadge = ({ puffId }: { puffId: string }) => {
  const kept = useAppSelector((state) => state.puffs.keeperIds?.includes(puffId) ?? false);
  return kept ? <span className="keeper-badge">Keeper</span> : null;
};

export const KeeperControls = ({ puffId }: { puffId: string }) => {
  const dispatch = useAppDispatch();
  const kept = useAppSelector((state) => state.puffs.keeperIds?.includes(puffId) ?? false);
  return <div className="keeper-controls">
    <button type="button" aria-pressed={kept} aria-describedby="keeper-help"
      onClick={() => dispatch(puffKeeperToggled({ puffId }))}>Keep this Puff</button>
    <p id="keeper-help">{kept
      ? "Keeper — protected from sale and release. Turn this off when you are ready to let it go."
      : "Mark a Puff you want to keep. It will be protected from sale and release."}
      {" "}Keepers can still move and breed.</p>
  </div>;
};
