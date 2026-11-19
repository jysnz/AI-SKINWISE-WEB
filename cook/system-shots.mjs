// node cook/system-shots.mjs <outDir> : screenshots the landing "The system" section at desktop, laptop and phone widths.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out] = process.argv;
mkdirSync(out, { recursive: true });
for (const [w, h, tag] of [[1440, 900, 'desktop'], [1024, 768, 'tablet'], [390, 844, 'phone']]) {
  const b = await launch({ width: w, height: h, dpr: 1 });
  try {
    const l = b.once('Page.loadEventFired');
    await b.send('Page.navigate', { url: 'http://localhost:3000/?nointro' });
    await l.catch(() => {});
    await b.sleep(2000);
    // scroll through so whileInView reveals fire
    const H = await b.evaluate('document.documentElement.scrollHeight');
    for (let y = 0; y < H; y += 400) { await b.evaluate('scrollTo(0,' + y + ')'); await b.sleep(90); }
    await b.sleep(900);
    const r = JSON.parse(await b.evaluate('(()=>{const s=document.querySelector("#system").getBoundingClientRect();return JSON.stringify({top:Math.round(s.top+scrollY),h:Math.round(s.height),ov:document.documentElement.scrollWidth>innerWidth})})()'));
    const rr = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: r.top, width: w, height: r.h, scale: 1 } });
    writeFileSync(`${out}/${tag}.png`, Buffer.from(rr.data, 'base64'));
    console.log(tag, JSON.stringify(r));
  } finally { await b.close(); }
}
