// node cook/res-shots.mjs <outDir> : result screen in its states at laptop and phone sizes. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out] = process.argv;
mkdirSync(out, { recursive: true });
for (const [w, h, tag] of [[1366, 650, 'laptop'], [390, 844, 'phone']]) {
  const b = await launch({ width: w, height: h, dpr: 1 });
  try {
    for (const demo of ['none', 'result', 'low']) {
      const l = b.once('Page.loadEventFired');
      await b.send('Page.navigate', { url: `http://localhost:3000/scan?nointro&demo=${demo}` });
      await l.catch(() => {});
      await b.sleep(3200);
      const dim = JSON.parse(await b.evaluate('JSON.stringify({h:Math.max(document.documentElement.scrollHeight,innerHeight),w:innerWidth,ov:document.documentElement.scrollWidth>innerWidth})'));
      const r = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: dim.w, height: dim.h, scale: 1 } });
      writeFileSync(`${out}/${tag}-${demo}.png`, Buffer.from(r.data, 'base64'));
      console.log(tag, demo, JSON.stringify(dim));
    }
  } finally { await b.close(); }
}
