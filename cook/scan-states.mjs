// node cook/scan-states.mjs <outDir> [width] [height]
// Captures /scan in its states: empty, one photo, three photos, over (drag), loading. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const [, , out, w = '1440', h = '900'] = process.argv;
mkdirSync(out, { recursive: true });
const photos = ['marketing/assets/sample-1.jpg', 'marketing/assets/sample-2.jpg', 'marketing/assets/sample-1.jpg'].map((p) => resolve(p));
const b = await launch({ width: +w, height: +h, dpr: 1 });
const shot = async (name, full = true) => {
  const dim = await b.evaluate('({h:Math.max(document.documentElement.scrollHeight,innerHeight),w:innerWidth,ov:document.documentElement.scrollWidth>innerWidth})');
  const r = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, clip: { x: 0, y: 0, width: dim.w, height: full ? dim.h : +h, scale: 1 } });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('saved', name, JSON.stringify(dim));
};
const setFiles = async (files) => {
  const { root } = await b.send('DOM.getDocument');
  const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#cap-file' });
  await b.send('DOM.setFileInputFiles', { nodeId, files });
  // React listens for the change event; setFileInputFiles fires it.
};
try {
  const loaded = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' });
  await loaded.catch(() => {});
  await b.sleep(2500);
  await shot('1-empty');
  await setFiles([photos[0]]);
  await b.sleep(2200);
  await shot('2-one');
  await setFiles([photos[1]]);
  await b.sleep(400);
  await shot('3-two-mid-sweep');
  await setFiles([photos[2]]);
  await b.sleep(2200);
  await shot('4-three');
  const loaded2 = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro&demo=loading' });
  await loaded2.catch(() => {});
  await b.sleep(4500);
  await shot('5-loading');
  const errs = await b.evaluate('document.documentElement.scrollWidth>innerWidth');
  console.log('horizontal overflow:', errs);
} finally { await b.close(); }
