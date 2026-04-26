# Bunny Breed — Original Game Analysis

Source: https://github.com/chichichen10/Bunny (Unity, older version)

This document describes what was built. It is reference material only. Design decisions for the remake go in `docs/design/`.

---

## Overview

Bunny Breed is a single-player genetics simulation game where the player breeds rabbits to fulfill trait-specific orders. The core loop is: breed rabbits → select offspring → mature them → submit to orders → earn gold → buy items → breed better rabbits. The original game had an educational hook teaching Mendelian genetics through play.

---

## Genetics System

Every bunny has a gene array of 10 integers, each valued 0, 1, or 2.

| Value | Meaning |
|-------|---------|
| 0 | Homozygous recessive (aa) |
| 1 | Heterozygous (Aa) |
| 2 | Homozygous dominant (AA) |

Gene slots and what they control:

| Index | Trait | Notes |
|-------|-------|-------|
| [0][1][2] | Body size | Three additive loci, sum 0–6 |
| [3] | Eye color | Single locus |
| [4] | Unused | Reserved/placeholder |
| [5][6] | Ear size | Two additive loci, sum 0–4 |
| [7][8] | Body color | Two additive loci, sum 0–4 |
| [9] | Sex | 0=Female, 1=Male |

---

## Phenotype Calculation

Genes map to visible traits (phenotypes) as follows:

**Body Size** (genes[0]+[1]+[2], sum 0–6):

| Sum | Label |
|-----|-------|
| 0 | XS |
| 1 | S |
| 2–4 | M |
| 5 | L |
| 6 | XL |

**Eye Color** (genes[3]):

| Value | Label |
|-------|-------|
| 0 | RD (Red) — recessive |
| 1–2 | BR (Brown) — dominant |

**Ear Size** (genes[5]+[6], sum 0–4):

| Sum | Label |
|-----|-------|
| 0 | S |
| 1–3 | M |
| 4 | L |

**Body Color** (genes[7]+[8], sum 0–4):

| Sum | Label |
|-----|-------|
| 0 | BL (Black) — fully recessive |
| 1–3 | MX (Mixed) |
| 4 | WH (White) — fully dominant |

The visual sprite for a bunny is looked up by a combination of body size category, body color, and ear size. Sprites are named in the pattern `{size}{color}{ear}.png` (e.g. `2BL.png` = size category 2, Black body, Large ears).

---

## Breeding Mechanic

The breed scene shows all matured rabbits. The player selects one male and one female.

**Meiosis function** (per gene slot, called once for each parent):

```
Meiosis(k):
  k == 2 (AA) → always returns 1
  k == 1 (Aa) → returns 0 or 1 with equal probability
  k == 0 (aa) → always returns 0
```

Each baby's gene at slot j = `Meiosis(father.genes[j]) + Meiosis(mother.genes[j])`

This produces standard Mendelian ratios:
- AA × AA → always AA
- aa × aa → always aa
- Aa × Aa → 25% aa / 50% Aa / 25% AA

**Litter**: 3–9 offspring generated per breed (random).
**Selection**: Player can keep up to 3 from the litter. The rest are discarded.

---

## Bunny Life Cycle

1. **Born** — immature state ("Bunny"). Can be submitted to orders.
2. **Matured** — triggered by feeding a Carrot item ("Matured Rabbit"). Can breed. Cannot be submitted to orders.
3. **Aging** — tracked in game ticks. 1440 ticks = 1 in-game day. Bunnies die (removed from game) after 2 in-game days unless frozen.
4. **Frozen** — Freeze Capsule item stops aging. Age is preserved. Unfreeze resumes from the saved age.

The game clock runs at 1 tick per real second by default, with a 200x fast-forward toggle.

---

## Items

| Item | Price | Effect |
|------|-------|--------|
| Carrot | 20g | Matures a bunny, enabling it to breed |
| Freeze Capsule | 500g | Freezes a bunny; aging stops until unfrozen |
| White Rabbit | 100g | Adds a fully dominant rabbit (all genes=2) to collection |
| Black Rabbit | 100g | Adds a fully recessive rabbit (all genes=0) to collection |
| Gene Scanner | 200g | Reveals the exact gene string of a specific rabbit |

White/Black Rabbit items give the player a genetic anchor — pure-line breeders to drive traits in a specific direction. The Gene Scanner is per-bunny; without it the player only sees phenotype labels, not the underlying genotype.

---

## Shop

Unlocks at player level 3. Inventory available by level:

| Level | Available Items |
|-------|----------------|
| 3–6 | Carrot, White Rabbit, Black Rabbit |
| 7 | + Gene Scanner |
| 8+ | + Freeze Capsule |

---

## Order System

Orders specify a target phenotype across up to 4 traits (body size, eye color, ear size, body color). The player selects one immature bunny that meets all requirements and submits it. The bunny is removed from the player's collection on submission and gold is awarded.

Three categories:

**Level-Up Missions** (Contests 1–11): One per player level. Completing one levels up the player and awards 3000g. Requirements escalate in specificity across levels.

| Contest | Requirement |
|---------|-------------|
| 1 | Any bunny |
| 2 | Medium ears |
| 3 | Large ears |
| 4 | BR eyes |
| 5 | Medium body |
| 6 | Small ears |
| 7 | RD eyes |
| 8 | Small/XS body + RD eyes |
| 9 | XL body |
| 10 | XS body |
| 11 | XS/S body + BR eyes + L ears + BL color |

**Weekly Orders** (Contests 12–18): Available at level 10. One per real calendar day. Fixed requirements, 1000–5000g rewards.

**Special Contests** (Contests 19–21): Available at level 10 after 7am real time.
- *Traveling Merchant Returns*: Requirements randomized per in-game day. 500g.
- *Secret Merchant*: Fixed hard requirements (XS, BR, S, BL). 2000g.
- *Space Depot Cup*: Requirements randomized per in-game day. 10000g.

**Deposit** (Contest 22): Available from level 3. Discard any unwanted bunny for 50g.

---

## Player Progression

- Levels 1–10.
- `globalProgressTracker` is a secondary counter that drives tutorial dialogue state and controls which UI buttons are visible.
- UI features unlock progressively by progress step: Breed (step 3), Missions (step 5), Shop and Bag (later steps).
- Weekly contests and special events only available at max level (10).
- Contest randomization (Contests 19 and 21) resets every 1440 ticks (1 in-game day).

---

## Save System

Stores: full bunny list with all gene data and status, gold, item inventory, player level, experience, in-game time, completed and active contest lists, global progress tracker, randomized contest requirements, and a GUID (used for de-duplicating educational survey responses in the original).

---

## What Was Never Built

- Player-to-player market / trading of bunnies — no code exists for this at any stage.
