// node cook/dd-other.mjs <outDir> : picks "Other" in both dropdowns and types custom answers. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out] = process.argv; mkdirSync(out, { recursive: true });
const b = await launch({ width: 390, height: 844, dpr: 1 });
const shot = async (n) => { const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${n}.png`, Buffer.from(r.data, 'base64')); };
const click = (sel, i = 0) => b.evaluate(`document.querySelectorAll(${JSON.stringify(sel)})[${i}].click()`);
try {
  const l = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' });
  await l.catch(() => {}); await b.sleep(2500);
  await b.evaluate("document.querySelector('.dd-trigger').scrollIntoView({block:'center'})"); await b.sleep(300);
  await click('.dd-trigger', 0); await b.sleep(400);
  const n = +(await b.evaluate("document.querySelectorAll('.dd-item').length")); await click('.dd-item', n - 1); await b.sleep(500);
  console.log('focused:', await b.evaluate("document.activeElement.className"));
  await b.send('Input.insertText', { text: 'Elbow' }); await b.sleep(300);
  await click('.dd-trigger', 1); await b.sleep(400);
  await click('.dd-item', 0); await b.sleep(200);
  const m = +(await b.evaluate("document.querySelectorAll('.dd-item').length")); await click('.dd-item', m - 1); await b.sleep(400);
  await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await b.sleep(500);
  await b.evaluate("document.querySelectorAll('.dd-other')[1].focus()"); await b.send('Input.insertText', { text: 'Burning feeling' }); await b.sleep(400);
  await shot('other');
} finally { await b.close(); }
