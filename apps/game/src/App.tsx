import { Provider } from "react-redux";
import { GameCanvas } from "./canvas/GameCanvas";
import { store } from "./store/store";
import { useTickEngine } from "./tick/useTickEngine";
import "./vars.css";
import "./App.css";

const Game = () => {
  useTickEngine();
  return (
    <div className="app">
      <h1 className="app-title">Breed Trade Station</h1>
      <GameCanvas />
    </div>
  );
};

export const App = () => (
  <Provider store={store}>
    <Game />
  </Provider>
);
