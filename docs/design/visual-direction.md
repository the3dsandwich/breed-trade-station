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
be hard to select. Canvas animals are still not keyboard navigable. These
are existing interaction limits; the new DOM details and focus styles do not
solve them. A later round should explore an accessible herd list or zoomed
inspection, without losing the open-ranch feeling.

Next play question: can a player spot a useful parent, read what a request
needs, and make a breeding plan without repeatedly opening Puff details?
