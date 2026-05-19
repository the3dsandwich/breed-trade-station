import { GameCanvas } from "./canvas/GameCanvas";
import "./vars.css";
import "./App.css";

export const App = () => (
  <div className="app">
    <h1 className="app-title">Breed Trade Station</h1>
    <GameCanvas />
  </div>
);
