// node cook/scan-overlay.mjs : what Next's dev badge says before and after a failed scan (an issue count means console.error fired).
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { resolve } from 'node:path';
const photo = resolve('marketing/assets/sample-1.jpg');
const b = await launch({ width: 1366, height: 650, dpr: 1 });
const q = (js) => b.evaluate(js);
const overlay = () => q(`(() => {
  const r = document.querySelector('nextjs-portal')?.shadowRoot;
  if (!r) return 'no portal';
  const text = [...r.children].filter((n) => n.tagName !== 'STYLE' && n.tagName !== 'LINK').map((n) => n.textContent || '').join(' ').replace(/\\s+/g, ' ').trim();
  const dialog = !!r.querySelector('[data-nextjs-dialog], [data-nextjs-dialog-overlay], [role="dialog"]');
  return JSON.stringify({ text: text.slice(0, 160), errorDialogOpen: dialog });
})()`);
try {
  const l = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' }); await l.catch(() => {});
  await b.sleep(3000);
  console.log('before:', await overlay());
  const { root } = await b.send('DOM.getDocument');
  const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#cap-file' });
  await b.send('DOM.setFileInputFiles', { nodeId, files: [photo] }); await b.sleep(1200);
  await q(`[...document.querySelectorAll('.cap-chip')].find(b=>b.textContent.trim()==='Hand').click()`); await b.sleep(300);
  await q(`document.querySelector('.cap-go').click()`);
  await b.sleep(6000);
  console.log('after :', await overlay());
  const r = await b.send('Page.captureScreenshot', { format: 'png' });
  (await import('node:fs')).writeFileSync('cook/stills/r08/err-after.png', Buffer.from(r.data, 'base64'));
} finally { await b.close(); }
