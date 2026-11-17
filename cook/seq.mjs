// node cook/seq.mjs <url> <outPrefix> <w> <h> t1,t2,... (ms from navigation start)
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync } from 'node:fs';
const [, , url, prefix, w, h, ts] = process.argv;
const b = await launch({ width: +w, height: +h, dpr: 1 });
try {
  const t0 = Date.now();
  b.send('Page.navigate', { url });
  for (const t of ts.split(',').map(Number)) {
    const wait = t - (Date.now() - t0); if (wait > 0) await b.sleep(wait);
    const r = await b.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${prefix}-${t}.png`, Buffer.from(r.data, 'base64'));
    console.log('shot', t, 'actual', Date.now() - t0);
  }
} finally { await b.close(); }
