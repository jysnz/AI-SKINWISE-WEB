# AGENT.md: AI SkinWise Web

Handoff file for any agent continuing this work. Read it fully, then check `cook/BRIEF.md` and the last entry of `cook/ROUNDS.md`. Update the **Status** section before you stop.

## Goal

A web version of the AI SkinWise skin condition detector. The user uploads 1 to 3 photos, picks the affected body part and symptoms, and gets a prediction with confidence, description, symptoms and remedies. The design must match the SkinWise color theme exactly (tokens below).

## Where the detection logic lives (source of truth, do not edit)

`C:\Projects\AI-SKINWISE\` (sibling folder, outside this repo):

| Path | Role |
|---|---|
| `AI-SKINWISE-V2-SERVER/routers/prediction.py` | `POST /predict-skin-disease`, the detection function |
| `AI-SKINWISE-V2-SERVER/utils/image.py` | validate, gray-world color correction, 2x TTA TFLite inference (224x224) |
| `AI-SKINWISE-V2-SERVER/labels.txt` | Acne, Athlete's Foot, Cellulitis, Chickenpox, Cutaneous Larva Migrans, Impetigo, Nail-Fungus, Normal, Ringworm, Shingles, Unknown |
| `AI-SKINWISE-V2-USER/lib/Pages/Scanner_Page/SymptomCheckPage.dart` | Reference client: how the mobile app calls the API |
| `AI-SKINWISE-V2-USER/lib/Pages/Scanner_Page/DetectionInformation.dart` | Reference result screen |
| `AI-SKINWISE-V2-USER/lib/Constants/theme_constants.dart` | Color theme |

## Architecture decision

The web app does NOT run the TFLite model in the browser. It calls the deployed backend, the same one the Flutter app uses:

`POST https://ai-skinwise-v2-server.onrender.com/predict-skin-disease` (multipart form)

Fields: `image_1`, `image_2`, `image_3` (files, at least one), `body_location` (Face, Scalp, Neck, Chest, Back, Arm, Hand, Stomach, Leg, Foot), `selected_symptoms` (comma-separated), `user_description` (free text).

Responses:
- `200 {success:true, prediction:{disease_name, final_confidence, visual_confidence_avg, symptom_match_score, symptom_analysis}, translation, info:{description, expected_symptoms, suggested_treatment, references}}`
- `200 {success:false, low_confidence:true, message, details:{visual, match, final}}` when final confidence is under 80
- `400 {error}` no or invalid images. `500 {error}` server problem.
- Normal / Unknown / visual confidence under 50 returns success:true with a short `info`.

The server runs on Render and may cold start, so allow up to 90 seconds (the mobile app does the same). CORS on the server is `*`.

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

- No build step: static `index.html`, `styles.css`, `app.js`. Open the file or serve the folder.
- Never copy secrets. The server folder holds a Firebase admin SDK json: do not read it or copy it here.
- The design bans (from the cook skill): purple gradients, beige, eyebrow labels, uppercase monospace, glowing orbs, decorative particles, em dashes in copy.
- Not medical advice: keep a visible disclaimer on results.

## Status

(Update this as you go.)

- [x] AGENT.md written
- [x] cook/BRIEF.md and cook/ROUNDS.md written
- [x] index.html, styles.css, app.js built (upload, symptoms, result, light and dark). `node --check app.js` passes. Viewed via headless screenshots in `cook/stills/r01/` (9 states: home light/dark/mobile, loading early/stage/mobile, result success/low/mobile).
- [x] Round 1 (2026-11-17): UI/UX + animation pass. Entrance stagger, chip/thumb pop, error shake, sun/moon toggle icon, scan-stage detection experience (photo strip + progress % + stage labels + Cancel), animated result (ring + count-up + photo strip), "Edit details" on low-confidence. Fixed pre-existing bug: `#loading` never hid (`display:grid` beat `[hidden]`).
- [x] Stills + fresh-context critic passes logged in `cook/ROUNDS.md` (median scores r1: comp 6.5, color 6.5, detail 6, ux 7, motion 6; bar not yet met).
- [ ] Tested against a working endpoint. BLOCKER: on 2026-11-17 the Render server answered `503` with `x-render-routing: suspend` (service suspended). Options: resume it in the Render dashboard, or run the server locally from `C:\Projects\AI-SKINWISE\AI-SKINWISE-V2-SERVER` (needs its env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a Firebase admin json, which the user must supply) and open `index.html?api=http://localhost:8000`.
- [ ] User approval of stills (Gate) — see `cook/ROUNDS.md` Round 1.
- [ ] Round 2 candidates from critics: hero composition (flat token-gradient card, no imagery), stage label crossfade dips to near-invisible (~120ms), desktop dead space below cards, "Photos analyzed" strip could open a larger view of each photo.

## Test without the server

URL params for demo/testing (harmless in production, no visible UI):
- `?demo=loading` — canned photos, analysis experience running.
- `?demo=result` — canned high-confidence result (Ringworm 87%).
- `?demo=low` — canned low-confidence result (amber state).
- `?theme=dark` / `?theme=light` — force theme (localStorage still wins otherwise).
- `?api=http://localhost:8000` — point at a local server instead of the deployed one.

## Next steps for a continuing agent

1. Check the Status list above, then read `cook/ROUNDS.md`.
2. Open `index.html` in a browser and run a real prediction. Fix anything broken first.
3. Compare the visual result with the Flutter app's scanner and result screens, then polish.
4. Do not start any final export or publish. Nothing is committed or pushed yet.
