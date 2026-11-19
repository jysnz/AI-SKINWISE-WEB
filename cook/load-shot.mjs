// node cook/load-shot.mjs <outDir> : the scanning screen (doctor animation) at phone and laptop size. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out] = process.argv; mkdirSync(out, { recursive: true });
for (const [w, h, tag] of [[390, 844, 'phone'], [1366, 700, 'laptop']]) {
  const b = await launch({ width: w, height: h, dpr: 1 });
  try {
    const l = b.once('Page.loadEventFired');
    await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro&demo=loading' });
    await l.catch(() => {}); await b.sleep(2500);
    const r = await b.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}/${tag}-loading.png`, Buffer.from(r.data, 'base64'));
  } finally { await b.close(); }
}
