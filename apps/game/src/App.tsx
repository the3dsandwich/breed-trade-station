import { Provider } from "react-redux";
import { GameCanvas } from "./canvas/GameCanvas";
import { PenStatusPanel } from "./PenStatusPanel";
import { PuffInspector } from "./PuffInspector";
import { GoldDisplay } from "./GoldDisplay";
import { RequestsPanel } from "./RequestsPanel";
import { ReleaseControls } from "./ReleaseControls";
import { useAppSelector } from "./store/hooks";
import { store } from "./store/store";
import { useTickEngine } from "./tick/useTickEngine";
import { useNativeCloseSave } from "./native/useNativeCloseSave";
import { HerdRecovery } from "./HerdRecovery";
import { DevResetButton } from "./DevTools";
import "./vars.css";
import "./App.css";

const Game = () => {
  const herdSize = useAppSelector((state) => Object.keys(state.puffs.byId).length);
  useTickEngine();
  useNativeCloseSave();
  return (
    <main className="app">
      <header className="app-header">
        <div className="station-mark" aria-hidden="true"><span /></div>
        <div>
          <p className="app-eyebrow">A little ranch among the stars</p>
          <h1 className="app-title">Breed Trade Station</h1>
          <p className="app-subtitle">Raise Puffs. Find a match. Grow your little world.</p>
        </div>
        <span className="station-sign">DUSK RANCH <span aria-hidden="true">✦</span></span>
      </header>
      <div className="game-layout">
        <div className="game-board">
          <div className="canvas-frame">
            <div className="pasture-heading">
              <h2>Your pasture</h2>
              <span className="herd-count">{herdSize} Puffs</span>
            </div>
            <GameCanvas />
            <div className="pasture-legend" role="group" aria-label="Puff markers">
              <span><i className="legend-selected" aria-hidden="true" /> Selected</span>
              <span><i className="legend-match" aria-hidden="true">✓</i> Request match</span>
              <span><i className="legend-release" aria-hidden="true">×</i> To release</span>
            </div>
          </div>
          <PenStatusPanel />
        </div>
        <div className="sidebar">
          <GoldDisplay />
          <HerdRecovery />
          <PuffInspector />
          <RequestsPanel />
          <ReleaseControls />
        </div>
      </div>
      {import.meta.env.DEV && <DevResetButton />}
    </main>
  );
};

export const App = () => (
  <Provider store={store}>
    <Game />
  </Provider>
);
