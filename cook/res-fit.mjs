// node cook/res-fit.mjs [outDir] : checks the /scan result screen fits one screen at laptop sizes. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.argv[2];
if (out) mkdirSync(out, { recursive: true });
const sizes = [[1920, 950], [1536, 730], [1440, 780], [1366, 650], [1280, 620], [1280, 720], [1024, 600]];
for (const [w, h] of sizes) {
  const b = await launch({ width: w, height: h, dpr: 1 });
  try {
    for (const demo of ['none', 'result', 'low']) {
      const l = b.once('Page.loadEventFired');
      await b.send('Page.navigate', { url: `http://localhost:3000/scan?nointro&demo=${demo}` });
      await l.catch(() => {});
      await b.sleep(2800);
      const m = JSON.parse(await b.evaluate('JSON.stringify({sh:document.documentElement.scrollHeight,ih:innerHeight,stage:Math.round(document.querySelector(".res .cap-stage")?.getBoundingClientRect().height||0),btn:Math.round(document.querySelector(".res-again")?.getBoundingClientRect().bottom||0)})'));
      console.log(`${w}x${h} ${demo.padEnd(6)} ${m.sh <= m.ih ? 'FITS   ' : 'SCROLLS'} ${JSON.stringify(m)}`);
      if (out) { const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${w}x${h}-${demo}.png`, Buffer.from(r.data, 'base64')); }
    }
  } finally { await b.close(); }
}
