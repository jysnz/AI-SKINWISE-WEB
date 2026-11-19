// node cook/scan-interact.mjs : exercises add, switch, remove and empty-submit on /scan. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { resolve } from 'node:path';
const photos = ['marketing/assets/sample-1.jpg', 'marketing/assets/sample-2.jpg'].map((p) => resolve(p));
const b = await launch({ width: 1440, height: 900, dpr: 1 });
const q = (js) => b.evaluate(js);
const state = () => q(`JSON.stringify({thumbs: document.querySelectorAll('.cap-thumb').length, on: [...document.querySelectorAll('.cap-thumb')].findIndex(t=>t.classList.contains('on')), shownAlt: document.querySelector('.cap-frame img')?.alt ?? null, count: document.querySelector('.cap-count')?.textContent ?? null, add: !!document.querySelector('.cap-add'), ready: document.querySelector('.cap-go').classList.contains('ready')})`);
try {
  const loaded = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' });
  await loaded.catch(() => {});
  await b.sleep(2500);
  console.log('empty        ', await state());
  await q(`document.querySelector('.cap-go').click()`); await b.sleep(300);
  console.log('empty submit ', await q(`document.querySelector('.cap-stage').className`), '| toast:', await q(`document.querySelector('[data-sonner-toast]')?.textContent ?? 'none'`));
  const { root } = await b.send('DOM.getDocument');
  const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#cap-file' });
  await b.send('DOM.setFileInputFiles', { nodeId, files: photos }); await b.sleep(900);
  console.log('two added    ', await state());
  await q(`document.querySelectorAll('.cap-thumb')[0].click()`); await b.sleep(300);
  console.log('select first ', await state());
  await q(`document.querySelectorAll('.cap-x')[0].click()`); await b.sleep(500);
  console.log('remove first ', await state());
  await q(`document.querySelectorAll('.cap-x')[0].click()`); await b.sleep(500);
  console.log('remove last  ', await state());
} finally { await b.close(); }
