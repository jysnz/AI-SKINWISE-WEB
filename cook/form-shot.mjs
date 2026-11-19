// node cook/form-shot.mjs <outDir> : scan form at phone size, scrolled to the bottom. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out] = process.argv; mkdirSync(out, { recursive: true });
const b = await launch({ width: 390, height: 844, dpr: 1 });
try {
  const l = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' });
  await l.catch(() => {}); await b.sleep(2500);
  await b.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)'); await b.sleep(600);
  const r = await b.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/form-bottom.png`, Buffer.from(r.data, 'base64'));
  await b.evaluate('window.scrollTo(0,0)'); await b.sleep(300);
  const r2 = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: +(await b.evaluate('document.documentElement.scrollHeight')), scale: 1 } });
  writeFileSync(`${out}/form-full.png`, Buffer.from(r2.data, 'base64'));
} finally { await b.close(); }
