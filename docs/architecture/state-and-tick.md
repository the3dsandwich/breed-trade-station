# State Management and Tick Engine

Status: decided — tick engine and `clock`/`puffs` slices implemented in `apps/game/src/store` and `apps/game/src/tick`; remaining slices land as those systems (pens, resources, market, etc.) get designed

---

## Decision

**Redux Toolkit for all state management — both client game state and server/market state.**

**A custom Web Worker tick engine** that drives the game clock and integrates with Redux via a minimal message API.

---

## Why Redux Toolkit

- Single mental model and single devtools panel for all state
- Avoids the complexity of splitting client state (Zustand) from server state (React Query) across two paradigms
- Redux Toolkit removes the historical Redux boilerplate — slices, Immer mutations, and RTK Query are all first-class
- Predictable and auditable — important for a game where state correctness matters (Puff genetics, aging, market legitimacy)
- If complexity grows, the foundation scales without a rewrite

Redux Toolkit is used for:
- All client-side game state (Puffs, pens, resources, player inventory)
- All server-fetched state (market listings, validated transactions)
- Persistence (serialized to localStorage on save events)

---

## Client / Server State Split

The server does not simulate the player's farm. The client owns all local game state. The server arbitrates only when player actions interact with other players or the shared market.

| Concern | Owner | Notes |
|---------|-------|-------|
| Puff genetics, aging, traits | Client | Never sent to server unless market-listed |
| Pen affinities, resource generation | Client | Calculated from tick deltas |
| Breeding progress | Client | Driven by tick engine |
| NPC orders and pricing | Client | Fully local |
| Player market listings | Server-validated | Server verifies Puff legitimacy and lineage |
| Player-to-player pricing | Server | Server assigns and arbitrates |
| Market tick (listing expiry, bot buys) | Server | Runs independently of any client |
| Rental returns | Server | Server tracks rental period end |

---

## Tick Engine

### Role

The tick engine is a Web Worker. It owns the game clock. Redux owns the state. The tick engine tells Redux what time has passed — Redux decides what that means for the game.

The tick engine knows nothing about Puffs, pens, or resources. It only emits time events. All game logic lives in Redux reducers.

### Why a Web Worker

Browsers throttle `setInterval` and `requestAnimationFrame` when a tab is hidden or inactive. A Web Worker runs in a background thread and is not throttled. This keeps the game clock accurate when the player switches tabs or minimises the app.

### Tick Interval

Default: 1000ms (one tick per real second). Configurable via `SET_SPEED` for fast-forward. The tick interval is a real-time interval — not a game-time concept. Game time is derived from accumulated deltas.

---

## Tick Engine API

### Commands — Redux → Worker

| Command | Payload | Purpose |
|---------|---------|---------|
| `START` | `{ lastSavedAt: timestamp }` | Start the tick loop. If `lastSavedAt` is in the past, triggers a `CATCHUP` event before the regular loop begins. |
| `PAUSE` | none | Suspend ticking. Clock stops advancing. Used when app is backgrounded or player is in a blocking modal. |
| `RESUME` | none | Resume from pause. Worker emits a `TICK` with the delta since pause began, then continues normally. |
| `STOP` | none | Shut down the worker cleanly. Called on app close. |
| `SET_SPEED` | `{ multiplier: number }` | Adjust tick frequency for fast-forward. Multiplier of 1 is real-time. Used for debug and potentially as a game feature. |

### Events — Worker → Redux

| Event | Payload | Redux action dispatched |
|-------|---------|------------------------|
| `TICK` | `{ delta: ms, now: timestamp }` | `gameTick({ delta })` — main action that advances all time-dependent state |
| `CATCHUP` | `{ elapsed: ms }` | `gameTickCatchup({ elapsed })` — offline progress calculated once on startup; Redux fast-forwards all state by the full elapsed duration |
| `SAVE` | none | `persistState()` — Redux serializes current state to localStorage |

Total surface: 5 commands, 3 events. The tick engine has no other interface.

---

## Interaction Flow

### Normal session

```
App starts
  → Redux loads state from localStorage
  → Redux sends START { lastSavedAt } to Worker
  → If no offline gap: Worker begins tick loop immediately
  → Every 1000ms: Worker emits TICK { delta, now }
  → Redux dispatches gameTick({ delta })
  → Each slice updates its state based on delta:
      pens slice    → advances breeding progress, resource accumulation
      puffs slice   → advances aging, checks for death
      market slice  → no client tick needed (server-driven)
  → Every 30s: Worker emits SAVE
  → Redux serializes to localStorage
```

### App return after offline period

```
App starts
  → Redux loads state from localStorage
  → Redux sends START { lastSavedAt } to Worker
  → Worker calculates: elapsed = now - lastSavedAt
  → Worker emits CATCHUP { elapsed }
  → Redux dispatches gameTickCatchup({ elapsed })
  → All slices fast-forward by full elapsed duration in one pass
  → Worker begins normal tick loop
```

### App close

```
Player closes app
  → Redux dispatches persistState() immediately (not waiting for SAVE)
  → Redux sends STOP to Worker
  → Worker shuts down cleanly
```

---

## Redux Slice Structure

Each slice responds to `gameTick` and `gameTickCatchup` independently. No slice coordinates with another during a tick — each owns its own time-dependent calculations.

Anticipated slices:

| Slice | Owns | Responds to tick? |
|-------|------|-------------------|
| `clock` | Current game time, speed multiplier, last saved timestamp | Yes — tracks accumulated time |
| `puffs` | All Puff data including genes, age, status | Yes — advances aging, triggers death |
| `pens` | Pen definitions, capacity, occupants, upgrade state | Yes — advances breeding progress, accumulates resources |
| `resources` | Player resource inventory | Yes — receives production from pens tick |
| `inventory` | Items owned by player | No |
| `orders` | Active NPC orders | No — orders are event-driven, not tick-driven |
| `market` | Player market listings, fetched from server | No — server-driven |
| `player` | Player identity, inferred progression score | No |

---

## Server Tick

The server runs its own independent tick on a fixed interval (e.g. every 60 seconds). It is not connected to any client tick. It handles:

- Expiring listings that have sat too long
- Triggering NPC bot purchases on expired listings
- Processing rental period end and returning animals to owners
- Any market-side time-based events

Server tick implementation is deferred to backend architecture decisions.

---

## Persistence

State is serialized to localStorage on every `SAVE` event (every 30 seconds) and immediately on app close. On startup, Redux rehydrates from localStorage before sending `START` to the worker.

Only client-owned slices are persisted to localStorage. Market state is always re-fetched from the server on startup.

---

## Deferred

- RTK Query configuration for server/market state fetching
- Exact localStorage serialization format and versioning strategy
- Migration strategy for save file format changes
- Server tick implementation details
- Fast-forward as a player-facing game feature (vs. debug only)
- Offline progress cap (whether there is a maximum catchup duration)
