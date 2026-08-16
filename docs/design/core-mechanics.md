# Core Mechanics

Status: decided — Layer 1 complete, pen model complete

---

## Game Identity

A creature breeding and management game where the player breeds animals with heritable traits, allocates them across pens, and participates in a market to sell or rent them. The game is completable in single player; multiplayer participation accelerates progression but is never required.

The genetics mechanic uses real Mendelian inheritance. Players are not taught this — they are expected to discover it through play. The mechanic should feel like a natural part of the game, not an educational overlay.

---

## Core Loop

1. Animals live in pens → they breed, produce resources, and contribute to building simultaneously
2. Player allocates animals across pens to balance breeding output, resource generation, and construction
3. Resources fund pen upgrades and enhancements → better pens improve all three affinities
4. Player fulfills trait-specific Requests → earns Gold
5. Gold spent on items and market purchases → better breeding stock → harder Requests become reachable
6. Repeat with increasing complexity

---

## Progression

There is no explicit player level or experience points. The game infers player progression from the quality and rarity of the animals the player has bred. Request difficulty, market dynamics, and available content are all balanced against this inferred progression.

This means:
- A player cannot grind XP to unlock harder content — they must actually breed better animals
- One lucky outlier animal should not inflate perceived progression — the system should assess the player's overall stock, not a single animal
- The exact algorithm for assessing stock quality is deferred to systems design

**Three-phase arc:**

| Phase | Request source | Market access |
|-------|-------------|---------------|
| Early (tutorial) | Scripted NPC requests with fixed requirements | NPC market only |
| Mid | Procedurally generated NPC requests | NPC market only |
| Late | Procedural NPC requests + player-to-player listings | Full market |

The MVP Request System (below) skips straight to lightweight procedural generation — hand-authored/scripted early-game content is deferred, not rejected; this table is still the eventual intent.

---

## Request System

Requests specify a target trait combination — a small subset of traits (not the full trait list), each pinned to a specific value. Fulfilling a request removes the matching animal from the player's collection and awards Gold.

Requests are generated on the fly. Each request's difficulty — and therefore its reward — is driven by:
- **How many traits are specified** — more pinned traits is a narrower, harder target
- **How rare each requested value is** — e.g. body size XS or XL is a much narrower breeding target than M, since M is the common middle of the distribution; rarer requested values pay more
- A request pinning a single common trait value (e.g. body size M) is easy and pays accordingly less — but still more than releasing the animal via Release

Eventually, difficulty should also control how often a request appears and whether it appears at the player's current inferred progression level (see Progression above) — that gating is deferred pending the progression-inference algorithm; the MVP's requests aren't yet progression-aware.

The puzzle is breeding an animal that satisfies the trait requirements. The genetics system is the primary tool for solving that puzzle.

**Deferred:** hand-authored/scripted request content (see the three-phase arc above), progression-gated difficulty, and exact tuning numbers for the difficulty→reward formula.

---

## Gold and Upkeep

Gold is the single shared resource spent and earned throughout Requests, Release, and — eventually — the Market. There is no separate upkeep currency.

- Every living animal costs a small, flat amount of Gold in upkeep. This is deducted in a periodic batch on an interval, not continuously every tick — a readable, occasional deduction rather than a constant flicker of tiny ones.
- Gold is clamped at zero; the player never goes into debt.
- At zero Gold, animals are **starving**: breeding speeds up rather than stopping or slowing, with a clear UI indicator. This is deliberately self-correcting — Gold is already floored at zero, so animals born during a shortage don't cost anything more right now, and they're exactly the new supply the player needs to Release or fulfill Requests with to earn their way back out. A slowdown was tried first and rejected: it throttled the player's only recovery mechanism precisely when they needed it most.
- Fulfilling Requests and using Release are the two ways to bring Gold back up.

This Gold/upkeep economy is unrelated to the separate "resource types" that fund pen upgrades (Core Loop step 3, still deferred) — those are a different, still-undecided resource layer.

Exact upkeep cost per animal, the deduction interval, the starting Gold balance, and the starving-rate multiplier are placeholders pending playtesting balance, same as breeding's duration and mutation-rate constants.

---

## Release

Release lets the player remove any animal from their collection at any time, for a small flat Gold return — smaller than a typical Request reward. It's a population-management valve independent of Requests: it works on any animal regardless of whether it matches an open request, for Puffs the player doesn't want to keep or can't place.

Release supports both a single-animal flow (select one, release it) and a bulk flow (select several, confirm once) so clearing out multiple unwanted animals doesn't mean repeating the single-select loop one at a time.

---

## Animal Affinities

Animals do not have fixed roles. Every animal contributes to all three activities simultaneously based on its traits. The three affinities are:

| Affinity | What it contributes |
|----------|-------------------|
| Breed rate | How quickly and frequently this animal produces offspring |
| Produce rate | How quickly and how much resource this animal generates |
| Build rate | How effectively this animal converts resources into pen upgrades |

A pen's total output in each affinity is the sum across all animals in it. The player's strategic decision is how to allocate animals across pens — there is always an opportunity cost. A pen optimized for production breeds slowly; placing a high-affinity animal in a breeding pen means it is not generating resources elsewhere.

Animals listed on the market are the exception: a listed animal is locked and contributes nothing to any pen until the listing resolves.

**On trait concentration:** when animals with similar high-affinity traits share a pen, their offspring tend to inherit and reinforce those traits. Mixing animals with spread-out or mediocre traits produces mediocre offspring. Players are expected to discover this — the game does not explain it.

---

## Pen System

Pens are the primary organizational unit. Each pen has a fixed animal capacity. The player's core strategic question is: what do I want each pen to achieve, and which animals do I put in it to get there?

**Capacity**
- Each pen has a hard animal cap
- Capacity is a pen-level upgrade, not a global one — builders can expand individual pens
- This creates a secondary decision: upgrade an existing pen or build a new one
- A capacity-2 pen can never breed: offspring join the same pen they were born in, so two parents already fill it with no room left for a child. Breeding needs capacity 3+.

**Why fixed capacity (not resource limits or diminishing returns)**
- Resource limits and diminishing returns are valid mechanics but not necessary to make the allocation puzzle work
- Fixed capacity is simpler to reason about and easier to upgrade — a clean lever for builder progression
- Resource sustainability and diminishing returns are deferred; may be revisited if playtesting shows the allocation puzzle is too easy

**Pen types**
- Whether pens are generic (any animal, any purpose) or specialized (breeding pen vs. production pen) is deferred
- The affinity model does not require specialized pens — any pen can do all three things based on who is in it

**Implementation:** a first pass is live in `apps/game` — 2 generic pens, capacity 4 each (placeholder numbers, not a tuned balance decision). Assignment is tap-to-select a Puff, then tap a pen; drag-and-drop is planned but not yet built. Pen upgrades, capacity progression, and pen-affinity aggregation are not implemented — pens currently only hold Puffs.

---

## Breeding

Breeding is passive and habitat-driven. The player does not manually pair parents. Instead:
- The player assigns animals to a pen
- Animals in the same pen breed automatically over time
- Offspring inherit traits from pen-mates via the genetics system
- The player's strategic choice is which animals to place together

Breeding speed is a trait. Lifespan is a trait. Both are heritable.

There is no freeze mechanic. Animals age and die. Death self-regulates the total population and ensures the player must keep breeding rather than accumulating a static herd.

**Implementation:** true Mendelian meiosis is live in `packages/shared` and wired into `apps/game` — each parent contributes one randomly-segregated allele per gene locus, with a small (placeholder, pending playtesting) per-allele mutation chance. A pen with 2+ occupants and open capacity accumulates breeding progress each tick, including offline catchup; on completion it picks one random M and one random F occupant as parents (same-sex pens hold progress at the cap until a compatible mate is placed) and the offspring joins the same pen immediately. A very long catchup gap fires at most one birth per pen — it does not simulate multiple breeding cycles that would have happened in between. Not yet implemented: breeding speed/lifespan as heritable traits, aging, maturity (newborns are immediately breeding-eligible), and death.

---

## Market

Two markets exist, both asynchronous. Listings remain active until purchased by another player or by an NPC bot.

**Sell market**
- Animal is listed at a player-set price
- Animal leaves the seller's collection permanently on purchase
- Creates a genuine "keep vs. sell" decision, especially for high-affinity animals

**Rent market**
- Animal is listed at a player-set rental price
- Animal is locked in the rented-out pen (name TBD) for the duration of the rental
- Animal returns to the owner when the rental period ends
- Rental price is market-driven; expected to be lower than sell price by market equilibrium, not by rule
- Effectively sells gene access without permanently losing the animal

**NPC bots**
- Backstop listings that sit unsold for too long
- Maintain market liquidity in low-population or early-game states
- Bot pricing and behavior is a systems design concern; deferred

---

## Deferred Decisions

- Pen names and UI terminology (rented-out pen, etc.)
- Pen types: generic vs. specialized
- Resource sustainability and diminishing returns mechanics
- Algorithm for assessing player stock quality (progression inference)
- Exact trait list and what each trait controls
- Resource types and what they build (separate from Gold — see Gold and Upkeep)
- Rental duration mechanics
- NPC bot pricing behavior
- Creature identity and visual trait expression
- Hand-authored/scripted Request content; progression-gated Request difficulty
- Exact Gold/upkeep tuning: upkeep cost, deduction interval, starting balance, starving-rate multiplier
- Exact Request difficulty→reward formula weights
