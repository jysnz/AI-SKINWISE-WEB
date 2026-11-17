# Brief: AI SkinWise Web

Target: web version of the SkinWise skin condition detector (upload photos, symptoms, result). Stack: static HTML/CSS/JS, no build step, calls the live SkinWise server.
References: no references. The Flutter apps in C:\Projects\AI-SKINWISE are the style source; the first stills the user approves become the reference.
Bar: color theme exact (tokens in AGENT.md), composition clean and mobile-first, motion 9/10 on the detection experience, subtle elsewhere.
Calibration offset: none yet.
Feedback (2nd message, 2026-11-17): "improve the UI/UX of the system, add animations where it is necessary. In the detection, add animation to it." Detection = the analysis/loading phase; it gets the flagship animation.
Feedback (3rd message, 2026-11-17): "Occupy the full width of the desktop and further improve the UI and UX of the system." Desktop drops the 720px column for a full-width layout (two-column grids); UX fixes carry over from the round-1 critic list.
Rules: logos copied from the Flutter app; no other external assets. No secrets copied. Slop ban list applies.
Time: small job, hard cap 1.5h. User is near their usage limit, so the first round must be shippable and AGENT.md must stay current.
Hardware: any browser.
Deliverable: working local web page.
Permissions: download no, push no, publish no.
User's words: "Fetch the AI skinwise detection function in the AI-SKINWISE folder in the projects and add it here. Make the design good and directly reflects the color theme of the system. Add agent.md first so that other agents can continue your work because I near my usage limit."

---
## Run 2 (2026-11-17): Framer-style landing
User's words: "https://www.framer.com/ The landing page of it is good, can you make the system like that?"
Stack now: Next.js 15 (see AGENT.md). Reference: live https://www.framer.com/ (no image files saved; observed via Chrome extension).
Take from it (not 1:1): pure black page; h1 ~54px weight 500 tracking -0.04em, two lines, left aligned; small white pill CTA; quiet grey nav with one pill action; large hairline-framed product demo panel with blue edge glow showing the product working; muted text row where logos sit; 3-column feature grid with hairline separators; dark cards, grey secondary text.
Bar: composition/color/detail/motion 8+ by critic median after calibration; measured: contrast, no horizontal overflow at 390px.
Time: hard cap for this session (not an 8h demo); usage-limited. Permissions: no download/push/publish.
Decisions (no intake, prompt answers it):
- Landing (`/`) is always black Framer-style with brand blue (#4FA3E3 / #0083E0) as the only accent; theme toggle hidden there. Scan (`/scan`) keeps SkinWise tokens, default theme now dark.
- Product demo panel is a code-made looping mock (scan + result), no external images.
- Glow is an edge glow on the frame, not a floating orb (ban list).
