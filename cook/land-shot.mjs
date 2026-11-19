// node cook/land-shot.mjs <outDir> [w h] : full landing page screenshot. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out, W = '390', H = '844'] = process.argv; mkdirSync(out, { recursive: true });
const b = await launch({ width: +W, height: +H, dpr: 1 });
try {
  const l = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/' });
  await l.catch(() => {}); await b.sleep(2500);
  // scroll through so whileInView sections reveal
  const total = +(await b.evaluate('document.documentElement.scrollHeight'));
  for (let y = 0; y < total; y += 400) { await b.evaluate(`window.scrollTo(0,${y})`); await b.sleep(150); }
  await b.evaluate('window.scrollTo(0,0)'); await b.sleep(400);
  const dim = JSON.parse(await b.evaluate('JSON.stringify({h:document.documentElement.scrollHeight,w:innerWidth,ov:document.documentElement.scrollWidth>innerWidth})'));
  console.log(JSON.stringify(dim));
  for (let i = 0, y = 0; y < dim.h; i++, y += 1700) {
    const r = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y, width: dim.w, height: Math.min(1700, dim.h - y), scale: 1 } });
    writeFileSync(`${out}/land-${W}-${i}.png`, Buffer.from(r.data, 'base64'));
  }
} finally { await b.close(); }
