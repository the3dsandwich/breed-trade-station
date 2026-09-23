# Three playtest rounds

This review uses a separate playtester and change agent in each round. Playtests run in isolated browser saves. Browser tests may read game state to find canvas objects and check results; gameplay actions use the UI.

## Round 1 — Explain breeding and fix reloads

Before changes, the playtester placed a male and female in a pen, watched a baby arrive, and released the baby. Reload then changed game time from 38,563 ms to 48,089 ms and Gold from 28 to 20. The saved timestamp was old, so the game charged for time already played.

Plan: use one save path with a fresh timestamp; explain how to place Puffs; show what each pen needs, its breeding progress, and when it is full. Keep current breeding rules.

Implemented: a plain-language breeding guide, readable pen status and countdown, and a shared save function that timestamps state before saving. Added focused pen-status and save tests.

Retest: immediate reload added 633 ms rather than replaying 9,526 ms; Gold stayed at 27. Missing-parent messages, countdown, birth, and reset passed. Reset restored eight Puffs, 50 Gold, and empty pens. The full-pen message passed after a second birth. Zero-Gold and same-sex edge cases have unit coverage; this browser pass did not cover both. Game unit tests, build, and lint passed.

## Claude second opinion

Claude Code reviewed selected design and source files after the user approved sharing them. It raised full-pen feedback, zero-Gold breeding speed, and hard early requests. These are useful playtest questions.

Its claim that eight starter Puffs leave no room to breed was too strong: Puffs can stay in the pasture outside the pens. Full pens can also be freed by moving a Puff out, without releasing it. We did not treat those claims as proof that starting capacity must change.

## Round 2 — Keep breeding possible

Before changes, the playtester released seven Puffs and fulfilled a request with the eighth. The game had zero Puffs and 89 Gold, with no recovery after nine seconds and reload. A second playthrough bulk-released all eight starters. Both routes had no warning.

Plan: guarantee a starting pair; block removal of the last male or female with a clear reason; offer a confirmed full restart for already-stuck saves. Check these rules in the game actions, deduplicate release IDs, and validate request traits and rewards against saved requests. This deliberately changes the earlier release-any-Puff rule.

Implemented: guaranteed starter pair, central removal guards, disabled controls with reasons, safe request checks, and confirmed recovery for stuck saves. Game tests (63), build, and lint passed. Browser retest: releasing all eight was blocked; releasing six extras left a pair; final male/female buttons explained the block. A surplus request sale paid 10 Gold (50 to 60), while a request for the last female was blocked. An empty-save fixture kept its state on cancel and restored eight Puffs, 50 Gold, both sexes, and empty pens on confirmed restart and reload. The kept pair bred a baby: herd and pen both grew from two to three. No uncaught browser errors. Sale and recovery checks used prepared saves in isolated profiles; all actions used the UI.

## Round 3 — Make the game easier to read and use

The reviewer selected Puffs, placed a pair, and watched the herd grow from eight to nine. At 1280 × 900, Puff details began at y=868 and action buttons fell below the screen. At 800 × 700, the canvas began at x=-118 and the sidebar extended to x=918. Trait text used codes and raw keys such as eyeColor: RD.

Plan: use shared readable labels without changing saved data; put selected details and actions near the top; fit the canvas and panels to smaller screens while keeping clicks correct. Add browser regression checks for these layouts and the guarded gameplay actions.

Implemented: shared trait labels, selected Puff details below Gold, breeding help below the board, and responsive canvas/panel layout. Five new browser tests cover the changed interface and key gameplay actions.

Independent retest passed: at 1280 × 900 the Release button was at y=399–429 and fully visible. At 800px and 390px, there was no sideways overflow; scaled clicks selected, assigned, reselected, and moved Puffs out of pens. A surplus sale paid 20 Gold (50 to 70). Both last parents stayed protected from release and request sales. The remaining pair produced a baby, reaching three Puffs and 3/4 pen spaces. This pass used a known save fixture and read-only state checks; all game actions used clicks. No uncaught browser errors.

## Final checks

All three rounds are complete. Unit tests (63 game and 33 shared source tests), build, lint, typecheck, and all 11 browser tests passed. The shared test runner also runs compiled copies of its tests. Each round had separate play and change agents, followed by an independent browser retest.

Small screens still need vertical scrolling, and Puff tap targets shrink with the canvas. The existing large-bundle warning remains.

## Round 4 — Add an installable Linux app

Review: the project already chose Tauri, but had no desktop wrapper or Linux package. The main risks were bundled game files, WebGL, worker timers, close/save behavior, and matching the Linux runtime used to build and run the app.

Implemented: a Tauri 2 window, a Flatpak package for x86_64, desktop icon and menu entry, and saving before the native window closes. GitHub Actions builds on PRs to main, pushes/merges to main, and manual runs. Rust compiles inside the matching Flatpak SDK with locked, offline dependencies. The installed game has no network or broad filesystem access.

Retest method: install the actual package in CI, check native WebGL and autosave, use desktop mouse clicks to assign parents, wait for a birth, release the baby, then close and reopen to check the save. A second launch checks the shipped runtime with its normal offline permissions. The workflow uploads results and screenshots for review; only a fully passing run uploads the app bundle. Independent review also added overlap handling for random starter Puffs. See [Linux build instructions](../architecture/linux-builds.md) for downloads, saves, and current platform limits.

## Experiment — Compare a selected Puff with requests

Observed gap: both scripted runs saw a birth and fulfilled a request using a starter Puff. Neither shows that inspecting the newborn prompted another breeding goal. Requests showed targets, while Puff details showed only complete matches. Both runs ended with Pen 1 full and Pen 2 empty; existing guidance already explains making room. The returning profile reused a new-game save, so it offers no evidence of long-term engagement.

Experiment: each request now labels its comparison “Selected Puff” and marks every required trait “Matches” or “Different”. Differences include the selected Puff's actual value using readable labels. Without a valid selection, the list shows a selection hint. Bulk release mode hides both comparisons and the hint. Requirements and rewards remain visible, with wrapping text for narrow panels.

Hypothesis: seeing shared traits and remaining differences will help a player choose a next breeding target and consider keeping useful offspring. These are observations of visible traits, not predictions of inheritance or breeding success. Helpfulness for an established herd remains untested.

No existing design decision changes. The comparison adds no fulfillment action, parent ranking, allele display, or breeding probability. Passive breeding, request generation, rewards, breeding-pair protection, and saved data retain their existing behavior.

Next session: after the first birth, ask the player to inspect the baby, choose a request to work toward, and explain which Puff they would keep or move and why. Observe whether they independently arrange another breeding attempt. Record confusion and choices; another birth alone is not proof of enjoyment.

Validation pending: focused tests cover complete, partial, and zero matches, readable actual values, changing selected traits, and a replacement request. No tests or browser checks were run while preparing this source-only change. Manually check switching and clearing selection, removing the selected Puff, entering and leaving bulk release mode, and request replacement. Check readable requirements, comparisons, and rewards at 390px and 800px without sideways overflow. Confirm a partial match offers no fulfillment action and the last male and female remain protected.
