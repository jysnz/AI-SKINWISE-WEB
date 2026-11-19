// node cook/scan-fit.mjs [outDir] : checks that /scan (empty, photo added, analyzing) fits one screen at laptop sizes.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const out = process.argv[2];
if (out) mkdirSync(out, { recursive: true });
const photo = resolve('marketing/assets/sample-1.jpg');
const sizes = [[1920, 950], [1536, 730], [1440, 780], [1366, 650], [1280, 620], [1280, 720], [1024, 600]];
for (const [w, h] of sizes) {
  const b = await launch({ width: w, height: h, dpr: 1 });
  const m = () => b.evaluate('JSON.stringify({sh:document.documentElement.scrollHeight,ih:innerHeight,btn:Math.round(document.querySelector(".cap-go,.cap-cancel")?.getBoundingClientRect().bottom||0),stage:Math.round(document.querySelector(".cap-stage")?.getBoundingClientRect().height||0)})');
  const snap = async (name) => { if (!out) return; const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${w}x${h}-${name}.png`, Buffer.from(r.data, 'base64')); };
  try {
    let l = b.once('Page.loadEventFired');
    await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' }); await l.catch(() => {}); await b.sleep(2200);
    const a = await m(); await snap('empty');
    const { root } = await b.send('DOM.getDocument');
    const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#cap-file' });
    await b.send('DOM.setFileInputFiles', { nodeId, files: [photo] }); await b.sleep(1800);
    const c = await m(); await snap('photo');
    l = b.once('Page.loadEventFired');
    await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro&demo=loading' }); await l.catch(() => {}); await b.sleep(2500);
    const d = await m(); await snap('loading');
    const fit = (s) => { const o = JSON.parse(s); return (o.sh <= o.ih ? 'FITS ' : 'SCROLLS ') + s; };
    console.log(`${w}x${h}\n  empty   ${fit(a)}\n  photo   ${fit(c)}\n  loading ${fit(d)}`);
  } finally { await b.close(); }
}
