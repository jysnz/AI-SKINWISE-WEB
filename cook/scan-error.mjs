// node cook/scan-error.mjs : submits a scan to whatever server the dev server targets and reports console.error vs console.warn and the toast.
// With the real V2 server suspended this exercises the handled-failure path. Needs the dev server on :3000.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { resolve } from 'node:path';
const photo = resolve('marketing/assets/sample-1.jpg');
const b = await launch({ width: 1366, height: 650, dpr: 1 });
const q = (js) => b.evaluate(js);
try {
  const l = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' }); await l.catch(() => {});
  await b.sleep(2500);
  await q(`window.__e=[];window.__w=[];const oe=console.error,ow=console.warn;console.error=(...a)=>{window.__e.push(a.join(' '));};console.warn=(...a)=>{window.__w.push(a.join(' '));ow.apply(console,a)};`);
  const { root } = await b.send('DOM.getDocument');
  const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#cap-file' });
  await b.send('DOM.setFileInputFiles', { nodeId, files: [photo] }); await b.sleep(1200);
  await q(`[...document.querySelectorAll('.cap-chip')].find(b=>b.textContent.trim()==='Hand').click()`); await b.sleep(300);
  await q(`document.querySelector('.cap-go').click()`);
  await b.sleep(6000);
  console.log('console.error calls :', await q('JSON.stringify(window.__e)'));
  console.log('console.warn calls  :', await q('JSON.stringify(window.__w)'));
  console.log('toast               :', await q(`document.querySelector('[data-sonner-toast]')?.textContent ?? 'none'`));
  console.log('back on the form    :', await q(`!!document.querySelector('#form')`), '| photo kept:', await q(`document.querySelectorAll('.cap-thumb').length`), '| area kept:', await q(`document.querySelector('.cap-chip[aria-checked=true]')?.textContent`));
  console.log('next dev overlay    :', await q(`!!document.querySelector('nextjs-portal')?.shadowRoot?.querySelector('[data-nextjs-dialog], [data-nextjs-toast]')`));
} finally { await b.close(); }
