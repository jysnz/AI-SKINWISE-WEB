// Checks the rendered MP4: reads the container headers (codec, size, fps, frame count, keyframes, bitrate)
// and decodes it in Chrome to save a contact sheet of sampled frames.
//   node marketing/verify.mjs [file.mp4] [--frames 5.2,12,17.6]   (full-size PNGs of those moments)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import http from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const fi = args.indexOf("--frames");
const FRAMES = fi >= 0 ? args[fi + 1].split(",").map(Number) : [];
const file = resolve(args.find((a, i) => !a.startsWith("--") && (fi < 0 || (i !== fi + 1))) || join(here, "out", "skinwise-ui-demo.mp4"));
const buf = readFileSync(file);

// ---- minimal ISO-BMFF reader
function boxes(start, end) {
  const out = [];
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p); const type = buf.toString("latin1", p + 4, p + 8); let hdr = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; } else if (size === 0) size = end - p;
    out.push({ type, start: p + hdr, end: p + size, size });
    p += size;
  }
  return out;
}
const find = (list, t) => list.find((b) => b.type === t);
const kids = (b) => boxes(b.start, b.end);
const moov = find(boxes(0, buf.length), "moov");
const trak = kids(moov).filter((b) => b.type === "trak").find((t) => find(kids(find(kids(t), "mdia")), "hdlr") && buf.toString("latin1", find(kids(find(kids(t), "mdia")), "hdlr").start + 8, find(kids(find(kids(t), "mdia")), "hdlr").start + 12) === "vide");
const mdia = find(kids(trak), "mdia");
const mdhd = find(kids(mdia), "mdhd");
const ver = buf[mdhd.start];
const timescale = buf.readUInt32BE(mdhd.start + (ver === 1 ? 20 : 12));
const duration = ver === 1 ? Number(buf.readBigUInt64BE(mdhd.start + 24)) : buf.readUInt32BE(mdhd.start + 16);
const stbl = find(kids(find(kids(mdia), "minf")), "stbl");
const stts = find(kids(stbl), "stts");
const entries = buf.readUInt32BE(stts.start + 4);
let frames = 0; const deltas = new Set();
for (let i = 0; i < entries; i++) { const c = buf.readUInt32BE(stts.start + 8 + i * 8), d = buf.readUInt32BE(stts.start + 12 + i * 8); frames += c; deltas.add(d); }
const stss = find(kids(stbl), "stss");
const keyframes = stss ? buf.readUInt32BE(stss.start + 4) : frames;
const stsd = find(kids(stbl), "stsd");
const avc1 = boxes(stsd.start + 8, stsd.end)[0];
const width = buf.readUInt16BE(avc1.start + 24), height = buf.readUInt16BE(avc1.start + 26);
const avcC = boxes(avc1.start + 78, avc1.end).find((b) => b.type === "avcC");
const profile = { 66: "Baseline", 77: "Main", 100: "High" }[buf[avcC.start + 1]] || buf[avcC.start + 1];
const level = (buf[avcC.start + 3] / 10).toFixed(1);
const secs = duration / timescale;
const hasAudio = kids(moov).filter((b) => b.type === "trak").length > 1;
console.log(JSON.stringify({
  file, sizeMB: +(buf.length / 1048576).toFixed(2), codec: "H.264 " + profile + " L" + level, width, height,
  durationSec: +secs.toFixed(3), frames, fps: +(frames / secs).toFixed(3), constantFrameDuration: deltas.size === 1,
  keyframes, avgMbps: +((buf.length * 8) / secs / 1e6).toFixed(2), audioTrack: hasAudio, faststart: buf.indexOf("moov") < buf.indexOf("mdat"),
}, null, 2));

// ---- decode in Chrome and sample frames
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/video")) {
    // range support is required for seeking
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] ? Number(m[1]) : 0, end = m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
      res.writeHead(206, { "content-type": "video/mp4", "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${buf.length}`, "content-length": end - start + 1 });
      return res.end(buf.subarray(start, end + 1));
    }
    res.writeHead(200, { "content-type": "video/mp4", "accept-ranges": "bytes", "content-length": buf.length }); return res.end(buf);
  }
  res.writeHead(200, { "content-type": "text/html" }); res.end("<body></body>");
}).listen(3399);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, defaultViewport: { width: 1200, height: 1000 } });
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3399/");
  const times = [0, 2, 4.5, 7, 9.5, 12.5, 15, 17.6, 19, 22, 24.8, secs - 0.2].filter((t) => t < secs);
  const info = await page.evaluate(async (times) => {
    const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = "/video.mp4";
    v.style.cssText = "position:fixed;left:0;top:0;width:90px;opacity:.01"; document.body.appendChild(v);
    await new Promise((r, j) => { v.onloadeddata = r; v.onerror = () => j(new Error("video failed to decode")); });
    const cw = 240, ch = Math.round(240 * v.videoHeight / v.videoWidth);
    const cv = document.createElement("canvas"); cv.width = cw * 6; cv.height = (ch + 18) * Math.ceil(times.length / 6);
    const x = cv.getContext("2d"); x.fillStyle = "#111"; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = "#ddd"; x.font = "13px sans-serif";
    for (let i = 0; i < times.length; i++) {
      // seek, then play just long enough for the browser to present a frame at the new position
      await new Promise((r) => { v.onseeked = r; v.currentTime = times[i]; });
      await new Promise((r) => { v.requestVideoFrameCallback(() => r()); v.play().catch(() => {}); });
      v.pause();
      const cx = (i % 6) * cw, cy = Math.floor(i / 6) * (ch + 18);
      x.drawImage(v, cx, cy, cw, ch); x.fillText(times[i].toFixed(1) + "s (decoded " + v.currentTime.toFixed(2) + ")", cx + 6, cy + ch + 13);
    }
    return { vw: v.videoWidth, vh: v.videoHeight, dur: v.duration, sheet: cv.toDataURL("image/jpeg", 0.85).split(",")[1] };
  }, times);
  mkdirSync(join(here, "out"), { recursive: true });
  writeFileSync(join(here, "out", "verify-sheet.jpg"), Buffer.from(info.sheet, "base64"));
  for (const ft of FRAMES) {
    const png = await page.evaluate(async (t) => {
      const v = document.querySelector("video");
      await new Promise((r) => { v.onseeked = r; v.currentTime = t; });
      await new Promise((r) => { v.requestVideoFrameCallback(() => r()); v.play().catch(() => {}); });
      v.pause();
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    }, ft);
    writeFileSync(join(here, "out", `frame-${ft}s.png`), Buffer.from(png, "base64"));
    console.log("frame", ft + "s -> marketing/out/frame-" + ft + "s.png");
  }
  console.log("decoded in Chrome:", info.vw + "x" + info.vh, info.dur.toFixed(2) + "s -> marketing/out/verify-sheet.jpg");
} finally { await browser.close(); server.close(); }
