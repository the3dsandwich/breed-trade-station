# Rendering and Server Stack

Status: decided

---

## Decision Summary

| Concern | Technology |
|---------|-----------|
| Game viewport rendering | PixiJS v7 + pixi-react v7 |
| UI chrome (menus, market, inventory, HUD) | React + Redux Toolkit |
| Redux integration in Pixi canvas | pixi-react Context Bridge |
| Server framework | Fastify + Socket.IO |
| Server language | TypeScript |
| Shared types | Single shared TypeScript package (client + server) |

---

## Rendering

### Why PixiJS

PixiJS is a pure 2D renderer with no internal game state. Redux owns all state. PixiJS renders what Redux says. Clean separation with no competing state.

### Hybrid rendering model

The game uses two rendering layers side by side:

| Layer | Renderer | What lives here |
|-------|----------|----------------|
| Game viewport | PixiJS canvas | Puff sprites, pen views, animations, idle effects |
| UI chrome | React DOM | Menus, market screen, inventory, orders, HUD, overlays |

PixiJS handles everything that needs to update every tick — sprite positions, animations, resource drop effects. React handles everything that is event-driven and doesn't need frame-level rendering — screens, modals, lists.

At double-digit pens with hundreds of Puffs, rendering each Puff as a DOM element would cause significant re-render overhead on every tick. PixiJS renders them as sprites in a single canvas draw call.

### pixi-react v7

`pixi-react` is the official PixiJS library maintained by the PixiJS team. It allows writing PixiJS scenes in React declarative style. Version 7 targets React 18 and PixiJS v7.

v8 was considered and deferred — it is a full rewrite for React 19 and PixiJS v8, and its Redux integration documentation lags behind v7. v7's Redux support is fully documented and battle-tested.

Upgrade path to v8 exists when its Redux story is complete.

### Redux in the PixiJS canvas — Context Bridge

React's custom renderers (used by pixi-react to render into canvas) do not automatically inherit parent React contexts, including the Redux store. The official pixi-react solution is a `ContextBridge` component that explicitly passes contexts through the renderer boundary.

Implementation: wrap the pixi-react `<Stage>` with a `ContextBridge` that forwards `ReactReduxContext`. All Pixi components inside the Stage can then access the Redux store normally via `useSelector` and `useDispatch`.

This is written once and not touched again. Official docs: https://react.pixijs.io/7.x/context-bridge/

---

## Server Stack

### Framework: Fastify + Socket.IO + TypeScript

**Fastify** — HTTP server framework. Faster than Express with near-identical ergonomics. Handles REST endpoints for market listings, player authentication, and Puff validation.

**Socket.IO** — WebSocket library. Maintains persistent connections for real-time push events: market purchase notifications, rental returns, NPC bot activity. Handles reconnection and fallback automatically.

**TypeScript** — Same language as the client. Enables a shared types package (see below).

### Why WebSocket

The market system requires the server to push events to connected clients without the client polling:
- Another player purchases your listed Puff → you are notified immediately
- A rental period ends → your Puff is returned and you are notified
- An NPC bot purchases an expired listing → market state updates

HTTP polling would introduce latency and unnecessary server load. Socket.IO keeps a persistent connection open and the server pushes when events occur.

### Shared TypeScript types

A shared package (e.g. `packages/shared`) contains type definitions used by both client and server:
- Puff data structure (gene array, traits, lineage)
- Market listing format
- Socket.IO event payloads
- API request/response shapes

This prevents client/server type drift — if the Puff structure changes, both sides fail to compile until both are updated. A significant correctness guarantee for a game where Puff legitimacy is server-validated.

### Server responsibilities (recap from state-and-tick.md)

The server does not simulate the player's farm. It only arbitrates cross-player interactions:

| Responsibility | Mechanism |
|---------------|-----------|
| Validate Puff legitimacy and lineage on listing | REST endpoint |
| Store and serve market listings | REST + database |
| Notify buyers and sellers of transactions | Socket.IO push |
| Process rental period end, return animals | Server tick + Socket.IO push |
| NPC bot purchases on expired listings | Server tick |
| Player-to-player pricing arbitration | Server-side logic |

---

## Full Client Stack Summary

```
React 18
  ├── Redux Toolkit (all state)
  ├── pixi-react v7 (game viewport)
  │   └── ContextBridge (Redux → Pixi boundary)
  ├── PixiJS v7 (sprite rendering)
  └── Web Worker (tick engine)

Wrapped by:
  ├── Tauri (Linux / Steam Deck)
  ├── Capacitor (Android, future)
  └── Browser / PWA (iPhone)
```

## Full Server Stack Summary

```
Fastify (HTTP)
  └── Socket.IO (WebSocket)
      TypeScript throughout
      Shared types package with client
      Server tick (independent interval)
```

---

## Deferred

- Database choice for market listings and player data
- Authentication strategy (how players identify across devices)
- Deployment infrastructure (where the server runs)
- PixiJS v8 / pixi-react v8 upgrade (when Redux docs catch up)
- Asset pipeline: sprite sheet format, how Puff sprites are loaded into PixiJS
- Whether Socket.IO rooms are used for market segmentation
