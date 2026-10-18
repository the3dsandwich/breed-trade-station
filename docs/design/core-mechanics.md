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

Gold is the single shared resource spent and earned throughout Requests, Release,
and the first NPC trader. The larger sell/rent market is still planned. There is
no separate upkeep currency.

- Every living animal costs a small, flat amount of Gold in upkeep. This is deducted in a periodic batch on an interval, not continuously every tick — a readable, occasional deduction rather than a constant flicker of tiny ones. Unlike breeding's deliberate one-cycle cap on a long offline catchup gap, upkeep is a flat linear cost, so a long gap correctly charges for every interval that elapsed, not just one.
- Gold is clamped at zero; the player never goes into debt.
- At zero Gold, animals are **starving**: breeding speeds up rather than stopping or slowing, with a clear UI indicator. This is deliberately self-correcting — Gold is already floored at zero, so animals born during a shortage don't cost anything more right now, and they're exactly the new supply the player needs to Release or fulfill Requests with to earn their way back out. A slowdown was tried first and rejected: it throttled the player's only recovery mechanism precisely when they needed it most.
- Fulfilling Requests and using Release are the two ways to bring Gold back up.

The planned construction-resource layer (Core Loop step 3) remains undecided. The first playable pen purchases use Gold as a balance trial; see Building and expanding pens below. This does not implement builder affinities or resource production.

Exact upkeep cost per animal, the deduction interval, the starting Gold balance, and the starving-rate multiplier are placeholders pending playtesting balance, same as breeding's duration and mutation-rate constants.

The current trial charges **1g per Puff every five minutes**, changed from ten
seconds when the trader was added. Returning play earned 16g by releasing eight
spares, then lost it all at the next upkeep charge less than three seconds later.
The slower interval gives more room to choose a purchase. It is not a new grace
period after a sale: a sale just before a charge can still lose Gold immediately.
The wallet shows the current herd's charge and time until it is due. Long offline
gaps still charge every elapsed interval; returning with zero Gold remains possible.

---

## Release

Release lets the player remove animals while keeping at least one male and one female, for a small flat Gold return — smaller than a typical Request reward. It's a population-management valve independent of Requests: it works on animals regardless of whether they match an open request, for Puffs the player doesn't want to keep or can't place.

Release supports both a single-animal flow (select one, release it) and a bulk flow (select several, confirm once) so clearing out multiple unwanted animals doesn't mean repeating the single-select loop one at a time.

### Remembering keepers

The journal's **Keep this Puff** toggle records a player's decision to keep a
useful animal. A **Keeper** label appears in the herd and pen lists, and the mark
survives save/reload. No Puffs are marked automatically, including bought stock
and children of keepers. This is a management choice, not an inherited trait or
a claim that an animal is a better parent.

Keepers cannot be released or used to fulfill a request. Turn off the journal
toggle before deliberately letting one go; the last-male/last-female rule still
applies afterward. A bulk selection containing a keeper removes nothing and
explains the block. The player can deselect that Puff and release the spares.
Movement, breeding, growth, pen space and upkeep are unchanged.

A successful release now ends bulk-release mode and clears its selection, so
the next Puff click opens its journal and the trader is usable immediately.
Blocked or empty attempts keep the selection for correction. Release still
pays the same 2g per Puff.

Returning play motivated this: preserving useful parents while selecting eight
spares required an external list of IDs. No accidental loss occurred in that
baseline. This trial brings those keep decisions into the game; names, filters,
automatic ranking and new pen capacity are separate questions. Watch whether
players revise their keepers as new offspring appear, rather than marking every
Puff and avoiding the keep-versus-sell decision.

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

**Implementation:** new games start with 2 generic pens, capacity 4 each. Players can buy additional pens and capacity with Gold, as described below. Assignment uses the journal or canvas; drag-and-drop and pen-affinity aggregation are not built.

---

## Breeding

Breeding is passive and habitat-driven. The player does not manually pair parents. Instead:
- The player assigns animals to a pen
- Animals in the same pen breed automatically over time
- Offspring inherit traits from pen-mates via the genetics system
- The player's strategic choice is which animals to place together

Breeding speed is a trait. Lifespan is a trait. Both are heritable.

There is no freeze mechanic. Animals age and die. Death self-regulates the total population and ensures the player must keep breeding rather than accumulating a static herd.

**Implementation:** true Mendelian meiosis is live in `packages/shared` and wired into `apps/game` — each parent contributes one randomly-segregated allele per gene locus, with a small (placeholder, pending playtesting) per-allele mutation chance. A pen with 2+ occupants and open capacity accumulates breeding progress each tick, including offline catchup; on completion it picks one random M and one random F occupant as parents (same-sex pens hold progress at the cap until a compatible mate is placed) and the offspring joins the same pen immediately. A very long catchup gap fires at most one birth per pen — it does not simulate multiple breeding cycles that would have happened in between. Newborns now need one minute of game time to grow before they can breed (see Growing Puffs below). Not yet implemented: breeding speed/lifespan as heritable traits, full aging, and death.

---

## Market

### First NPC trader — live trial

The wallet opens a visiting trader with three saved offers: a **Large female**,
a **Small male**, and a **Medium Puff of random sex**. Other visible traits vary.
These give players new breeding choices without selling Extra-small or
Extra-large animals directly. The player sees the same visible traits as in
their herd, not genes or predicted offspring odds. The size/sex slots are fixed;
the trader is not yet tailored to requests or inferred herd progress.

Buy **one Puff for 15g per local calendar day**. The chosen animal joins pasture,
grown and selected in the journal, ready to move into a pen. Buying does not count
as a birth. Purchase is unavailable during bulk release, and the game checks
Gold and the daily limit again when the player clicks.

Offers and the used purchase stay saved across reloads. A later local date brings
one new set, whether the game stayed open or was closed. Missed days do not bank
purchases. Moving the device date backward does not refresh stock or allow buying
from a future-dated visit. The single-player prototype trusts the device clock;
advancing it is not prevented. Restart clears stock along with the whole save.

A bought Puff may happen to satisfy a current request. That is allowed; the
one-per-day purchase bounds immediate resale. Releasing it pays only the normal
2g. The trader does not remove the need to breed rare body sizes. Price, stock
mix, daily limit, and upkeep are trial values, not proven long-term balance.

Next play question: does a bought parent create a useful breeding experiment,
and does tomorrow's stock add a reason to return? Also watch whether fixed size
and sex slots become repetitive or slower upkeep makes surplus Gold meaningless.

### Planned sell and rent markets

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


### Breeding help in the prototype

The game shows a short guide: click a Puff, then a pen to move it. Breeding needs a grown male, a grown female, and room for a baby. Each pen also has readable text showing its used spaces and what it needs next. A full pen asks the player to make room; an empty or same-sex pen asks for the missing parents. Only a compatible pair with room shows breeding progress and a rough countdown. At zero Gold, the countdown uses the existing three-times-faster breeding rate. These hints do not change breeding rules.

### Keeping a breeding pair (playtest round 2)

This replaces the earlier rule that any Puff can be released at any time. Single release, bulk release, and request fulfillment must keep the last male and last female. Buttons explain why they are disabled. A blocked batch removes nothing. The game also checks these rules when an action is submitted, counts each released Puff only once, and uses the saved request's traits and reward.

New games start with at least one female and one male who can pass on either sex. An older save with no breeding pair offers a confirmed new game in normal builds. Cancel keeps the save. Restart clears the entire save, including Gold, pens, and requests, so it cannot be used to collect extra starter rewards. The development reset stays available.

### Readable controls and small screens

Puff details and sale/release buttons sit directly below Gold in the sidebar. Breeding help and live pen status sit below the play area. Requests and Puff details use full trait names and values, such as “Eye color: Red”; save files and genetics keep their existing codes. The play area keeps its 800×600 shape and shrinks to fit narrow screens, with the sidebar stacked below it.

### Growing Puffs

New births spend 60 seconds of game time **Young** before joining the possible
parents in their pen. The goal is to keep the first few births tied to the
adults the player placed, giving time to inspect a baby before it can change
the next cross. One minute is a playtest value, not final balance. It also
makes testing a promising offspring slower; watch for idle waiting.

Young Puffs still take up pen space and have their normal visible traits.
They can be moved, sold for a matching request, or released under the existing
last-male/last-female safeguards. The herd list, pen view and journal show
when they can breed. A pen waiting for a young mate shows a growth countdown.
A full pen still stops births, and adult pairs still breed at the same rate.
This does not prevent a pen with several adults from refilling during moves.

Growth uses game time, including time away. Zero Gold speeds up adult
breeding but does not shorten growth. Existing saved Puffs and newly seeded
starter Puffs are ready immediately; old birth dates do not create a new wait.
The next birth receives the new growth deadline.

Breeding progress is added only for the part of a tick with at least two
grown occupants. Existing stored progress stays, including the old same-sex
adult bank. A mate becoming grown can therefore use progress already stored
in that pen; there is no promise of an extra full cycle after growth. Genetics,
pen capacity, birth placement, rewards and upkeep otherwise stay the same.


## Building and expanding pens

Players asked to work on several breeding goals at once. **Manage pens** in the
ranch header opens a popup with two choices:

- A new pen starts empty with four spaces. It supports another independent
  group of parents. Pens three through six cost 25g, 50g, 75g and 100g.
- Expanding a pen keeps its occupants and adds two spaces: four to six costs
  20g, and six to eight costs 40g. This gives more room for offspring before
  sorting, not another independent parent pair within the same pen.

The initial limits are six pens and eight spaces per pen. These prices and
limits are a playtest trial. Gold is used now so this works with existing
requests and releases; the future builder/resource system is still deferred.
Purchases take effect immediately. Empty capacity has no upkeep. Existing
Puffs retain their normal upkeep, keeper marks and growth rules. Babies stay
in their birth pen; all grown males and females there remain eligible parents.
No automatic movement, fixed pairing, new genes or speed bonuses are added.

The popup shows current Gold, the price, used space, limits and any missing
Gold. Building is disabled during bulk release. Requests and upkeep continue
while it is open, so the purchase checks the latest balance and quote again.
Saved pens load with their existing size and occupants; no reset is needed.

Returning players at zero Gold must earn purchases. Check how much repetitive
breeding/releasing this requires, whether valuable parents survive the choice,
and whether extra pens make three distinct goals easier to pursue. More room
alone does not prove better long-term progression.


### Release spares while reviewing one pen

The Pens view now lets the player select individual occupants and confirm a
release without finding them again in the full herd list. Nothing is selected
automatically. The button shows the exact count and normal 2g-per-Puff reward.
If a chosen Puff matches a request, the summary points out that a request sale
may pay more; it does not block a deliberate release.
Keeper and last-male/female protection still block the whole batch; unchecking
a protected Puff lets the player release only the others.

Choices apply only to the current pen and clear when switching pens, leaving
the view, closing the popup or completing a release. Moving a marked Puff to
pasture drops its mark. New babies arrive unselected. The popup stays open
after success, with a focused result message and the remaining occupants.
Global bulk release still makes this pen view read-only.

This shortens the path from judging an offspring to acting on that decision.
It does not empty pens automatically, choose useful parents, move babies at
birth or add space. On October 5, the returning player completed both an
Extra-small/Red request and an Extra-large request before this change; the
observed problem was repeated lookup of already-chosen spares, not impossible
goals. Watch whether easier handling leaves more attention for the next cross.

### Seeing who can become a parent

Each pen's status shows how many grown males and females are inside, including
when the pen is full. Young Puffs join those counts when they finish growing.
When more than one male or female is available alongside the other sex, a short
note explains that any grown male and female can become parents once there is
room for a baby. The counts do not mean a full pen can breed.

This helps players notice when offspring have joined a breeding group. In the
October 6 fresh playtest, an old pen resumed breeding with a grown son after
the original father moved to a new pen. Birth history explained the result,
but the current group was harder to see at a glance. The returning player also
had grown spares become parents while rearranging an expanded pen.

This is information only: no fixed pairs, excluded parents, automatic movement,
new odds or save changes. The player still chooses which animals share a pen
and learns from the actual parents recorded in birth history.

### Remembering completed requests

**Past sales** on the request board keeps the latest ten successful request
sales, newest first. Each receipt shows the completed requirements, Gold earned,
and the sold Puff's visible traits and ID. This records a result the player
earned; it does not add another reward or change future requests.

The October 7 returning player finally bred the Black, Large-eared female
requested across several sessions. Selling her for 35g made room for a new goal,
but the old request disappeared and its reward could later be spent on upkeep.
The receipt gives future successes a lasting, readable record beyond the wallet.

Older saves start with an empty history. Earlier sales cannot be reconstructed
and are not invented. Releases are not request sales and do not appear here.
The history is limited to ten receipts, not a lifetime collection or achievement
system. It does not reveal genes, predict offspring or choose the next parents.
