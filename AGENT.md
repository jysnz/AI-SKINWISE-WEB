# AGENT.md: AI SkinWise Web

Handoff file for any agent continuing this work. Read it fully, then check `cook/BRIEF.md` and the last entry of `cook/ROUNDS.md`. Update the **Status** section before you stop.

## Goal

A web version of AI-SKINWISE. The user uploads 1 to 3 photos, chooses the affected body area (required) and optionally ticks symptoms and adds a note. The SkinWise server reads all of it together and returns the condition, a confidence, how well the symptoms matched, and the description, typical symptoms, remedies and references. (Restored in Round 29; Rounds 1 to 28 used a photo-only server, see below.)

## Where the detection logic lives (source of truth, do not edit)

`C:\Projects\AI-SKINWISE\AI-SKINWISE-V2-SERVER` (outside this repo, deployed on Render as `AI-SKINWISE-V2-SERVER`):

| Path | Role |
|---|---|
| `routers/prediction.py` | `POST /predict-skin-disease`: form fields `selected_symptoms`, `user_description`, `body_location`, files `image_1` to `image_3` |
| `utils/image.py`, `utils/translation.py` | validate, colour-correct and classify each photo; translate and match the symptom text |
| `labels.txt` | the condition labels the model returns |

How it scores (from the code): photo scores are averaged; if the top class is Normal or Unknown, or the photo score is under 50, it answers as-is; otherwise it looks the condition up in Supabase, blends the photo score with the symptom match (the photo wins when it is very clear), applies small body-area adjustments, and answers low confidence (`success: false`, `details: {visual, match, final}`) when the final score is under 80.

## Architecture decision

The web app does NOT run the model in the browser. The browser posts to the same-origin `/api/predict-skin-disease` route (`app/api/predict-skin-disease/route.ts`), which forwards the same fields to:

`POST https://ai-skinwise-v2-server.onrender.com/predict-skin-disease` (multipart form)

and returns the server's JSON unchanged. The web does no scoring. Override the host with `SKINWISE_API_URL=http://localhost:8000` (server side) or `?api=...` (browser, direct). A non-JSON answer (Render's "suspended" or sleeping page) is turned into a plain error message instead of a parse failure.

**Warning (checked 2026-11-18): that Render service answers `503 This service has been suspended`.** Until it is resumed in the Render dashboard (or run locally from the server folder, which needs its env vars and a Firebase admin json the user must supply) the scan shows "The SkinWise analysis server is not available right now (HTTP 503)". The simpler photo-only server `https://kiroverse-server.onrender.com/predict-skin-disease` (one field `image`, returns `{success, disease, confidence, probabilities}`) was what Rounds 1 to 28 used and is still up; do NOT silently fall back to it, it ignores symptoms.

Test without the real server: `node cook/mock-server.mjs` (stand-in, port 8123), start the dev server with `SKINWISE_API_URL=http://localhost:8123 npm run dev`, then `node cook/scan-e2e.mjs <outDir>`. Body area Face answers low confidence, Foot answers Unknown, anything else a full result.

The server runs on Render and may cold start, so allow up to 90 seconds. The Next.js proxy logs counts only (photos, whether symptoms and notes were sent), never their content.

## Design tokens (from `theme_constants.dart`)

| Token | Light | Dark |
|---|---|---|
| primary | `#005DA1` | `#4FA3E3` |
| gradient (health card) | `#005DA1` to `#0083E0` | `#004C8C` to `#006BB8` |
| background | `#FAFAFA` | `#121212` |
| surface | `#FFFFFF` | `#1E1E1E` |
| text primary | `#212121` (black87) | `#E0E0E0` |
| text secondary | `#757575` | `#B0B0B0` |
| divider | `#F5F5F5` | `#2C2C2C` |
| input fill | `#FAFAFA` | `#2C2C2C` |
| success | `#4CAF50` | `#66BB6A` |
| error | `#FF5252` | `#EF5350` |
| legacy blue | `#1877F2` | |

Logo assets are copied from the Flutter apps into `assets/` (`logo.png`, `app_logo.png`).

## Rules for this repo

- Next.js 15 App Router + TypeScript (migrated 2026-11-17). `npm install`, `npm run dev` (or `npm run build && npm start`). Code: `app/` (layout, page, globals.css), `components/`, `lib/api.ts` (API + demo data), `lib/hooks.ts`. The original static version is kept in `legacy/` for reference only.
- Never copy secrets. The server folder holds a Firebase admin SDK json: do not read it or copy it here.
- The design bans (from the cook skill): purple gradients, beige, eyebrow labels, uppercase monospace, glowing orbs, decorative particles, em dashes in copy.
- Not medical advice: keep a visible disclaimer on results.

## Design Context

### Users

Everyday people checking a skin concern for personal understanding. They need to know how the scan works, what information to provide, and how to interpret general guidance.

### Brand Personality

Clear and clinical. Use plain language and show the limits of the model without making the experience feel alarming.

### Aesthetic Direction

Keep SkinWise's dark landing canvas and blue accent. Make the first view a guided product experience with a visible scan preview, rather than a detached marketing hero. Avoid generic AI imagery, decorative glows, and repeated feature cards.

### Design Principles

- Show the scan and its steps before asking visitors to begin.
- Explain what the model compares and what its results can mean.
- Keep the experience direct, readable, and useful on small screens.
- Distinguish general information from diagnosis wherever results appear.
- Use interaction to help visitors understand the process, not as decoration.

## Status

(Update this as you go.)

- [x] AGENT.md written
- [x] cook/BRIEF.md and cook/ROUNDS.md written
- [x] index.html, styles.css, app.js built (upload, symptoms, result, light and dark). `node --check app.js` passes. Viewed via headless screenshots in `cook/stills/r01/` (9 states: home light/dark/mobile, loading early/stage/mobile, result success/low/mobile).
- [x] Round 1 (2026-11-17): UI/UX + animation pass. Entrance stagger, chip/thumb pop, error shake, sun/moon toggle icon, scan-stage detection experience (photo strip + progress % + stage labels + Cancel), animated result (ring + count-up + photo strip), "Edit details" on low-confidence. Fixed pre-existing bug: `#loading` never hid (`display:grid` beat `[hidden]`).
- [x] Stills + fresh-context critic passes logged in `cook/ROUNDS.md` (median scores r1: comp 6.5, color 6.5, detail 6, ux 7, motion 6; bar not yet met).
- [ ] Tested end-to-end with a real photo against `https://kiroverse-server.onrender.com`. On 2026-11-17 it is up (an empty POST returns `422`, i.e. it validates input); the earlier `503` suspended-service blocker applied to the old server. Old fallback options: resume it in the Render dashboard, or run the server locally from `C:\Projects\AI-SKINWISE\AI-SKINWISE-V2-SERVER` (needs its env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a Firebase admin json, which the user must supply) and open `index.html?api=http://localhost:8000`.
- [ ] User approval of stills (Gate) — see `cook/ROUNDS.md` Round 1.
- [ ] Round 2 candidates from critics: hero composition (flat token-gradient card, no imagery), stage label crossfade dips to near-invisible (~120ms), desktop dead space below cards, "Photos analyzed" strip could open a larger view of each photo.

## Test without the server

URL params for demo/testing (use them on `/scan`) (harmless in production, no visible UI):
- `?demo=loading` — canned photos, analysis experience running.
- `?demo=result` — canned high-confidence result (Ringworm 87%).
- `?demo=low` — canned low-confidence result (amber state).
- `?api=http://localhost:8000` — point at a local server instead of the deployed one.

- [x] Round 2 (2026-11-17): Next.js migration plus UX pass: hero with viewfinder and facts, photo tips and counters, live readiness hint with nudge-to-field on incomplete submit, sticky mobile action bar, max-width layout, result next-steps callout, remedies open by default, focus moves to result heading, skip link, no theme flash.

- [x] Round 3 (2026-11-17): landing page at `/` (hero with Start a scan CTA, how it works, conditions, FAQ), scanner moved to `/scan`. Libraries: base-ui (accordion, dialog, progress), Sonner (toasts), NumberFlow (percentages), motion (transitions), next-themes (theme), clsx. Decluttered scan form (no checklist card, no tips block, slots only for added photos). Demo params now work on `/scan` (e.g. `/scan?demo=result`).

- [x] Round 4 (2026-11-17, cook run 2): landing `/` restyled after framer.com (black, pill CTA, looping demo panel in `components/DemoPanel.tsx`, hairline feature grid). Default theme dark; landing always black. Headless screenshots mis-render motion states, so verify animation in a real browser. See `cook/ROUNDS.md` Round 3.

- [x] Round 5 (2026-11-17): fixed "no CSS" in dev. Cause: `next build` and `next dev` shared `.next`, so a build while `npm run dev` was running broke the dev server. `next.config.mjs` now uses `.next-dev` for dev, `.next` for build/start, and `NEXT_DIST_DIR` for scripts. After pulling this, restart `npm run dev` once.
- [x] Round 5: marketing UI demo video pipeline in `marketing/` (`npm run video`). Drives the real production app inside a phone mockup with a virtual clock (`marketing/vt.js`), captures exact frames and encodes H.264 MP4 in Chrome via WebCodecs (no ffmpeg). Output: `marketing/out/skinwise-ui-demo.mp4` (1080x1920, 60fps). The sample photos are drawn in code (`npm run video:photos`); replace `marketing/assets/sample-1.jpg` and `sample-2.jpg` with licensed photos for real marketing. Headless Chrome only: set `CHROME_PATH` if Chrome is not at the default Windows path. See `marketing/README.md`. Check a render with `node marketing/verify.mjs`.

## Next steps for a continuing agent

1. Check the Status list above, then read `cook/ROUNDS.md`.
2. Open `index.html` in a browser and run a real prediction. Fix anything broken first.
3. Compare the visual result with the Flutter app's scanner and result screens, then polish.
4. Do not start any final export or publish. Nothing is committed or pushed yet.

- [x] Round 6 (2026-11-17): landing motion pass. Intro splash before the page renders (`components/Intro.tsx`, CSS in `app/globals.css`, skip script in `app/layout.tsx`): plays once per tab, skipped on repeat visits, reduced motion, inside an iframe (the video renderer) and with `?nointro` or `?still`; click or any key skips. Hero headline words rise out of masks after the intro; header has a scroll-progress line; demo panel only loops while visible; conditions row is interactive (`components/Conditions.tsx`); How it works steps are numbered with drawing lines; CTA arrows. Libraries unchanged (motion). `tsc --noEmit` clean. Not done: marketing video not re-rendered (hero timing shifted slightly), no real-device check. Helper scripts `cook/shot.mjs` and `cook/seq.mjs` capture stills (need Chrome and `C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs`).
- [x] Round 7 (2026-11-17): landing product demo replaced with a phone mockup that animates a scan and sample result (`components/DemoPanel.tsx`, `app/globals.css`). Existing first-paint splash retained. Not verified in browser; marketing video not re-rendered.
- [x] Round 8 (2026-11-17): landing changed from a text-first marketing hero to a guided scan experience. Phone preview is in the first viewport; the process section is interactive; FAQ uses the full available width; fake lesion ring removed and sample result labeled illustrative. Design context recorded in `.impeccable.md`. Not verified in browser or typechecked; marketing video not re-rendered.
- [x] Round 9 (2026-11-17): placed the hero copy and phone preview inside one bordered frame, narrowed the grid gap, and aligned the phone toward the copy to close the empty center space.
- [x] Round 10 (2026-11-17): shortened the hero headline and supporting copy, compacted the phone UI to fit the first viewport, tightened the composition, animated scan/result transitions and walkthrough copy, and fixed the progress label/value spacing.
- [x] Round 11 (2026-11-17): implemented the Figma landing page at `dvuR4Maw0UbWOi70yEK4Kk` (1440 × 3662) in the Next.js app. Replaced the Framer-inspired black landing with a white/blue clinical layout: navigation, hero scan preview, care principles, three steps, nine condition tiles, responsible guidance, FAQ, final CTA, and footer. Downloaded the Figma skin photo and blue halo to `public/figma/` so the app uses local assets. Scanner route and detection flow were not changed. Typecheck/build and browser visual comparison were not run in this round.
- [x] Round 12 (2026-11-17): constrained the Figma landing hero to the viewport below the header (`100svh` desktop, `100svh` minus the compact header on mobile); scaled the phone preview with available height and tightened mobile copy so the hero fits in one screen. No build or browser check run.
- [x] Round 13 (2026-11-17): rotated the mobile hero phone preview by -45° and tuned its scale at shorter and taller viewport heights so the full device stays inside its preview frame. No build or browser check run.
- [x] Round 14 (2026-11-17): extended the -45° phone rotation to desktop and tablet after screenshot feedback showed the desktop preview remained upright; reduced scale at narrower or shorter frames to keep the device inside the preview. No build or browser check run.
- [x] Round 15 (2026-11-17): removed phone rotation and changed the hero preview to two complete upright phones: one scanning and one showing an explicitly illustrative Ringworm result. Scaled the pair by viewport size so both frames fit within the preview. No build or browser check run.
- [x] Round 16 (2026-11-17): improved the scan-preview callouts with camera/sparkle icons, stronger label/body hierarchy, larger type and cards, and clearer contrast. No build or browser check run.
- [x] Round 17 (2026-11-17): tightened callout padding and typography. Replaced hand-drawn phone mockups with embedded `/scan` loading and result demo routes so hero phones show the actual scanner and result UI. Reworked the landing process section to reflect backend behavior: 1–3 photos and optional details, image validation/resizing/color correction, original+mirrored inference aggregated across photos, then symptom/body-area context and confidence guidance (including the <80% low-confidence rule for predicted conditions). Improved the mobile hero preview by centering both complete phone screens and removing floating callouts at phone widths. No build or browser check run.
- [x] Round 18 (2026-11-17): restyled the /scan route to match the Figma landing page colors and typography. Added three-step progress, refined photo upload treatment, separate form cards, symptom chips, sticky analysis action, and mobile/dark variants. Preserved scan flow and API behavior. No build or browser check run.
- [x] Round 19 (2026-11-17): strengthened primary button contrast, size, shadow, hover and focus feedback across the landing and scan pages. Added a medical guidance callout and clear required tags for the photo and affected area. Matched header height, spacing, logo and action button treatment at desktop, tablet and mobile breakpoints. No build or browser check run.
- [x] Round 20 (2026-11-17): moved the scan analysis action into normal form flow at the end of the form with no sticky positioning. Removed active light/dark mode control, provider, URL switch, CSS variants, and unused next-themes dependency. Set the interface to a light color scheme.
- [x] Round 21 (2026-11-17): simplified the scan photo uploader after feedback that it felt cluttered. Reduced its height and trimmed the prompt to one action and one concise photo-quality hint.
- [x] Round 22 (2026-11-17): added development-only AI-SKINWISE diagnostics for form validation, analysis start/failure, fetch errors, HTTP status, response parsing and API error responses. Logs include safe request metadata and omit photos, symptoms, body-area values and notes.
- [x] Round 23 (2026-11-17): splash rebuilt and actually mounted (`<Intro />` in `app/layout.tsx`; it was not rendered before): brackets draw in, scan line brings the logo into focus, wordmark rises per letter, curtain lifts, hero rises after `sw:reveal` (`useReveal` in `lib/hooks.ts`). Added `suppressHydrationWarning` on `<html>` (fixes the dev "1 Issue" badge), Inter via `next/font`, logo in header, result page shows one confidence figure, stepper connectors, larger landing copy. New CSS is appended at the end of `app/globals.css` ("Intro" and "Polish layer"). Stills in `cook/stills/r06/`.
- [x] Round 24 (2026-11-17): splash plays on every full load (no sessionStorage skip; reduced motion gets a short fade). Exit is now a FLIP: the intro logo flies into the header logo (`.topbar .brand img`, hidden via `html[data-fly]` until it lands) while the white fades and the hero rises; falls back to the curtain wipe if there is no header logo. Added a scan lock-on pulse. Logic in `components/Intro.tsx` (`lift`), styles in the "Intro" section of `app/globals.css`. Frames: `cook/stills/r06/fly-*`.
- [x] Round 23 (2026-11-17): routed default browser prediction requests through a same-origin Next.js API endpoint to avoid upstream browser CORS blocking. Kept custom local API overrides direct. Added server-side request/response diagnostics and a structured 502 when the prediction host is unreachable.
- [x] Round 25 (2026-11-18): /scan redesigned around one capture stage (`.cap-*` in the end of `app/globals.css`, `components/Form.tsx`, `components/Loading.tsx`). Removed the eyebrow, stepper, info strip and "About this check" card; heading is centered. Empty: blue viewfinder with breathing brackets and an idle scan line, the whole stage is the upload target (keyboard focusable input `#cap-file`). Photo added: brackets lock on, one sweep, thumbnails switch/remove/add. Analyzing: same stage, scan loops, status pill, thin progress bar. Typechecked; verified with `node cook/scan-states.mjs <outDir> [w] [h]` and `node cook/scan-interact.mjs` (needs dev server on :3000). Result view untouched. Not checked on a real device.
- [x] Round 26 (2026-11-18): /scan form and analyzing views fit one screen on laptops and desktops (min-width 901px) with no page scroll: `main` gets `.scan-fit` (not on the result view), the capture stage flexes to the height left under the 81px header, short windows (max-height 760px) hide the fine print. Photo now shown whole (`object-fit: contain` plus blurred fill, `.cap-cell`). Verified FITS at 1920x950, 1536x730, 1440x780, 1366x650, 1280x620, 1280x720, 1024x600 in all three states with `node cook/scan-fit.mjs [outDir]`; below 170px of stage the page scrolls again instead of clipping. Mobile and tablet portrait unchanged.
- [x] Round 27 (2026-11-18): /scan result screen redesigned (`components/Result.tsx`, `.res-*` CSS): photo in the locked capture stage on the left, verdict, next-steps card and accordion on the right; no ring for "No supported match"; fits one screen on laptops (`node cook/res-fit.mjs`, 21/21 FITS); disclaimer "not 100% accurate, consult a board-certified dermatologist" inside the next-steps card, and in the scan footer. `?demo=none` previews the outside-coverage result. Small pending polish NOT applied: non-breaking hyphen in "board-certified" (wraps as board-/certified) and an amber `.res .badge.warn`.
- [x] Round 28 (2026-11-18): landing "The system" section (`components/System.tsx`, `.sys-*` CSS, nav item "The system"): Patient app lane (9 steps) and Clinic admin lane (10 steps) with a phone each, then a "Behind both apps" server strip. All wording checked against `C:/Projects/AI-SKINWISE` code (patient app takes ONE photo; PayMongo GCash/card/Maya; Meet link after payment; "Process disbursement" deliberately not mentioned). Phones are BLANK on purpose: add `img: "/screens/system/patient-1.jpg"` to a step in `components/System.tsx` (portrait, ~1080x2270) and the phone shows the active step (hover, focus or click). Check with `node cook/system-shots.mjs <outDir>`.
- [x] Round 29 (2026-11-18): symptom-based detection restored. Form (`components/Form.tsx`): photos on the left in the capture stage, right side has Affected area chips (required, 10 areas), Symptoms chips (10, optional) and "Anything else?" notes (500 chars); state lives in `Scanner.tsx` so it survives loading and errors. `lib/api.ts` posts `image_1..3`, `body_location`, `selected_symptoms`, `user_description`; proxy route is a pass-through to the V2 server. Result shows Photo analysis and Symptom match figures, the server message and Description / Typical symptoms / Suggested remedies / References. Loading stages: Enhancing photos, Running AI analysis, Matching symptoms (or Combining photo scores when no symptoms). All "photo-only / symptoms not analyzed" copy removed (landing How it works, FAQ, content.ts, result). The V2 server is SUSPENDED on Render right now, see Architecture. Verified end to end against `cook/mock-server.mjs` and fit at 7 laptop sizes (`cook/scan-fit.mjs`, `cook/res-fit.mjs`: 42/42 FITS). Page height is now definite on desktop (`.scan-fit` uses `height: max(480px, 100svh - 81px)`) so the chips panel and result accordion shrink or scroll inside themselves.
- [x] Round 29b: landing "The system" phones now show real screens from the user: `public/screens/system/patient-find-clinic.jpg` (step 4 Find a clinic, patient lane opens on it) and `clinic-dashboard.jpg` (clinic lane default). Status bar cropped off. More screenshots: add `img` to a step in `components/System.tsx`.
- [x] Round 29c (2026-11-18): dev overlay "Console Error prediction.response.api_error" fixed. Handled failures (server error JSON, timeouts, cancelled scans) are logged with `console.warn` in `lib/debug.ts`, not `console.error`, because Next shows every console.error as a red Issue. The log now carries the server status, code and message. Verified with `node cook/scan-error.mjs` and `node cook/scan-overlay.mjs`.
