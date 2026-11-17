# AI SkinWise: UI demo video

A 9:16 (1080x1920) MP4 of the real app running inside a phone mockup, made for social posts
(Reels, TikTok, Shorts, X, Facebook, LinkedIn). It is rendered frame by frame, so it is smooth.

```
npm run video          # builds the app, renders 60 fps, writes marketing/out/skinwise-ui-demo.mp4
npm run video:stills   # quick check: saves PNG stills of the main moments, no video
npm run video:photos   # regenerates the placeholder photos in marketing/assets/
```

Output in `marketing/out/`:
- `skinwise-ui-demo.mp4` the video (H.264, no audio)
- `skinwise-ui-demo-poster.png` a cover image (the result screen)

Options: `--fps 30` (smaller and faster), `--bitrate 8000000`, `--skip-build`, `--stills 3,9,15`,
`--poster 17.6` (second used for the cover image), `--port 3300`.

## How it works

1. `render.mjs` builds the production app into its own folder (`.next-video`, so it never touches `npm run dev`)
   and serves it.
2. Chrome opens `composer.html` (phone mockup, status bar, captions, camera moves, finger) with the app in an iframe.
   A tiny proxy serves both from one origin so the iframe runs in the same process.
3. `vt.js` gives the app a virtual clock. Timers, `requestAnimationFrame`, CSS transitions and Web Animations (also
   inside NumberFlow's shadow DOM) only move when the renderer says so. The prediction call is mocked with a fixed
   sample result that arrives after a virtual delay.
4. For each frame the director sends real mouse input (taps, a file chooser), advances the clock by exactly 1/fps,
   screenshots the page, and feeds the image to a WebCodecs H.264 encoder inside Chrome. `mp4-muxer` writes the file.
   No screen recording and no ffmpeg.

## Edit the story

Everything is in `render.mjs`:
- `TL` timings in seconds, `CAPS` caption text and windows, `CAMERA` zoom keyframes, `MOCK` the sample result.
- The steps themselves are the `tap(...)` and `scrollTo(...)` calls under "the story".
- `composer.html` is the design (colors, fonts, bezel, end card text).

## Before you post

- The two photos in `marketing/assets/` are drawn in code. Replace `sample-1.jpg` and `sample-2.jpg` with licensed
  or your own images (a square crop works best) for a more convincing demo.
- The result is sample data, and the video says so. Keep that wording and the "not a medical diagnosis" line.
- The video has no audio. Add licensed music inside the platform you post to.
- Needs Chrome. If it is not at the default Windows path, set `CHROME_PATH`.
