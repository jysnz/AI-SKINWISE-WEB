# Cook ledger: AI SkinWise Web

Copy this to `cook/ROUNDS.md` at the start of a run. Keep the header current. Add one round entry per round, newest at the bottom. Label every number as measured or eyeballed.

Started: 2026-11-17
Time: floor none | cap 1.5h
Bar: composition [99.9] | light [99.9] | color [99.9] | materials [99.9] | detail [99.9] | motion [9/10]
Calibration offset: [none yet] (from [user estimate, date])
Usage: [5h window], about 20% per hour, never 100%
Gate: stills approved [no] | final render [not started]
Best so far: round [N], `cook/stills/r[NN]/`, [commit or snapshot]

## Decisions

Made without asking, one line each.
- Intake skipped: the prompt answers it and the user is near their usage limit.
- Detection runs server-side via the deployed endpoint, because the TFLite model and Supabase lookups live on the server.
- No build step, because it keeps the handoff cheap for the next agent.
- Demo modes via URL params (`?demo=loading|result|low`, `?theme=dark`) so states can be screenshot without the (currently suspended) server; placeholders are canvas-generated skin textures, demo-only.
- Restored exact light tokens `divider #F5F5F5` and `error #FF5252` from theme_constants.dart (previous build had drifted); added one derived border token `--line` (15%/20% text-surface mix) because exact tokens are invisible as borders on same-value surfaces; added `warn #B26A00` (not in Flutter theme) for the low-confidence state.
- Low-confidence screen got the same ring structure as success (amber ring at `details.final`, warn badge, unified labels) plus an "Edit details" ghost CTA; "Scan again" became the filled primary on all result screens.
- Detection experience: scan strip over the uploaded photos + slow progress bar with % + stage labels mirroring real server stages (enhance/TTA inference/symptom match) + Cancel (aborts the fetch). Considered and rejected: 3-row stage checklist and decorative particles (restraint); "also considered" runner-up conditions (server does not return them).
- Mobile stills use an iframe harness + 390px crop because headless Chrome clamps window width to 500px (measured: `--dump-dom` probe, ICB=500 at requested 390).
- Result stills captured with `--force-prefers-reduced-motion` because rAF animations (ring, count-up) do not track headless virtual time (measured: mid-flight values at 2x budget).

## User feedback inbox

Exact words. Close an item only when a still or clip proves it.
- [2026-11-17, 2nd message] "improve the UI/UX of the system, add animations where it is necessary. In the detection, add animation to it." | round 1 | partially closed: UI/UX + animations built and re-rendered (see r01 stills); awaiting user approval at Gate.
- [2026-11-17, 3rd message] "Occupy the full width of the desktop and further improve the UI and UX of the system." | round 2 | open

---

## Round 1 (2026-11-17, ~15:01 to ~15:30)

Focus: user feedback (UI/UX + animations, detection animation) on top of the unviewed round-0 build.
Changes: entrance stagger (hero, cards), chip pop, thumb pop-in, error shake, theme icon swap (sun/moon), step pill transitions; detection experience (scan strip, progress %, stage labels, cancel); result reveal (ring + count-up metrics, photo strip, Edit details on low-conf); demo modes; mobile capture harness.
Fixes found by stills: `#loading` never actually hid (`display:grid` beat `[hidden]`, pre-existing bug, first visible proof), scan thumbs stretched tall, ring/metrics captured mid-flight, crop gutter in mobile stills, progress track invisible after token restore, photo strip flush against CTA.

| Dimension | Critics r1a (start) | Critics r1b (final, median) | Bar |
|---|---|---|---|
| composition | 5.5 (eyeballed) | 6.5 (eyeballed) | 99.9-like, not met |
| color | 5.5 (eyeballed) | 6.5 (eyeballed) | exact tokens (measured: grep vs theme_constants.dart) |
| detail | 5 (eyeballed) | 6 (eyeballed) | high, not met |
| ux-flow | 6 (eyeballed) | 7 (eyeballed) | high, not met |
| motion | 5.5 (eyeballed) | 6 (eyeballed) | 9/10, not met |

Measured: `node --check app.js` pass; token hexes verified against theme_constants.dart; headless ICB=500 probe; capture quirks documented above. Not measured: real-server run (still suspended), real-device frame timing.

Stop check: FAILED. Reason: user has not approved stills; usage cap reached (1.5h). Known below bar: composition/motion genericity (hero is a flat token-gradient card, no imagery), critic-flagged details (stage label fade dip, desktop dead space below cards).

Gate: stills at `cook/stills/r01/` (9 files). Sent to user 2026-11-17.

