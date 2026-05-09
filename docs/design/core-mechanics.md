# Core Mechanics

Status: decided — Layer 1 complete

---

## Game Identity

A creature breeding and management game where the player breeds animals with heritable traits, assigns them to roles, and participates in a market to sell or rent them. The game is completable in single player; multiplayer participation accelerates progression but is never required.

The genetics mechanic uses real Mendelian inheritance. Players are not taught this — they are expected to discover it through play. The mechanic should feel like a natural part of the game, not an educational overlay.

---

## Core Loop

1. Animals breed passively in pens → offspring inherit traits from parents
2. Player assigns animals to roles: producer, builder, breeder, or market
3. Producers generate resources → resources fund pen upgrades and enhancements
4. Builders consume resources to construct upgrades → better pens, faster breeding, larger capacity
5. Player fulfills trait-specific orders → earns gold
6. Gold spent on items and market purchases → better breeding stock → harder orders become reachable
7. Repeat with increasing complexity

---

## Progression

There is no explicit player level or experience points. The game infers player progression from the quality and rarity of the animals the player has bred. Order difficulty, market dynamics, and available content are all balanced against this inferred progression.

This means:
- A player cannot grind XP to unlock harder content — they must actually breed better animals
- One lucky outlier animal should not inflate perceived progression — the system should assess the player's overall stock, not a single animal
- The exact algorithm for assessing stock quality is deferred to systems design

**Three-phase arc:**

| Phase | Order source | Market access |
|-------|-------------|---------------|
| Early (tutorial) | Scripted NPC orders with fixed requirements | NPC market only |
| Mid | Procedurally generated NPC orders | NPC market only |
| Late | Procedural NPC orders + player-to-player listings | Full market |

---

## Order System

Orders specify a target trait combination. Fulfilling an order removes one animal from the player's collection and awards gold.

Orders are procedurally generated. Each order is assigned a difficulty rating that controls:
- How often that order appears
- What reward it carries
- Whether it appears at the player's current inferred progression level

The puzzle is breeding an animal that satisfies the trait requirements. The genetics system is the primary tool for solving that puzzle.

---

## Animal Roles

An animal can be assigned to one role at a time. Traits determine how well an animal performs in each role. The player must balance across roles rather than optimizing for a single one.

| Role | What the animal does |
|------|---------------------|
| Breeder | Occupies a breeding pen; breeds passively with pen-mates |
| Producer | Generates resources over time; rate and quality are trait-gated |
| Builder | Consumes resources to construct or upgrade pens and enhancements |
| Market (sell) | Listed on the sell market; animal is lost when purchased |
| Market (rent) | Listed on the rent market; animal is locked in the rented-out pen until the rental period ends |

An animal listed on the market is unavailable for any other role until the listing resolves.

---

## Breeding

Breeding is passive and habitat-driven. The player does not manually pair parents. Instead:
- The player assigns animals to a pen
- Animals in the same pen breed automatically over time
- Offspring inherit traits from pen-mates via the genetics system
- The player's strategic choice is which animals to place together

Breeding speed is a trait. Lifespan is a trait. Both are heritable.

There is no freeze mechanic. Animals age and die. Death self-regulates the total population and ensures the player must keep breeding rather than accumulating a static herd.

---

## Market

Two markets exist, both asynchronous. Listings remain active until purchased by another player or by an NPC bot.

**Sell market**
- Animal is listed at a player-set price
- Animal leaves the seller's collection permanently on purchase
- Creates a genuine "keep vs. sell" decision, especially for high-trait animals

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
- Algorithm for assessing player stock quality (progression inference)
- Exact trait list and what each trait controls
- Resource types and what they build
- Rental duration mechanics
- NPC bot pricing behavior
- Creature identity and visual trait expression
