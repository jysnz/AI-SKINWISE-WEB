// node cook/scan-e2e.mjs <outDir> : full scan flow against cook/mock-server.mjs (dev server started with SKINWISE_API_URL=http://localhost:8123).
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const [, , out] = process.argv;
mkdirSync(out, { recursive: true });
const photo = resolve('marketing/assets/sample-1.jpg');
const b = await launch({ width: 1366, height: 650, dpr: 1 });
const q = (js) => b.evaluate(js);
const shot = async (name) => { const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64')); };
const fit = async (label) => console.log(label, 'scrollHeight', await q('document.documentElement.scrollHeight'), 'innerHeight', await q('innerHeight'));
const clickText = (sel, text) => q(`[...document.querySelectorAll('${sel}')].find(b=>b.textContent.trim()==='${text}').click()`);
async function run(area, symptoms, note, name) {
  const l = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' }); await l.catch(() => {});
  await b.sleep(2200);
  if (name === 'a') { await shot('1-empty-details'); await fit('empty'); }
  const { root } = await b.send('DOM.getDocument');
  const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#cap-file' });
  await b.send('DOM.setFileInputFiles', { nodeId, files: [photo] }); await b.sleep(1500);
  if (name === 'a') { // submit without an area first: must nudge and toast, not send
    await q(`document.querySelector('.cap-go').click()`); await b.sleep(400);
    console.log('no-area toast:', await q(`document.querySelector('[data-sonner-toast]')?.textContent ?? 'none'`), '| ready class:', await q(`document.querySelector('.cap-go').classList.contains('ready')`));
  }
  await clickText('.cap-chip', area);
  for (const s of symptoms) await clickText('.cap-chip', s);
  if (note) { await q(`(()=>{const t=document.querySelector('#cap-desc');const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(t,${JSON.stringify(note)});t.dispatchEvent(new Event('input',{bubbles:true}));})()`); }
  await b.sleep(500);
  if (name === 'a') { await shot('2-filled'); await fit('filled'); console.log('ready:', await q(`document.querySelector('.cap-go').classList.contains('ready')`), '| note:', await q(`document.querySelector('#hint').textContent`)); }
  await q(`document.querySelector('.cap-go').click()`); await b.sleep(1200);
  if (name === 'a') { await shot('3-analyzing'); await fit('analyzing'); console.log('stage pill:', await q(`document.querySelector('.cap-pill span')?.textContent`)); }
  await b.sleep(3500);
  await shot(`4-result-${name}`); await fit('result ' + name);
  console.log('result title:', await q(`document.querySelector('.res-title')?.textContent`), '| stats:', await q(`[...document.querySelectorAll('.res-stats li')].map(l=>l.textContent).join(' / ')`), '| badge:', await q(`document.querySelector('.badge')?.textContent`));
}
try {
  await run('Hand', ['Itchiness', 'Redness'], 'Two weeks, slowly spreading', 'a');
  await run('Face', ['Swelling'], '', 'b');
  await run('Foot', [], '', 'c');
} finally { await b.close(); }
