// node cook/shot.mjs <url> <out.png> [width] [height] [waitMs] [fullpage 1|0]
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync } from 'node:fs';
const [, , url, out, w = '1440', h = '900', wait = '2500', full = '1'] = process.argv;
const b = await launch({ width: +w, height: +h, dpr: 1 });
try {
  const loaded = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url });
  await loaded.catch(() => {});
  await b.sleep(+wait);
  if (process.env.SCROLL) { const H = await b.evaluate('document.documentElement.scrollHeight'); for (let y = 0; y < H; y += 300) { await b.evaluate('scrollTo(0,' + y + ')'); await b.sleep(120); } await b.sleep(900); await b.evaluate('scrollTo(0,0)'); await b.sleep(700); }
  const dim = await b.evaluate('({h:Math.max(document.documentElement.scrollHeight,innerHeight),w:innerWidth,ov:document.documentElement.scrollWidth>innerWidth})');
  const r = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full === '1', clip: { x: 0, y: 0, width: dim.w, height: full === '1' ? dim.h : +h, scale: 1 } });
  writeFileSync(out, Buffer.from(r.data, 'base64'));
  console.log('saved', out, JSON.stringify(dim));
} finally { await b.close(); }
