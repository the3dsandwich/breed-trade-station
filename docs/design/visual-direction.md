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

The next small experiment adds a collapsed **Choose a Puff** list above the
journal. Every living Puff is available, including animals hidden behind
another sprite. Rows show sex, body size and color, eyes, ears, location, and
whether a request matches. IDs distinguish otherwise identical Puffs. The list
keeps the herd's insertion order, adds newborns at the end, and scrolls within
a fixed height. It does not rank parents or predict inherited traits.

Choosing a row selects that Puff, closes the list, and returns focus to the
summary. Choosing the current Puff keeps it selected. Escape also closes the
list. In bulk-release mode, rows instead toggle the existing release batch
and stay open; the existing confirm button and last-parent protection still
apply. Nothing is released by choosing a row.

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
