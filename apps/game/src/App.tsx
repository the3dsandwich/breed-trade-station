import { GameCanvas } from "./canvas/GameCanvas";
import "./App.css";

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", background: "#1a1a2e", minHeight: "100vh" }}>
      <h1 style={{ color: "#eee", fontFamily: "sans-serif", marginBottom: "1rem" }}>
        Breed Trade Station
      </h1>
      <GameCanvas />
    </div>
  );
}

export default App;
