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

Autosave, page unload, and tick-engine cleanup all call `saveGameState`. It updates `clock.lastSavedAt` before taking the snapshot, so a reload does not count time already played as offline time. Only the five saved slices are included; selection stays temporary. Recent
birth records are stored inside the existing `puffs` slice. The development reset can still suppress the next save.

Only client-owned slices are persisted to localStorage. Market state is always re-fetched from the server on startup.

---

## Deferred

- RTK Query configuration for server/market state fetching
- Exact localStorage serialization format and versioning strategy
- Migration strategy for save file format changes
- Server tick implementation details
- Fast-forward as a player-facing game feature (vs. debug only)
- Offline progress cap (whether there is a maximum catchup duration)

### Bounded birth history

`PuffsState` has optional `recentBirths` and `birthCount` fields. Legacy saves
with only `byId` keep working and do not gain guessed history. On a real
breeding event, the middleware records the baby and the exact selected
male/female parents as IDs plus visible-trait snapshots. It also records the
pen ID/name and whether the event came from offline catchup. It makes no
additional random choices and does not change the breeding sequence.

The reducer assigns a monotonically increasing record number and keeps the
newest 20 entries. The counter persists when older entries are trimmed. Puff
removal does not remove records; the UI checks the living herd before allowing
a child to be selected. Snapshot traits remain available after any recorded
Puff is removed. Whole-game restart clears these fields with the rest of the
save. Catchup still generates at most one birth per eligible pen; the UI does
not assign a precise historical time to that simulated birth.

### Newborn growth deadline

`Puff.breedingReadyAt` is an optional deadline in `clock.gameTime` milliseconds.
A missing deadline means ready, so older saves and starter animals keep working
even when the old, unused `matured` flag is false. Readiness does not use the
wall-clock `bornAt` field and does not require per-tick Puff mutations.

The breeding listener sees the clock after each tick. New babies get a deadline
60 seconds after that game time. Existing young Puffs grow during catchup. A
new catchup baby conservatively starts its growth at the end of catchup, since
the game does not simulate its exact historical birth time. The one-birth-per-
pen catchup cap remains.

For progress, the listener intersects the tick interval with the time after
the second occupant became ready. This avoids granting a whole offline gap
as breeding time to Puffs who only just grew. Parent selection filters to
ready occupants; all occupants still count toward capacity. Existing progress
is kept, including same-sex adult banks. The deadline saves with the Puff
and does not change on moves or reload. New game reset clears it with the herd.

### Local NPC trader

`economy.trader` is optional saved state: a local `YYYY-MM-DD` day, three complete
Puff offers, and an optional purchased Puff ID. Keeping it inside economy retains
the five saved slices. Old saves receive their first stock on startup without
changing their herd or balance. Stock generation fixes Large/Female, Small/Male,
and Medium slots, then keeps the generated Puff IDs and genes for that visit.

Startup and economy ticks/catchup refresh stock only when the local date is later
than its saved day. A gap generates one set, not one set per missed day. No
refresh happens for a backward date. The purchase thunk refreshes first, then
requires the submitted day and offer to still match today's stock. A stale
midnight click therefore shows new offers without buying a replacement.

The thunk rejects missing offers, used visits, insufficient/non-finite Gold,
release mode, an existing herd ID, and a mismatched day. One synchronous
`traderPurchaseCompleted` event updates economy, puffs and selection together.
It deducts the fixed price, records the chosen ID, adds the exact saved Puff and
selects it. It does not assign a pen or write a birth record. Purchased stock has
no growth deadline, so it is ready under the existing readiness rule.

Upkeep now uses a 300,000ms trial interval, still charging every elapsed interval
and keeping its remainder. Old saved remainders remain valid. No balance, clock,
or release/reward migration is needed. The wallet derives the next-charge text
from that same accumulator. Local date controls stock only; game time still
controls breeding, growth and upkeep.
