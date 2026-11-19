// node cook/scan-crop.mjs <outDir> : adds a tall portrait and a wide photo with edge markers to check nothing is cropped.
import { launch } from 'file:///C:/Projects/AI-SKINWISE/cook/tools/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out] = process.argv;
mkdirSync(out, { recursive: true });
const b = await launch({ width: 1440, height: 900, dpr: 1 });
const add = (w, h, label) => b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=${w};c.height=${h};const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,${w},${h});g.addColorStop(0,'#c98f70');g.addColorStop(1,'#8d5a44');x.fillStyle=g;x.fillRect(0,0,${w},${h});
  x.strokeStyle='#fff';x.lineWidth=14;x.strokeRect(7,7,${w}-14,${h}-14);x.fillStyle='#fff';x.font='bold 64px sans-serif';x.fillText('${label} TOP',30,100);x.fillText('${label} BOTTOM',30,${h}-40);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));const dt=new DataTransfer();dt.items.add(new File([blob],'t.jpg',{type:'image/jpeg'}));
  const i=document.querySelector('#cap-file');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const shot = async (name) => { const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('saved', name); };
try {
  const loaded = b.once('Page.loadEventFired');
  await b.send('Page.navigate', { url: 'http://localhost:3000/scan?nointro' });
  await loaded.catch(() => {});
  await b.sleep(2500);
  await add(700, 1000, 'PORTRAIT'); await b.sleep(2000); await shot('portrait');
  await add(1400, 600, 'WIDE'); await b.sleep(2000); await shot('wide');
} finally { await b.close(); }
