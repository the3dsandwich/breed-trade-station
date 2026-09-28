# Dusk Ranch

The first full visual pass gives Breed Trade Station the feel of a small,
quiet moon ranch. It uses warm cream, gold and copper against a plum evening.
This is a working art direction, ready for player feedback.

## What is built

- Procedural pixel Puffs, with five body sizes, three coats, three ear sizes,
  and two eye colors. Cream eye surrounds keep brown eyes visible on dark coats.
- Gentle, separately timed hops and blinks. A live reduced-motion setting
  stops creature motion and selection pulses without stopping game time.
- A quiet meadow with a moon, flowers, stones and framed breeding pens.
- A cream Puff journal, gold wallet, request board and square controls.
  Gold brackets mean selected; a green check means a request match; a coral
  mark with an X means selected for release. A legend explains these marks.
- A wider desktop sidebar. On smaller screens, Gold and Puff details come
  immediately after the pasture, before breeding help and requests.
- Stronger text contrast and visible button focus. Normal text stays normal
  text; system monospace is reserved for labels and counters.

Everything is drawn in TypeScript/Pixi or HTML/CSS. There are no downloaded
art assets, fonts or new packages. Pixi remains the game renderer; React owns
panels. This shared web view is also the Linux app's UI.

## Keep these constraints

Coat, eye, body and ear traits must remain distinguishable. The art should
help players choose breeding stock. Decorative details must not intercept
clicks or hide Puffs. Keep the 800 × 600 logical board and pen positions so
existing interactions work. Save files and game rules are unchanged.

Puffs use a fixed two-pixel art grid. Their click areas include their ears.
Static shapes are drawn only when their inputs change; idle motion updates
Pixi objects directly instead of rendering React every frame. Selection
and release marks sit behind the body, while match checks sit clear of ears.
The renderer disables antialiasing and the canvas uses pixelated scaling.
Fractional phone scaling still makes some art pixels uneven.

CSS colors live in `apps/game/src/vars.css`; creature colors live in
`apps/game/src/canvas/pixelPuff.ts`, with scene colors in `drawPasture.ts`
and `PenView.tsx`. Keep their plum/cream/gold direction aligned.

## Review and next session

Claude Opus 5.5 reviewed the source and proposed the art direction; Codex and
its playtester checked the implementation. Before/after screenshots use the
same saved starter herd. This is a short playtest, not proof of long-term fun.

The fixed board still makes Puffs small on phones, and overlapping Puffs can
be hard to select directly. Canvas animals themselves are not keyboard
navigable; the journal now supplies another way to choose and move them.

Next play question: can a player spot a useful parent, read what a request
needs, and make a breeding plan without repeatedly opening Puff details?

## Choosing the next breeding pair

The **Choose a Puff** button above the journal opens a popup list. Every living
Puff is available, including animals hidden behind
another sprite. Rows show sex, body size and color, eyes, ears, location, and
whether a request matches. IDs distinguish otherwise identical Puffs. The list
keeps the herd's insertion order and adds newborns at the end. The popup fits
the screen, with two columns on desktop and one on phones. Only its list
scrolls; opening it does not push the journal or other panels down. It does
not rank parents or predict inherited traits.

Choosing a row selects that Puff, closes the list, and returns focus to the
button. Choosing the current Puff keeps it selected. Escape also closes the
list, as does its visible Close button. The native dialog blocks keyboard
access and clicks on the pasture and panels behind it. The game
clock continues as before. In bulk-release mode, rows instead toggle the
existing release batch
and stay open. A marked count and **Done choosing** button let players close
the popup before using the existing confirmation controls. Last-parent
protection still applies. Nothing is released by choosing a row.

The journal now has **Move to Pen** and **Return to pasture** buttons. Current
and full pens are disabled with a written reason. Moving keeps the Puff
selected and focuses its updated location. Sale or single release returns
focus to the picker. Players can choose and place parents using Tab and Enter,
while existing canvas clicks still work. These controls use the same pen and
selection actions; genetics, breeding, economy and saved data are unchanged.

Pixi's unused accessibility overlay is disabled before the renderer starts.
It added an empty 800-pixel-wide layer on Tab and widened the phone page,
even though no canvas objects had opted into it. Real HTML controls now
provide Puff selection and movement. If future canvas objects opt into Pixi
accessibility, revisit the overlay sizing rather than simply re-enabling it.

### Why this slice

The baseline carried save had nine Puffs, one full pen and one empty pen.
Every tested real-save pasture Puff could be clicked at its exact center,
but sex required opening each Puff's journal and phone bodies were tiny. A
separate prepared fixture placed two Puffs at exactly the same location and
confirmed that one covered the other. This fixture is not earned progression.

Hypothesis: letting players compare visible traits and choose any Puff will
make it easier to clear a full pen and form a useful next pair. Observe whether
a player uses the list to choose parents for an unmet request, rather than
just moving animals at random. A short successful breeding test alone does
not establish long-term engagement.

## Recent birth records

Goal-driven playtests found that a small pen creates a useful keeper/sale
choice, but players had to remember long IDs outside the game to learn from
the outcome. Increasing pen capacity would postpone that sorting. This slice
keeps capacity, birth location and all breeding/economy rules unchanged.

The Puff popup includes **Your Puffs** and **Recent births** views.
Each birth record shows the baby, its actual mother and father, their visible
traits at birth, and the pen. It records the chosen parents, which can include
an earlier baby; it does not guess from the pen's current occupants. Records
show observed results, not hidden alleles or promised breeding odds.

The latest 20 records survive save/reload and the sale or release of any
recorded Puff. Numbers count recorded births, not the herd's entire history.
Older saves start with no records; earlier lineage is unknown. Catchup births
say they happened while away with an unknown exact time. This is a small recent
history, not a permanent family tree.

**Open baby journal** selects a living child and closes the popup. A child
that has left the herd stays in the record but cannot be selected. During bulk
release, this action is disabled with an explanation; reading records does
not add a Puff to the release batch. Escape and Close retain the existing
focus behavior. Parents stack vertically on phones, and history scrolls
inside the popup without adding another permanent sidebar panel.

Next play question: can a player explain which cross produced a useful Puff
and choose the next breeding experiment using these records alone? Test that
before adding pen capacity or automatic movement of newborns. Per-pen result
management is described below; the separate bulk-release mode surprise remains
future work.

## Handling one pen at a time

The **Pens** view in the same popup shows one pen's current occupants, its
used spaces, and the existing breeding status. Choose a pen from the list
to compare its Puffs without searching the whole herd. The pen choice stays
while switching between popup views; it is temporary UI state, not saved
game progress. Reopening the popup still starts at Your Puffs.

Each occupant offers **Open journal** and **Move to pasture**. Opening the
journal keeps the existing selection/focus behavior and offers the normal
sale, release and assignment controls. Moving to pasture keeps the popup
open, refreshes the occupants, returns focus to the pen chooser, and announces
the move. It does not sell, release or remove the Puff from the herd.

A **Born here · Birth N** label appears only when a retained birth record
identifies this Puff as born in this pen. Moving an animal from another pen
does not change its birthplace. Missing older records remain unknown. The
label does not mean a Puff cannot breed: newborns still join the breeding
pool immediately under the current rules.

Breeding and upkeep keep running. Clearing a place can allow another birth,
so the list and count stay live. There is no empty-pen or move-all automation,
new capacity rule, or fixed parent-pair assignment. During bulk release the
pen view is read-only, with a clear explanation; its controls cannot change
the release batch or move marked animals.

Baseline carried play required repeated trips through the birth list and
journal to handle two known offspring. This experiment keeps that decision
inside one pen's list. Next test: can players keep useful breeding stock,
make space deliberately, and continue toward an unmet request with less
bookkeeping? A lower click count alone is not proof of long-term enjoyment.
