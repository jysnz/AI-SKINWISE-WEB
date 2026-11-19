import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
const b = await launch({ width: 390, height: 844, dpr: 1 });
try {
  const l = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' });
  await l.catch(() => {}); await b.sleep(2500);
  console.log(await b.evaluate(`JSON.stringify((()=>{const li=document.querySelector('.scan-progress li');const c=getComputedStyle(li);const o=getComputedStyle(li.parentElement);const sp=getComputedStyle(li.querySelector('span'));return {li:[c.display,c.flexDirection,c.height,c.padding,c.alignItems],ol:[o.display,o.borderTop,o.paddingTop,o.height],span:[sp.display,sp.width,sp.height]}})())`));
} finally { await b.close(); }
