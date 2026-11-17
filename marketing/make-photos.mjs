// Generates the placeholder "skin close-up" photos used in the demo video.
// They are drawn in code (no stock photos, no real people). To use your own licensed
// photos instead, drop sample-1.jpg and sample-2.jpg into marketing/assets/ and skip this script.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "assets");
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage();
await page.setContent("<canvas id=c width=1000 height=1000></canvas>");

const jpegs = await page.evaluate(() => {
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  function draw(seed, o) {
    const c = document.getElementById("c"); const x = c.getContext("2d"); const r = rng(seed);
    const W = c.width, H = c.height;
    // base tone with soft directional light
    let g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, o.light); g.addColorStop(0.55, o.mid); g.addColorStop(1, o.dark);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // large, soft blotches of colour variation
    x.filter = "blur(60px)";
    for (let i = 0; i < 14; i++) {
      x.fillStyle = `rgba(${150 + r() * 50},${70 + r() * 40},${55 + r() * 30},${0.10 + r() * 0.12})`;
      x.beginPath(); x.ellipse(r() * W, r() * H, 120 + r() * 220, 90 + r() * 180, r() * 3, 0, 7); x.fill();
    }
    x.filter = "blur(18px)";
    for (let i = 0; i < 26; i++) {
      x.fillStyle = `rgba(${230 + r() * 20},${170 + r() * 40},${140 + r() * 40},${0.05 + r() * 0.08})`;
      x.beginPath(); x.ellipse(r() * W, r() * H, 40 + r() * 90, 30 + r() * 70, r() * 3, 0, 7); x.fill();
    }
    x.filter = "none";
    // skin texture: pores and fine creases
    for (let i = 0; i < 5200; i++) {
      const px = r() * W, py = r() * H, s = 0.8 + r() * 2.4;
      x.fillStyle = `rgba(${60 + r() * 40},${28 + r() * 20},${20 + r() * 16},${0.05 + r() * 0.12})`;
      x.beginPath(); x.arc(px, py, s, 0, 7); x.fill();
    }
    x.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      x.strokeStyle = `rgba(95,45,32,${0.05 + r() * 0.07})`;
      const px = r() * W, py = r() * H, a = r() * 6.28, len = 40 + r() * 120;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * len * 0.5, py + Math.sin(a + 1) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    // the ring-shaped patch
    const cx = W * o.cx, cy = H * o.cy, R = W * o.R;
    const ringPath = (rad, wob) => { x.beginPath(); for (let a = 0; a <= 6.2832 + 0.05; a += 0.05) { const k = rad * (1 + wob * Math.sin(a * 3 + seed) * 0.5 + wob * Math.sin(a * 5 + seed * 2) * 0.35); const X = cx + Math.cos(a) * k, Y = cy + Math.sin(a) * k * 0.94; a === 0 ? x.moveTo(X, Y) : x.lineTo(X, Y); } x.closePath(); };
    // soft redness spreading outside the edge
    x.filter = "blur(26px)"; ringPath(R * 1.12, 0.05); x.fillStyle = "rgba(190,70,60,.22)"; x.fill();
    // raised edge: shadow then highlight
    x.filter = "blur(7px)"; x.lineWidth = R * 0.2; ringPath(R, 0.05); x.strokeStyle = "rgba(70,20,16,.35)"; x.save(); x.translate(5, 7); x.stroke(); x.restore();
    x.filter = "blur(3px)"; x.lineWidth = R * 0.17; ringPath(R, 0.05); x.strokeStyle = "rgba(196,72,62,.82)"; x.stroke();
    x.filter = "blur(2px)"; x.lineWidth = R * 0.07; ringPath(R * 1.015, 0.05); x.strokeStyle = "rgba(240,160,140,.42)"; x.save(); x.translate(-3, -4); x.stroke(); x.restore();
    x.filter = "none";
    // scaly flakes along the ring
    for (let i = 0; i < 520; i++) {
      const a = r() * 6.2832, k = R * (0.9 + r() * 0.22) * (1 + 0.05 * Math.sin(a * 3 + seed) * 0.5);
      x.fillStyle = `rgba(250,222,205,${0.10 + r() * 0.2})`;
      x.beginPath(); x.ellipse(cx + Math.cos(a) * k, cy + Math.sin(a) * k * 0.94, 1.5 + r() * 4, 1 + r() * 2.6, r() * 3, 0, 7); x.fill();
    }
    // slightly clearer centre
    x.filter = "blur(30px)"; ringPath(R * 0.72, 0.04); x.fillStyle = "rgba(225,160,130,.20)"; x.fill(); x.filter = "none";
    // vignette
    const v = x.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(30,12,8,.45)");
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    // fine grain
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.05})`; x.fillRect(r() * W, r() * H, 1.4, 1.4); }
    return c.toDataURL("image/jpeg", 0.92).split(",")[1];
  }

  return [
    draw(7, { light: "#e0ae92", mid: "#c98b6c", dark: "#a8694d", cx: 0.5, cy: 0.5, R: 0.2 }),
    draw(19, { light: "#dba88b", mid: "#c3845f", dark: "#9c5f45", cx: 0.46, cy: 0.54, R: 0.15 }),
  ];
});

jpegs.forEach((b64, i) => writeFileSync(join(outDir, `sample-${i + 1}.jpg`), Buffer.from(b64, "base64")));
await browser.close();
console.log("wrote", jpegs.length, "photos to", outDir);
