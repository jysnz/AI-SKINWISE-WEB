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


---

## Round 3 (2026-11-17): Framer-style landing
Focus: user feedback "The landing page of it [framer.com] is good, can you make the system like that?"
Changes: `/` rebuilt in the Framer language (black page, 2 to 3 line medium-weight headline with -0.045em tracking, small white pill CTA, quiet nav with one pill action, framed product demo with blue edge glow that loops scan then result, "Trained to recognize" text row, 3-column hairline feature grid, hairline FAQ, closing CTA). Default theme is now dark. Theme toggle hidden on the landing page (always black). `/scan` unchanged apart from default theme.
Verified: `tsc --noEmit` clean, `next build` passes. Viewed in real Chrome (extension): demo loops scan then result (Ringworm 87%) as intended.
Capture quirk (measured by comparison): headless Chrome screenshots catch motion animations mid-fade (dim hero button, empty demo card); the real Chrome tab shows them correctly. Stills in `cook/stills/r03/` are therefore not trustworthy for motion states.
Not measured: critic scores (no fresh-context critics run this round), contrast ratios, mobile overflow at 390px (headless clamps at 500px), real-server prediction.
Stop check: FAILED (no critics, no user approval of stills, time floor not applicable to this capped session). Known below bar: hero has no imagery beside the demo, the scan page is still the plain card layout, header logo PNG shows a faint box on black.
Gate: user to review `/` and `/scan` live (npm run dev).

---

## Round 4 (2026-11-17): no-CSS fix and mobile UI demo video

Focus: user feedback "It doesn't have CSS" and "make that in the video of the mobile app ... UI demo ... smooth ... give me the UI demo video so I can market it in social media platforms".

No-CSS fix: cause found by evidence, not guessed. `next dev` (started 5:06 PM on :3000) and my `next build` runs shared `.next`, so a build under a running dev server broke its assets. Fix: `next.config.mjs` uses `.next-dev` for dev, `.next` for build/start, `NEXT_DIST_DIR` for scripts. Verified on a separate dev server (:3010): page 200, `layout.css` 200 with the styles. The user's existing dev server (pids 16792/19152/11624) was not touched (the sandbox blocked stopping it); it needs one restart.

Video: `marketing/` pipeline, 1080x1920, 60 fps, H.264, no audio, ~29 s. Real production app in a phone mockup, virtual clock (`vt.js`), real mouse input, WebCodecs + mp4-muxer, no ffmpeg (not installed, Chrome 157 encodes H.264).
Bugs found by running it (each cost a debug run): iframe was out-of-process (file:// host + http app) which made clicks and screenshots flaky, fixed with a same-origin proxy; invisible end-card layer swallowed clicks; scroll resolver passed as a string; NumberFlow animations live in a shadow root that `document.getAnimations()` does not return, so numbers never moved, fixed by driving every animation created through `.animate()` plus all open shadow roots.
App changes made for the video: eased loading progress with once-a-second percent label, scan stage adapts to 1 to 3 photos, sticky Analyze bar on mobile, "9 conditions" (labels.txt lists 9 conditions plus Normal and Unknown, the copy said 10), demo panel no longer shows a made-up URL.
Not measured: audio (none), real-server run (server still suspended), playback on real devices. Critics not run (this was a build task with a deterministic render, checked by stills and a decode test).

### Round 4 addendum (usage limit reached, 2026-11-17 ~18:30)
- Shipped and verified: `marketing/out/skinwise-ui-demo.mp4` (1080x1920, 60 fps, 28.8 s, H.264, no audio) + `skinwise-ui-demo-poster.png`. Older copies in `marketing/out/old/`.
- Known issue in that file: for its first ~2.5 s the landing hero reads "9 conditions, 3 photos, about 10 seconds" and "9 common skin conditions". Both are unverified figures (see memory skinwise-copy-facts). Source is fixed in `components/Landing.tsx` (now "Up to 3 photos per scan", no count) but the video is NOT re-rendered yet.
- Re-render blocked: another Claude session edited the landing page at 18:20 to 18:24 (Intro splash, word-by-word hero, Conditions component) and its rewrite restored the two figures once (my fix was re-applied afterwards). With the new hero, the renderer's first tap (`.fr-cta a.pill` at 2.5 s) hit `MAIN` and timed out. Next step: run `node marketing/render.mjs --fps 30 --stills 2.0,2.6,3.2` (rebuilds), check where the CTA is while the hero animates (maybe raise the pre-roll in render.mjs from 1.3 s to about 2.4 s), then `npm run video`.

## Round 5 (2026-11-17): phone scan preview

Focus: user asked to replace the landing video demo with a phone that scans and add a splash before the first page render.

Changes: replaced the wide scan/result mock with a centered phone mockup. The phone screen shows a skin photo, animated scan line, progress state and sample Ringworm result, plus subtle device float. The splash was already implemented as a server-rendered overlay and remains enabled on first visit; it skips on repeat visits, reduced motion, iframe, `?still`, or `?nointro`, and click/key can skip it.

Not measured: browser visual check, TypeScript check, real-device check, marketing video re-render.

## Round 7 (2026-11-17): unify the hero frame

Feedback: user asked for the hero to sit in one frame and to remove the large center gap.

Changes: wrapped hero copy and scan preview in a single subtle bordered frame, reduced the grid gap, aligned the phone closer to the copy, and kept the stacked mobile layout centered.

Not measured: browser visual check.

## Round 8 (2026-11-17): hero polish and motion

Feedback: user said the framed hero still felt off and requested necessary animation.

Changes: shortened the headline and supporting text, shifted the phone closer to the copy, reduced device height so its preview fits in the first viewport, and tightened phone status spacing. Scan/result cards now crossfade and lift between states; walkthrough detail text animates on step selection. Existing splash and scan-line animation remain.

Not measured: browser visual check or typecheck.

## Round 6 (2026-11-17): guided scan experience

Focus: user feedback that the first fold felt empty, the phone mock felt off, and the other sections felt bland or generic. Direction confirmed by user: visitors are everyday people; tone should be clear and clinical.

Changes: moved the scan phone beside the hero copy so it appears in the first viewport; simplified the phone's simulated skin image by removing the fake lesion ring and labeled its result illustrative; replaced the static three-card process with a selectable step-through and detail panel; widened and reframed the FAQ. Added `.impeccable.md` with confirmed context and design principles. The requested Impeccable skill was found on skills.sh, but installing it stalled while cloning its repository, so the work used the published skill guidance and existing project context.

Not measured: browser visual check, TypeScript check, real-device check, marketing video re-render.

### Round 4 addendum 2 (2026-11-17 ~21:45): video re-render for the light redesign, stopped for memory
- The site was redesigned by another session (light blue/white "AI-SKINWISE", new landing with live preview phones). `marketing/render.mjs` and `composer.html` are updated for it: first tap is the header "Start a skin check", a swipe shows the preview phones, captions use the site's wording, end card reads "Less wondering. More understanding." Stills of the whole flow were reviewed (contact sheets) and look right. `npm run video:stills` re-checks.
- Bug fixed on the way (affects real visitors): the landing's embedded `/scan?demo=result` iframe called `scrollIntoView`, which scrolled the landing page down on every load. `components/Result.tsx` now skips it when embedded.
- The final 60 fps render of the new design did NOT finish: Claude Code stopped it because the machine ran low on memory (1.8 GB free of 15.7 GB). Not restarted. The current `marketing/out/skinwise-ui-demo.mp4` (6:20 PM) shows the EARLIER dark design and still has the small unverified text "9 conditions, 3 photos, about 10 seconds" in its first 2.5 s. Do not post it.
- To finish: free memory (close extra dev servers and Chrome windows), then `npm run video` (rebuilds, about 8 min) or `node marketing/render.mjs --skip-build --fps 60 --out skinwise-ui-demo-next.mp4` to reuse the 21:40 build. Check with `node marketing/verify.mjs marketing/out/skinwise-ui-demo-next.mp4 --frames 0,17.6,27`, then rename it to `skinwise-ui-demo.mp4`.
