// Renders the AI SkinWise mobile UI demo video (9:16, MP4/H.264).
//
//   node marketing/render.mjs                 full render (builds the app first)
//   node marketing/render.mjs --skip-build    reuse the last build in .next-video
//   node marketing/render.mjs --stills 3,9,15 save PNG stills at those seconds, no video
//   node marketing/render.mjs --fps 30        faster, lower frame rate
//
// How it stays smooth: the real app runs inside a phone mockup. Its clock is virtual (see vt.js),
// so every frame is advanced by exactly 1/fps seconds and captured, then encoded with WebCodecs.
// No screen recording, no dropped frames. Nothing needs to be installed besides Chrome.
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import http from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const W = 1080, H = 1920;
const FPS = Number(val("--fps", 60));
const PORT = Number(val("--port", 3300));
const BASE = `http://localhost:${PORT}`;
// The composer page and the app must share one origin (and so one process) or Chrome isolates the
// iframe and input/screenshots get flaky. A tiny proxy serves the composer next to the proxied app.
const PROXY_PORT = PORT + 1;
const ORIGIN = `http://localhost:${PROXY_PORT}`;
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = join(here, "out");
const OUT_FILE = join(OUT_DIR, val("--out", "skinwise-ui-demo.mp4"));
const STILLS = val("--stills", "").split(",").filter(Boolean).map(Number);
const ENCODE = STILLS.length === 0 && !has("--no-encode");
const BITRATE = Number(val("--bitrate", FPS > 30 ? 9_000_000 : 7_000_000));
const POSTER_AT = Number(val("--poster", 17.6)); // cover image: the result screen
const PHOTOS = [join(here, "assets", "sample-1.jpg"), join(here, "assets", "sample-2.jpg")];

mkdirSync(OUT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ timeline (seconds)
const TL = {
  scrollLanding: [0.9, 2.0],
  startTap: 3.1,
  drop1: 4.7, drop2: 6.1,
  scrollDetails: [7.1, 8.1],
  arm: 9.0, itch: 9.8, scaly: 10.5,
  analyze: 12.1,
  fetchMs: 4800,
  scrollA: [19.0, 20.0],
  scrollB: [21.8, 22.8],
  end: 25.0,
  total: 29.6,
};
TL.result = TL.analyze + TL.fetchMs / 1000;

const CAPS = [
  { t0: -0.7, t1: 3.8, title: "A clearer first look\nat your skin", sub: "Upload a photo. Understand possible next steps." },
  { t0: 3.8, t1: 6.9, title: "Add a clear photo", sub: "Take one or choose from your library" },
  { t0: 6.9, t1: 12.0, title: "Add a little context", sub: "Pick the body area and any symptoms" },
  { t0: 12.0, t1: TL.result - 0.05, title: "AI compares your photo\nand your symptoms", sub: "With common skin conditions" },
  { t0: TL.result - 0.05, t1: TL.end, title: "Review your guidance", sub: "Sample result. A first look, not a diagnosis." },
];

const CAMERA = [
  { t: 0, s: 1.0, fx: 195, fy: 330 },
  { t: 2.9, s: 1.025, fx: 195, fy: 330 },
  { t: 4.2, s: 1.0, fx: 195, fy: 300 },
  { t: 8.2, s: 1.0, fx: 195, fy: 300 },
  { t: 12.4, s: 1.025, fx: 195, fy: 220 },
  { t: TL.result - 0.2, s: 1.025, fx: 195, fy: 220 },
  { t: TL.result + 1.4, s: 1.0, fx: 195, fy: 300 },
  { t: TL.end - 0.8, s: 1.025, fx: 195, fy: 300 },
];

const MOCK = {
  match: "/predict-skin-disease",
  delay: TL.fetchMs,
  body: {
    success: true,
    prediction: { disease_name: "Ringworm", final_confidence: 87.4, visual_confidence_avg: 84.2, symptom_match_score: 91, symptom_analysis: "matched" },
    info: {
      description: ["Ringworm (tinea corporis) is a common fungal infection that causes a raised, ring-shaped rash.", "It spreads through direct skin contact and shared items."],
      expected_symptoms: ["Red, ring-shaped patch with a raised edge", "Itching", "Slightly scaly skin inside the ring"],
      suggested_treatment: ["Keep the area clean and dry", "Apply an antifungal cream as directed", "Wash bedding and clothing separately"],
      references: [],
    },
  },
};

// ------------------------------------------------------------------ app server
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const appEnv = { ...process.env, NEXT_DIST_DIR: ".next-video", NEXT_TELEMETRY_DISABLED: "1" };
let server = null;
function run(args, label) {
  return new Promise((res, rej) => {
    const p = spawn(process.execPath, [nextBin, ...args], { cwd: root, env: appEnv, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
    p.on("exit", (c) => (c === 0 ? res(out) : rej(new Error(label + " failed:\n" + out.slice(-2000)))));
  });
}
let startedServer = false;
async function startServer() {
  // Reuse a server that is already running on this port (e.g. from a previous run).
  try { const r = await fetch(BASE + "/"); if (r.ok) { console.log("reusing app server on", BASE); return; } } catch {}
  if (!has("--skip-build") || !existsSync(join(root, ".next-video", "BUILD_ID"))) {
    console.log("building the app (production, isolated .next-video folder)...");
    await run(["build"], "next build");
  }
  server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], { cwd: root, env: appEnv, stdio: "ignore" });
  startedServer = true;
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + "/"); if (r.ok) return; } catch {}
    await sleep(500);
  }
  throw new Error("app server did not start");
}
function stopServer() {
  // `next start` forks a child, so kill the whole tree on Windows to avoid orphans
  if (server && startedServer) { try { spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
}


function startProxy() {
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith("/__video/")) {
      const name = req.url.slice("/__video/".length).split("?")[0];
      if (name === "composer.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(readFileSync(join(here, "composer.html"))); }
      res.writeHead(404); return res.end("not found");
    }
    if (req.url === "/favicon.ico") { res.writeHead(204); return res.end(); }
    const headers = { ...req.headers, host: `localhost:${PORT}` };
    const up = http.request({ hostname: "localhost", port: PORT, path: req.url, method: req.method, headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on("error", () => { res.statusCode = 502; res.end("bad gateway"); });
    req.pipe(up);
  });
  return new Promise((resolve) => srv.listen(PROXY_PORT, "127.0.0.1", () => resolve(srv)));
}

// ------------------------------------------------------------------ encoder (runs inside Chrome via WebCodecs)
const ENC_SRC = `
window.__encInit = async (cfg) => {
  const target = new Mp4Muxer.ArrayBufferTarget();
  const muxer = new Mp4Muxer.Muxer({ target, video: { codec: 'avc', width: cfg.w, height: cfg.h, frameRate: cfg.fps }, fastStart: 'in-memory' });
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__encError = String(e); } });
  let conf = null;
  for (const codec of cfg.codecs) {
    const c = { codec, width: cfg.w, height: cfg.h, bitrate: cfg.bitrate, framerate: cfg.fps, latencyMode: 'quality', bitrateMode: 'variable', avc: { format: 'avc' } };
    if ((await VideoEncoder.isConfigSupported(c)).supported) { conf = c; break; }
  }
  if (!conf) throw new Error('no supported H.264 encoder config for ' + cfg.codecs.join(', '));
  window.__encCodec = conf.codec;
  enc.configure(conf);
  window.__enc = { muxer, target, enc, cfg, n: 0 };
};
window.__encFrame = async (b64) => {
  const E = window.__enc;
  const blob = await (await fetch('data:image/jpeg;base64,' + b64)).blob();
  const bmp = await createImageBitmap(blob);
  const frame = new VideoFrame(bmp, { timestamp: Math.round(E.n * 1e6 / E.cfg.fps), duration: Math.round(1e6 / E.cfg.fps) });
  while (E.enc.encodeQueueSize > 8) await new Promise((r) => E.enc.addEventListener('dequeue', r, { once: true }));
  E.enc.encode(frame, { keyFrame: E.n % (E.cfg.fps * 2) === 0 });
  frame.close(); bmp.close(); E.n++;
  if (window.__encError) throw new Error(window.__encError);
};
window.__encDone = async () => {
  const E = window.__enc;
  await E.enc.flush(); E.muxer.finalize();
  window.__encBuf = new Uint8Array(E.target.buffer);
  return { bytes: window.__encBuf.length, frames: E.n };
};
window.__encChunk = (i, size) => {
  const u8 = window.__encBuf.subarray(i * size, (i + 1) * size);
  let s = ''; for (let k = 0; k < u8.length; k += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
  return btoa(s);
};
`;

// ------------------------------------------------------------------ main
async function main() {
  await startServer();
  const proxy = await startProxy();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    protocolTimeout: 20000,
    args: [
      "--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none", "--disable-lcd-text",
      "--disable-threaded-animation", "--disable-threaded-scrolling", "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--run-all-compositor-stages-before-draw",
      "--disable-site-isolation-trials", "--disable-features=IsolateOrigins,site-per-process,CalculateNativeWinOcclusion",
    ],
  });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log("[page error]", String(e).slice(0, 300)));
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log("[console." + m.type() + "]", m.text().slice(0, 240)); });
    page.on("response", (r) => { if (r.status() >= 400) console.log("[http " + r.status() + "]", r.url().slice(0, 110)); });
    page.on("requestfailed", (r) => console.log("[request failed]", r.url().slice(0, 120), r.failure()?.errorText));
    page.on("framenavigated", (f) => console.log("[frame navigated]", f.url().slice(0, 100)));
    await page.evaluateOnNewDocument(readFileSync(join(here, "vt.js"), "utf8"));
    await page.goto(ORIGIN + "/__video/composer.html?app=" + encodeURIComponent(ORIGIN), { waitUntil: "load" });
    await page.waitForFunction(() => window.__ready === true);

    const findFrame = () => page.frames().find((f) => f !== page.mainFrame() && f.url().startsWith(ORIGIN));
    let frame = null;
    for (let i = 0; i < 200 && !frame; i++) { frame = findFrame(); if (!frame) await sleep(100); }
    if (!frame) throw new Error("app frame not found");
    for (let i = 0; i < 300; i++) {
      const ok = await frame.evaluate(() => document.documentElement.dataset.hydrated === "1" && !!window.__vt).catch(() => false);
      if (ok) break;
      if (i === 299) throw new Error("app did not hydrate");
      await sleep(100);
    }
    await frame.evaluate((m) => { window.__vtMock = m; document.addEventListener("pointerdown", (e) => { window.__lc = "pointerdown " + e.target.tagName; }, true); document.addEventListener("click", (e) => { window.__lc = "click " + e.target.tagName + " prevented=" + e.defaultPrevented; }, true); }, MOCK);
    await page.evaluate((cfg) => window.__setCfg(cfg), { caps: CAPS, camera: CAMERA, endAt: TL.end });

    // encoder tab (needs a secure context: localhost)
    let enc = null;
    if (ENCODE) {
      enc = await browser.newPage();
      await enc.goto(ORIGIN + "/assets/logo.png");
      await enc.evaluate(readFileSync(join(resolve(root, "node_modules/mp4-muxer/build"), "mp4-muxer.js"), "utf8"));
      await enc.evaluate(ENC_SRC);
      await enc.evaluate((cfg) => window.__encInit(cfg), { w: W, h: H, fps: FPS, bitrate: BITRATE, codecs: FPS > 30 ? ["avc1.64002A", "avc1.640032"] : ["avc1.640028", "avc1.64002A", "avc1.640032"] });
      await page.bringToFront();
    }

    // ---- event queue
    const events = [];
    const on = (t, fn) => events.push({ t, fn, done: false });
    const tweens = [];
    const getRect = () => page.evaluate(() => window.__appRect());

    async function resolveTarget(spec) {
      return frame.evaluate((s) => {
        let el = null;
        if (s.chip) el = [...document.querySelectorAll(".chip")].find((b) => b.textContent.trim() === s.chip);
        else el = document.querySelector(s.sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      }, spec);
    }
    // Let async work that needs real time (route fetch, image decode) finish without moving the video clock.
    // `step` > 0 also advances the app's virtual clock in small slices (route changes need React's timers to fire).
    async function waitFor(cond, label, { ms = 15000, step = 0 } = {}) {
      const t0 = Date.now();
      for (;;) {
        await frame.evaluate((d) => window.__vtStep(d), step);
        if (await frame.evaluate(cond)) return;
        if (Date.now() - t0 > ms) throw new Error("timed out waiting for " + label);
        await sleep(30);
      }
    }
    function tap(tTap, spec, { move = 0.65, hold = 0.16, chooser = null, wait = null, waitLabel = "", waitStep = 0 } = {}) {
      on(tTap - move, async () => {
        const p = await resolveTarget(spec);
        if (!p) throw new Error("tap target missing: " + JSON.stringify(spec));
        await page.evaluate((tc) => window.__addTouch(tc), { t0: tTap - move, t1: tTap, tr: tTap + hold, x: p.x, y: p.y });
      });
      on(tTap, async () => {
        const p = await resolveTarget(spec);
        if (!p) throw new Error("tap target missing at tap time: " + JSON.stringify(spec));
        const rect = await getRect();
        const k = rect.width / 390;
        const X = rect.left + p.x * k, Y = rect.top + p.y * k;
        const hit = await frame.evaluate((q) => { const e = document.elementFromPoint(q.x, q.y); return e ? e.tagName + "." + String(e.className).slice(0, 40) + " '" + (e.textContent || "").trim().slice(0, 24) + "'" : null; }, p);
        console.log(`tap t=${tTap}s ${JSON.stringify(spec)} -> page (${X.toFixed(0)},${Y.toFixed(0)}) hit ${hit}`);
        const topHit = await page.evaluate((x, y) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "#" + e.id : null; }, X, Y);
        console.log("   top-level hit:", topHit);
        await page.mouse.move(X, Y);
        if (chooser) {
          const [fc] = await Promise.all([page.waitForFileChooser({ timeout: 8000 }), page.mouse.click(X, Y)]);
          await fc.accept([chooser]);
        } else {
          await page.mouse.click(X, Y);
        }
        console.log("   after click:", JSON.stringify(await frame.evaluate(() => ({ lc: window.__lc || null, path: location.pathname, hist: history.length }))));
        if (wait) await waitFor(wait, waitLabel || "after tap", { step: waitStep });
      });
      on(tTap + 0.35, async () => { await page.mouse.move(1, 1); });
    }
    function scrollTo(t0, t1, resolverSrc) {
      const tw = { t0, t1, from: 0, to: 0 };
      tweens.push(tw);
      // resolve the target a little early so the swipe gesture can be registered before it starts
      on(t0 - 0.5, async () => {
        tw.from = await frame.evaluate(() => window.scrollY);
        tw.to = await frame.evaluate(`(${resolverSrc})()`);
        console.log(`scroll ${tw.t0}-${tw.t1}s: ${Math.round(tw.from)} -> ${Math.round(tw.to)}`);
        const dy = tw.to - tw.from;
        const y0 = Math.min(690, 110 + Math.abs(dy));
        await page.evaluate((tc) => window.__addTouch(tc), { t0: t0 - 0.45, tm: t0, t1, tr: t1 + 0.04, x: 195, y: y0, x2: 195, y2: dy >= 0 ? Math.max(120, y0 - Math.abs(dy)) : Math.min(700, y0 + Math.abs(dy)), drag: true });
      });
    }
    // screenshots occasionally stall in headless Chrome; retry instead of failing a long render
    async function shoot(opts) {
      for (let attempt = 1; ; attempt++) {
        try { return await page.screenshot(opts); }
        catch (e) {
          if (attempt >= 4) throw e;
          console.log("  screenshot retry", attempt, String(e.message).slice(0, 60));
          if (attempt === 1) {
            const to = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r("TIMEOUT"), ms))]);
            const probe = {};
            probe.pageEval = await to(page.evaluate(() => 1).then(() => "ok"), 3000);
            probe.frameEval = await to(frame.evaluate(() => location.pathname), 3000);
            const cdp = await page.createCDPSession();
            probe.surfaceFalse = await to(cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 60, fromSurface: false }).then((r) => "ok " + r.data.length), 8000);
            probe.visibility = await to(page.evaluate(() => document.visibilityState), 3000);
            console.log("  probe", JSON.stringify(probe));
          }
          await page.bringToFront(); await sleep(400);
        }
      }
    }
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    // ---- the story
    scrollTo(TL.scrollLanding[0], TL.scrollLanding[1], "() => document.querySelector('.skinwise-hero-art').getBoundingClientRect().top + window.scrollY - 120");
    tap(TL.startTap, { sel: "header a[href='/scan']" }, { wait: () => location.pathname === "/scan" && !!document.querySelector("label.drop"), waitLabel: "/scan page", waitStep: 1000 / FPS });
    tap(TL.drop1, { sel: "label.drop" }, { chooser: PHOTOS[0], wait: () => document.querySelectorAll(".slots li").length >= 1, waitLabel: "photo 1" });
    tap(TL.drop2, { sel: "label.drop" }, { chooser: PHOTOS[1], wait: () => document.querySelectorAll(".slots li").length >= 2, waitLabel: "photo 2" });
    scrollTo(TL.scrollDetails[0], TL.scrollDetails[1], "() => document.querySelector('[aria-labelledby=h-details]').getBoundingClientRect().top + window.scrollY - 76");
    tap(TL.arm, { chip: "Arm" });
    tap(TL.itch, { chip: "Itchiness" });
    tap(TL.scaly, { chip: "Scaly Skin" });
    tap(TL.analyze, { sel: ".actionbar .btn" }, { wait: () => !!document.querySelector(".loading"), waitLabel: "loading view" });
    scrollTo(TL.scrollA[0], TL.scrollA[1], "() => document.querySelector('.next').getBoundingClientRect().top + window.scrollY - 128");
    scrollTo(TL.scrollB[0], TL.scrollB[1], "() => window.scrollY + 330");
    events.sort((a, b) => a.t - b.t);

    // ---- pre-roll so the very first frame (thumbnail) already shows the finished landing hero
    const PRE = Math.round(1.6 * FPS);
    // the page animates in from the start, so we render the warm-up with the real t=0 state hidden by captions only
    // (captions are driven by composer time and start visible at t=0)
    const dt = 1000 / FPS;
    const kids = () => page.frames().filter((f) => f !== page.mainFrame() && f !== frame && f.url().startsWith(ORIGIN));
    const stepKids = (d) => Promise.all(kids().map((k) => k.evaluate((x) => (window.__vtStep ? window.__vtStep(x) : null), d).catch(() => {})));
    // the landing page embeds live preview phones; wait until they are interactive, then drive their clocks too
    for (let i = 0; i < 200; i++) {
      const ready = await Promise.all(kids().map((k) => k.evaluate(() => document.documentElement.dataset.hydrated === "1" && !!window.__vt).catch(() => false)));
      if (ready.every(Boolean)) break;
      await sleep(100);
    }
    for (let i = 0; i < PRE; i++) { await Promise.all([frame.evaluate((d) => window.__vtStep(d), dt), stepKids(dt)]); }

    const N = Math.round(TL.total * FPS);
    const t0wall = Date.now();
    const shots = new Set(STILLS.map((s) => Math.round(s * FPS)));
    for (let i = 0; i < N; i++) {
      const t = i / FPS;
      for (const ev of events) if (!ev.done && ev.t <= t + 1e-6) { ev.done = true; await ev.fn(t); }
      let y = null;
      for (const tw of tweens) if (t >= tw.t0 && t <= tw.t1) y = tw.from + (tw.to - tw.from) * ease((t - tw.t0) / (tw.t1 - tw.t0));
      const [info] = await Promise.all([
        frame.evaluate(async (d, yy) => { if (yy != null) window.scrollTo(0, yy); await window.__vtStep(d); return window.__vtInfo(); }, dt, y),
        stepKids(dt),
      ]);
      await page.evaluate((tt, inf) => window.__render(tt, inf), t, info);

      if (i % FPS === 0) console.log(`  frame ${i} t=${t.toFixed(2)}s path=${info.path} scrollY=${Math.round(info.scrollY)} wall=${((Date.now() - t0wall) / 1000).toFixed(1)}s`);
      if (shots.has(i)) {
        await shoot({ path: join(OUT_DIR, `still-${(i / FPS).toFixed(2)}s.png`), type: "png" });
        console.log("still", (i / FPS).toFixed(2) + "s", "path:", info.path);
      }
      if (enc && i === Math.round(POSTER_AT * FPS)) await shoot({ path: join(OUT_DIR, "skinwise-ui-demo-poster.png"), type: "png" });
      if (enc) {
        const b64 = await shoot({ type: "jpeg", quality: 95, encoding: "base64" });
        await enc.evaluate((b) => window.__encFrame(b), b64);
        if (i % (FPS * 2) === 0) {
          const el = (Date.now() - t0wall) / 1000;
          console.log(`frame ${i}/${N}  t=${t.toFixed(1)}s  ${(i / Math.max(el, 0.001)).toFixed(1)} fps  eta ${(((N - i) / (i / Math.max(el, 0.001) || 1))).toFixed(0)}s  path ${info.path}`);
        }
      }
      if (STILLS.length && i > Math.max(...STILLS.map((s) => s * FPS)) + 1) break;
    }

    if (enc) {
      const r = await enc.evaluate(() => window.__encDone());
      console.log("encoded", r);
      const size = 4 * 1024 * 1024; const parts = [];
      for (let i = 0; i * size < r.bytes; i++) parts.push(Buffer.from(await enc.evaluate((a, b) => window.__encChunk(a, b), i, size), "base64"));
      writeFileSync(OUT_FILE, Buffer.concat(parts));
      console.log("wrote", OUT_FILE, (r.bytes / 1048576).toFixed(1) + " MB", `${(N / FPS).toFixed(1)}s @ ${FPS}fps`);
    }
  } finally {
    await browser.close();
    proxy.close();
  }
}

main().then(() => { stopServer(); setTimeout(() => process.exit(0), 300); }).catch((e) => { console.error(e); stopServer(); setTimeout(() => process.exit(1), 300); });
