import { Provider } from "react-redux";
import { GameCanvas } from "./canvas/GameCanvas";
import { PenStatusPanel } from "./PenStatusPanel";
import { PuffInspector } from "./PuffInspector";
import { GoldDisplay } from "./GoldDisplay";
import { RequestsPanel } from "./RequestsPanel";
import { ReleaseControls } from "./ReleaseControls";
import { store } from "./store/store";
import { useTickEngine } from "./tick/useTickEngine";
import { HerdRecovery } from "./HerdRecovery";
import { DevResetButton } from "./DevTools";
import "./vars.css";
import "./App.css";

const Game = () => {
  useTickEngine();
  return (
    <div className="app">
      <h1 className="app-title">Breed Trade Station</h1>
      <div className="game-layout">
        <div className="game-board">
          <div className="canvas-frame">
            <GameCanvas />
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
    </div>
  );
};

export const App = () => (
  <Provider store={store}>
    <Game />
  </Provider>
);
