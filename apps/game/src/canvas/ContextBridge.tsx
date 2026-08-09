import type { ReactNode } from "react";
import { ReactReduxContext } from "react-redux";

interface ContextBridgeProps {
  children: ReactNode;
  render: (children: ReactNode) => ReactNode;
}

// pixi-react's custom renderer does not inherit React context from the DOM
// tree, so Redux context has to be re-provided inside the Stage explicitly.
// https://react.pixijs.io/7.x/context-bridge/
export const ContextBridge = ({ children, render }: ContextBridgeProps) => (
  <ReactReduxContext.Consumer>
    {(value) =>
      value &&
      render(<ReactReduxContext.Provider value={value}>{children}</ReactReduxContext.Provider>)
    }
  </ReactReduxContext.Consumer>
);
