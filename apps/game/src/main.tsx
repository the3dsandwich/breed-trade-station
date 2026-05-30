import { extensions, Renderer } from "pixi.js";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// pixi.js's side-effect registration is dropped by Vite's pre-bundler;
// register the WebGL renderer explicitly so autoDetectRenderer finds it.
extensions.add(Renderer);

// StrictMode omitted: pixi-react v7 is incompatible with React 18's double-mount
// behavior — Stage.destroy() kills the WebGL context and the second mount fails.
const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");
createRoot(root).render(<App />);
